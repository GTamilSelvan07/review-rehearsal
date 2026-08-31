import { GoogleGenAI } from "@google/genai";

export const MODEL = "gemini-3.7-flash";

let _ai: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Upload a PDF once to the Gemini Files API and return its file URI. */
export async function uploadPdfToGemini(buf: Buffer): Promise<string> {
  const blob = new Blob([new Uint8Array(buf)], { type: "application/pdf" });
  const uploaded = await ai().files.upload({
    file: blob,
    config: { mimeType: "application/pdf" },
  });
  let file = uploaded;
  const start = Date.now();
  while (String(file.state) === "PROCESSING" && Date.now() - start < 120_000) {
    await sleep(2000);
    file = await ai().files.get({ name: file.name! });
  }
  if (String(file.state) !== "ACTIVE") {
    throw new Error(`Gemini file processing failed (state: ${file.state})`);
  }
  return file.uri!;
}

export type PaperPart =
  | { text: string }
  | { fileData: { fileUri: string; mimeType: string } };

export function paperParts(state: {
  kind: "pdf" | "latex";
  geminiFileUri?: string | null;
  latexText?: string;
  bibText?: string;
}): PaperPart[] {
  if (state.kind === "pdf" && state.geminiFileUri) {
    return [{ fileData: { fileUri: state.geminiFileUri, mimeType: "application/pdf" } }];
  }
  return [
    {
      text: `=== PAPER (LaTeX source) ===\n${state.latexText ?? ""}\n\n=== BIBLIOGRAPHY (BibTeX) ===\n${state.bibText ?? ""}`,
    },
  ];
}

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : t;
}

interface GenOpts {
  system?: string;
  parts: PaperPart[];
  thinking?: "low" | "medium" | "high";
  maxOutputTokens?: number;
  /** Plain JSON Schema enforced via responseJsonSchema (falls back gracefully). */
  jsonSchema?: object;
  /** "high" turns on media_resolution_high for dense PDF/figure parsing. */
  media?: "high";
}

/**
 * Call Gemini expecting a JSON reply. Retries transient errors with backoff,
 * drops thinkingConfig if the API rejects it, and makes one repair attempt on
 * malformed JSON.
 */
export async function genJSON<T>(opts: GenOpts): Promise<T> {
  const raw = await genText(opts);
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    const repaired = await genText({
      system: "You repair malformed JSON. Return ONLY the corrected JSON, no commentary, no code fences.",
      parts: [{ text: `Fix this so it parses as JSON, preserving all content:\n\n${raw.slice(0, 60_000)}` }],
      thinking: "high",
    });
    return JSON.parse(stripFences(repaired)) as T;
  }
}

export async function genText(opts: GenOpts): Promise<string> {
  let useThinking = true;
  let useSchema = true;
  let useMedia = true;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        responseMimeType: "application/json",
        maxOutputTokens: opts.maxOutputTokens ?? 32_768,
      };
      if (opts.system) config.systemInstruction = opts.system;
      // Every call reasons at the highest level unless a caller lowers it explicitly.
      if (useThinking) {
        config.thinkingConfig = { thinkingLevel: opts.thinking ?? "high" };
      }
      if (useSchema && opts.jsonSchema) {
        config.responseJsonSchema = opts.jsonSchema;
      }
      if (useMedia && opts.media === "high") {
        config.mediaResolution = "MEDIA_RESOLUTION_HIGH";
      }
      const res = await ai().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: opts.parts }],
        config,
      });
      const text = res.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Graceful degradation for API/SDK feature mismatches: drop the feature, keep the call.
      if (/thinking/i.test(msg) && useThinking) {
        useThinking = false;
        continue;
      }
      if (/(json_?schema|response_?json|schema)/i.test(msg) && useSchema && opts.jsonSchema) {
        useSchema = false; // fall back to prompt-described JSON
        continue;
      }
      if (/media_?resolution/i.test(msg) && useMedia && opts.media) {
        useMedia = false;
        continue;
      }
      if (/(429|RESOURCE_EXHAUSTED|500|503|UNAVAILABLE|fetch failed|ECONNRESET)/i.test(msg)) {
        await sleep(2000 * Math.pow(3, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Minimal concurrency limiter. */
export function pLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}

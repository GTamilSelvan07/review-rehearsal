// Deterministic desk-reject scans — the parts of the CHI 2027 desk-reject support
// tool that need no model: masked references, build defects, prompt-injection
// text, and reference integrity (from the database audit). Results are surfaced
// to the model as evidence to confirm or clear, except prompt injection, where a
// deterministic hit always wins — the model is exactly what an injection targets.

import type { RefAudit, RefEntry } from "./types";

const MASK_RE =
  /\b(anonymous|anonymised|anonymized|anonymised for review|removed for (?:blind |double-blind |peer )?review|omitted for (?:blind |anonymous )?review|blinded for review|redacted for review|withheld for review|details omitted|hidden for review)\b/i;

/** Bibliography entries that appear to be masked for review. */
export function scanMaskedReferences(refs: RefEntry[]): string[] {
  const hits: string[] = [];
  for (const r of refs) {
    const haystack = [r.raw, r.title, r.authors.join(" "), r.venue].join(" | ");
    if (MASK_RE.test(haystack)) {
      hits.push(`[${r.key}] ${(r.raw || r.title).slice(0, 160)}`);
    }
  }
  return hits;
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (?:all |any |the )?(?:previous|prior|above|preceding|earlier) (?:instructions|prompts|guidance)/i,
  /disregard (?:all |any |the )?(?:previous|prior|above|preceding) (?:instructions|prompts)/i,
  /\b(?:as|if you are) an? (?:ai|llm|language model|automated|large language model)\b.{0,80}\b(?:review|reviewer|assess|evaluat)/i,
  /\b(?:ai|llm|language model|automated) reviewers?\b.{0,120}\b(?:should|must|please)\b/i,
  /\b(?:recommend|give|assign|rate|output|return|produce)\b.{0,60}\b(?:accept(?:ance)?|positive review|high(?:est)? (?:score|rating)|strong accept|minor revisions)\b/i,
  /\bthis paper (?:is|should be|must be|deserves) (?:accepted|excellent|outstanding|a clear accept)\b/i,
  /\bdo not (?:mention|report|flag|criticize|criticise) (?:any )?(?:weakness|limitation|issue|problem)s?\b/i,
  /\b(?:system|assistant) ?(?:prompt|message)\s*[:：]/i,
  /\bIMPORTANT (?:NOTE )?(?:TO|FOR) (?:AI|LLM|REVIEWERS? USING AI)\b/i,
];

const HIDDEN_LATEX_PATTERNS: RegExp[] = [
  /\\(?:text)?color\s*\{\s*white\s*\}/i,
  /\\(?:text)?color\s*\[(?:rgb|RGB|gray)\]\s*\{\s*(?:1\s*,\s*1\s*,\s*1|255\s*,\s*255\s*,\s*255|1(?:\.0+)?)\s*\}/i,
  /\\fontsize\s*\{\s*(?:0(?:\.\d+)?|1(?:\.\d+)?)\s*(?:pt)?\s*\}/i,
  /\\scalebox\s*\{\s*0(?:\.0+)?\s*\}/i,
  /\\transparent\s*\{\s*0(?:\.0+)?\s*\}/i,
  /\\pdfliteral\b.{0,40}\b3\s+Tr\b/i,
];

function excerpt(text: string, index: number, width = 140): string {
  const start = Math.max(0, index - width / 2);
  const end = Math.min(text.length, index + width / 2);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** Text addressed to AI readers, or (LaTeX) macros that hide text from human readers. */
export function scanHiddenText(fullText: string, latexText?: string): string[] {
  const hits: string[] = [];
  const seen = new Set<string>();
  const sources: [string, string][] = [
    ["text", fullText],
    ["source", latexText ?? ""],
  ];
  for (const [label, text] of sources) {
    if (!text) continue;
    // One excerpt per region: several patterns usually fire on the same sentence.
    const positions: number[] = [];
    for (const re of INJECTION_PATTERNS) {
      const m = re.exec(text);
      if (m && m.index !== undefined && !positions.some((p) => Math.abs(p - m.index) < 160)) {
        positions.push(m.index);
      }
    }
    for (const pos of positions.sort((a, b) => a - b)) {
      const ex = excerpt(text, pos, 200);
      if (!seen.has(ex)) {
        seen.add(ex);
        hits.push(`AI-directed instruction in ${label}: “${ex}”`);
      }
    }
  }
  if (latexText) {
    for (const re of HIDDEN_LATEX_PATTERNS) {
      const m = re.exec(latexText);
      if (m && m.index !== undefined) {
        hits.push(`Invisible-text macro in source: “${excerpt(latexText, m.index, 120)}”`);
      }
    }
  }
  return hits;
}

const BUILD_DEFECT_PATTERNS: [RegExp, string][] = [
  [/\b(?:Figure|Fig\.|Table|Section|Sec\.|Equation|Eq\.|Chapter|Appendix)\s*\?\?/g, "unresolved cross-reference"],
  [/\[\?\]/g, "unresolved citation"],
  [/\(\?\?\)/g, "unresolved reference"],
  [/\b(?:TODO|FIXME|XXX|TBD|CITATION NEEDED)\b/g, "draft marker"],
  [/\\(?:todo|cite|ref|label|textbf|emph|section)\{/g, "raw LaTeX macro in rendered text"],
  [/\bLorem ipsum\b/gi, "placeholder text"],
];

/** Compilation defects and draft markers visible in the rendered text. */
export function scanBuildDefects(fullText: string, latexText?: string): string[] {
  const hits: string[] = [];
  if (fullText) {
    for (const [re, label] of BUILD_DEFECT_PATTERNS) {
      re.lastIndex = 0;
      let count = 0;
      let first: string | null = null;
      let m: RegExpExecArray | null;
      while ((m = re.exec(fullText)) && count < 500) {
        count++;
        if (!first) first = excerpt(fullText, m.index, 100);
      }
      if (count) hits.push(`${count}× ${label} — e.g. “${first}”`);
    }
  }
  if (latexText) {
    const todos = latexText.match(/\\todo\s*[\[{]/g)?.length ?? 0;
    if (todos) hits.push(`${todos}× \\todo{} note in source (renders in the PDF unless disabled)`);
    const missing = latexText.match(/\\includegraphics(?:\[[^\]]*\])?\{\s*\}/g)?.length ?? 0;
    if (missing) hits.push(`${missing}× \\includegraphics with an empty path`);
  }
  return hits;
}

export interface RefIntegrity {
  status: "pass" | "flag" | "unverified";
  evidence: string;
  reasoning: string;
  hits: string[];
}

/** RV-6: reference integrity from the database audit only. */
export function referenceIntegrity(audit: RefAudit | undefined): RefIntegrity {
  if (!audit || audit.summary.total === 0) {
    return {
      status: "unverified",
      evidence: "No bibliography entries were available to check.",
      reasoning: "The reference audit found no parseable references, so integrity could not be assessed.",
      hits: [],
    };
  }
  const s = audit.summary;
  const notFound = audit.verdicts.filter((v) => v.status === "not_found");
  const hits = notFound.map((v) => `[${v.key}] ${v.title}${v.notes ? ` — ${v.notes}` : ""}`);
  if (s.skipped === s.total) {
    return {
      status: "unverified",
      evidence: `All ${s.total} lookups were skipped (database unavailable).`,
      reasoning: "The scholarly databases could not be reached, so no entry was verified or refuted.",
      hits: [],
    };
  }
  if (notFound.length === 0) {
    return {
      status: "pass",
      evidence: `${s.verified} of ${s.total} entries resolved in a scholarly database; ${s.mismatch} resolved with metadata differences; ${s.skipped} skipped.`,
      reasoning: "Every entry that could be looked up resolves to a real record. Metadata mismatches are listed in the reference audit with corrected BibTeX.",
      hits: [],
    };
  }
  return {
    status: "flag",
    evidence: `${notFound.length} of ${s.total} entries could not be found in Crossref, OpenAlex, Semantic Scholar, or DBLP: ${hits.slice(0, 6).join("; ")}${hits.length > 6 ? `; … (${hits.length - 6} more)` : ""}`,
    reasoning:
      "Unresolvable references are what the real tool's resolver surfaces as a reference-integrity concern. Some may be legitimate (workshop papers, theses, preprints without a DOI, books) — the AC is expected to check each one; a fabricated reference is grounds for desk rejection.",
    hits,
  };
}

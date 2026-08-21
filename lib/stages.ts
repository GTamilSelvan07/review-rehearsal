import type {
  RunState,
  PaperInfo,
  DeskRejectResult,
  AdrReport,
  Persona,
  Review,
  MetaReview,
  Guide,
  GuideAction,
  MajorIssue,
} from "./types";
import {
  ACM_CRITERIA,
  ADR_FLAGS,
  DESK_REJECT_CHECKS,
  RECOMMENDATION_SCALE,
  BASE_RATES,
  REVIEW_ANATOMY,
  decideTrack,
} from "./chi2027";
import { genJSON, paperParts, uploadPdfToGemini, pLimit } from "./gemini";
import { parseBibtex, detex, makeBibtex } from "./bibtex";
import { verifyReferences, searchReadingList } from "./refcheck";
import { quoteAppearsIn } from "./similarity";
import { unzipSync } from "fflate";

const SIM_NOTE =
  "You are part of an unofficial CHI 2027 review simulation that helps authors strengthen a draft before submission. Be as faithful to the real process as possible.";

/** The text used for verbatim-quote verification. */
function matchText(state: RunState): string {
  if (state.kind === "latex") return detex(state.latexText ?? "");
  return state.paper?.fullText ?? "";
}

// ---------------------------------------------------------------- S0: ingest

export async function runIngest(state: RunState): Promise<Partial<RunState>> {
  const texts: { name: string; text: string }[] = [];
  let pdfBuf: Buffer | null = null;

  for (const f of state.files) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Could not fetch uploaded file ${f.name}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".pdf")) {
      pdfBuf = buf;
    } else if (lower.endsWith(".zip")) {
      const unzipped = unzipSync(new Uint8Array(buf));
      for (const [name, data] of Object.entries(unzipped)) {
        const nl = name.toLowerCase();
        if (nl.endsWith(".tex") || nl.endsWith(".bib")) {
          texts.push({ name, text: new TextDecoder().decode(data) });
        } else if (nl.endsWith(".pdf") && !pdfBuf) {
          pdfBuf = Buffer.from(data);
        }
      }
    } else if (lower.endsWith(".tex") || lower.endsWith(".bib")) {
      texts.push({ name: f.name, text: buf.toString("utf8") });
    }
  }

  const texFiles = texts.filter((t) => t.name.toLowerCase().endsWith(".tex"));
  const bibFiles = texts.filter((t) => t.name.toLowerCase().endsWith(".bib"));

  const update: Partial<RunState> = {};
  if (texFiles.length) {
    update.kind = "latex";
    update.latexText = texFiles.map((t) => `% ---- ${t.name} ----\n${t.text}`).join("\n\n");
    update.bibText = bibFiles.map((t) => t.text).join("\n\n");
  } else if (pdfBuf) {
    update.kind = "pdf";
    update.geminiFileUri = await uploadPdfToGemini(pdfBuf);
  } else {
    throw new Error("No usable paper found — upload a PDF, or .tex (+ .bib) files, or a .zip containing them.");
  }

  const working: RunState = { ...state, ...update };
  const wantFullText = working.kind === "pdf";

  const paper = await genJSON<PaperInfo>({
    system: SIM_NOTE,
    thinking: "low",
    maxOutputTokens: 60_000,
    parts: [
      ...paperParts(working),
      {
        text: `Read the paper and return JSON exactly matching this TypeScript shape (no extra keys):
{
  "title": string,
  "abstract": string,
  "subcommunity": string,          // best-fitting CHI subcommunity${state.subcommunityHint && !state.subcommunityHint.startsWith("Auto") ? ` (the author suggests: ${JSON.stringify(state.subcommunityHint)} — override only if clearly wrong)` : ""}
  "pages": number,
  "words": number,                  // estimate
  "sections": [{ "title": string, "page": number | null }],
  "claims": [{ "claim": string, "evidence": string, "section": string }],   // every substantive contribution claim and what supports it
  "methods": string[],              // e.g. "within-subjects field study, N=24", "thematic analysis"
  "statedLimitations": string[],    // limitations the AUTHORS THEMSELVES state, verbatim-ish
  "references": [{ "key": string, "raw": string, "title": string, "authors": string[], "year": number | null, "venue": string, "doi": string | null }],${wantFullText ? "" : " // leave references as [] — the bibliography is parsed separately"}
  "fullText": string                // ${wantFullText ? "the complete plain text of the paper body (no references section), preserving sentence wording exactly" : "leave as empty string"}
}`,
      },
    ],
  });

  if (working.kind === "latex") {
    paper.references = parseBibtex(working.bibText ?? "");
    paper.fullText = "";
  }
  return { ...update, paper };
}

// ---------------------------------------------------------- S1: desk reject

export async function runDeskReject(state: RunState): Promise<Partial<RunState>> {
  const result = await genJSON<DeskRejectResult>({
    system: SIM_NOTE,
    thinking: "medium",
    parts: [
      ...paperParts(state),
      {
        text: `Run the CHI 2027 desk-reject checklist on this paper. For each check, quote the strongest concrete evidence for your verdict (or state what you looked for and did not find). Checks:
${DESK_REJECT_CHECKS.map((c) => `- ${c.name} [${c.severity}]: ${c.prompt}`).join("\n")}

Return JSON: { "checks": [{ "name": string, "passed": boolean, "severity": "hard" | "soft", "evidence": string }], "passed": boolean }
"passed" is false only if a HARD check fails. Be strict about anonymization: any author name, acknowledgment, or de-anonymizing link is a hard failure.`,
      },
    ],
  });
  result.passed = !result.checks.some((c) => c.severity === "hard" && !c.passed);
  return { deskReject: result };
}

// ------------------------------------------------------- S2: reference audit

export async function runRefAudit(state: RunState): Promise<Partial<RunState>> {
  const refs = state.paper?.references ?? [];
  const refAudit = await verifyReferences(refs);
  return { refAudit };
}

// ------------------------------------------------------------------ S3: ADR

export async function runAdr(state: RunState): Promise<Partial<RunState>> {
  const unverified = state.refAudit?.verdicts.filter((v) => v.status === "not_found") ?? [];
  const adr = await genJSON<AdrReport>({
    system: SIM_NOTE,
    thinking: "high",
    parts: [
      ...paperParts(state),
      {
        text: `You are the CHI 2027 Assisted Desk Reject (ADR) tool, followed by the AC who decides.
The rubric is method-agnostic and focuses on the alignment between claims and the evidence, argument, or design work supporting them.

Score each ACM criterion 1-5 with a one-sentence note and a VERBATIM evidence quote from the paper:
${ACM_CRITERIA.map((c) => `- ${c.name}: ${c.prompt}`).join("\n")}

Assess each ADR flag as "pass", "borderline", or "flag", with rationale and a verbatim evidence quote:
${ADR_FLAGS.map((f) => `- ${f}`).join("\n")}

Reference audit context (from real database lookups, not a model): ${unverified.length} of ${state.refAudit?.summary.total ?? 0} references could not be found in Crossref/OpenAlex/Semantic Scholar/DBLP${unverified.length ? ` (${unverified.map((v) => v.title).slice(0, 5).join("; ")})` : ""}. Unverifiable references are legitimate ADR evidence.

${BASE_RATES}

Decision: "advance" if the paper has a realistic path to acceptance after revision (50-60% of real submissions advance); "adr" otherwise. Any "flag" (not "borderline") on an ADR criterion should normally mean "adr".
Write "acNote": a constructive 3-5 sentence note to the authors in the voice of the AC, naming the single biggest obstacle between this paper and acceptance.

Return JSON: { "criteria": [{ "name", "score", "note", "evidence" }], "flags": [{ "name", "status", "rationale", "evidence" }], "decision": "advance" | "adr", "acNote": string }`,
      },
    ],
  });
  return { adr };
}

// ---------------------------------------------------------------- S4: panel

const ARCHETYPES = [
  { id: "R1", archetype: "Domain expert", expertise: 4, note: "knows this exact subfield's literature deeply; interrogates novelty and missing citations" },
  { id: "R2", archetype: "Methods expert", expertise: 4, note: "statistician or qualitative-methods specialist matched to the paper's methods; interrogates rigor, analysis, claims-vs-data" },
  { id: "R3", archetype: "Adjacent-field senior", expertise: 2, note: "broad HCI perspective, honest expertise 2-3; interrogates framing, importance, clarity for the wider CHI audience; writes the shortest review" },
  { id: "R4", archetype: "Practitioner lens", expertise: 3, note: "applications and deployment perspective; interrogates real-world relevance, ethics of deployment, whether contribution justifies length" },
];

export async function runPanel(state: RunState): Promise<Partial<RunState>> {
  const p = state.paper!;
  const personas = await genJSON<{ personas: Persona[] }>({
    system: SIM_NOTE,
    thinking: "medium",
    parts: [
      {
        text: `A CHI 2027 AC is selecting four external reviewers for this paper:
Title: ${p.title}
Abstract: ${p.abstract}
Subcommunity: ${p.subcommunity}
Methods: ${p.methods.join("; ")}

Create four INVENTED reviewer personas (no real researchers' names or identifiable affiliations — describe them by research profile only), one per slot:
${ARCHETYPES.map((a) => `- ${a.id} · ${a.archetype} (expertise ${a.expertise}/4): ${a.note}`).join("\n")}

For each, make the profile SPECIFIC to this paper's topics and methods. Give each a distinct reviewing style (e.g. numbered lists vs flowing prose; terse vs thorough) and one realistic bias or hobbyhorse.

Return JSON: { "personas": [{ "id": "R1".."R4", "archetype": string, "background": string, "expertise": number, "focus": string[], "style": string, "biases": string }] }`,
      },
    ],
  });
  return { personas: personas.personas };
}

// -------------------------------------------------------------- S5: reviews

export async function runReviews(state: RunState): Promise<Partial<RunState>> {
  const limit = pLimit(4);
  const text = matchText(state);
  const reviews = await Promise.all(
    (state.personas ?? []).map((persona) => limit(() => reviewLoop(state, persona, text)))
  );
  return { reviews };
}

async function reviewLoop(state: RunState, persona: Persona, matchableText: string): Promise<Review> {
  const p = state.paper!;
  const personaBrief = `You are reviewer ${persona.id} for CHI 2027 — ${persona.archetype}.
Background: ${persona.background}
Your honest expertise self-rating for THIS paper: ${persona.expertise}/4.
You go deep on: ${persona.focus.join("; ")}. You only skim other aspects — do NOT attempt exhaustive coverage; real reviewers don't.
Your writing style: ${persona.style}
Your known bias (let it subtly shape emphasis, not fairness): ${persona.biases}`;

  const formSpec = `Return JSON:
{
  "personaId": "${persona.id}",
  "archetype": "${persona.archetype}",
  "expertise": ${persona.expertise},
  "summary": string,                 // the paper in YOUR OWN words, 2-4 sentences
  "contribution": string,            // what it contributes to HCI and how significant
  "criteria": [{ "name": one of ${JSON.stringify(ACM_CRITERIA.map((c) => c.name))}, "score": 1-5, "assessment": string }],  // all five
  "majorIssues": [{ "title": string, "argument": string, "quote": string, "anchor": string }],  // quote must be VERBATIM from the paper; anchor like "§4.1, p.6"
  "minorIssues": string[],
  "questions": string[],             // for the authors to answer in revision
  "revisions": string[],             // concrete, itemized required changes
  "recommendation": "A" | "ARR" | "RR" | "RRX" | "X",   // ${RECOMMENDATION_SCALE.map((r) => `${r.code}=${r.label}`).join("; ")}
  "committeeComments": string        // candid, authors will not see this
}`;

  const draft = await genJSON<Review>({
    system: SIM_NOTE,
    thinking: "high",
    parts: [
      ...paperParts(state),
      {
        text: `${personaBrief}

${REVIEW_ANATOMY}

${BASE_RATES}

The authors' own stated limitations (do NOT present these as your discoveries): ${JSON.stringify(p.statedLimitations)}

${formSpec}`,
      },
    ],
  });

  // Code-level verification: does each quoted anchor actually appear in the paper?
  const checked: MajorIssue[] = (draft.majorIssues ?? []).map((issue) => ({
    ...issue,
    quoteVerified: matchableText ? quoteAppearsIn(issue.quote ?? "", matchableText) : undefined,
  }));
  const failedQuotes = checked.filter((i) => i.quoteVerified === false).map((i) => i.title);

  const final = await genJSON<Review>({
    system: SIM_NOTE,
    thinking: "high",
    parts: [
      ...paperParts(state),
      {
        text: `${personaBrief}

Below is YOUR draft review. Fact-check it against the paper, then return the corrected final review (same JSON shape).

Fact-check rules — re-read the paper for each one:
1. For every major issue claiming the paper LACKS something ("no effect sizes", "missing X"), verify the paper truly lacks it. If the paper actually has it, DELETE the issue or rewrite it honestly (e.g. "under-emphasized").
2. These issues cited quotes that do NOT appear verbatim in the paper: ${JSON.stringify(failedQuotes)}. Replace each with a real verbatim quote, or delete the issue if you cannot support it.
3. Delete any criticism generic enough to fit any paper, and any criticism that merely restates the authors' own limitations: ${JSON.stringify(p.statedLimitations)}.
4. Check score-text consistency: the recommendation must match the surviving criticisms' weight (${BASE_RATES.split("\n").slice(-1)[0]}). Adjust scores or recommendation if they diverge.
5. Keep your persona's voice and format. Do not add new issues.

DRAFT:
${JSON.stringify(draft)}

${formSpec}`,
      },
    ],
  });

  // Re-verify quotes on the final version for UI display.
  final.majorIssues = (final.majorIssues ?? []).map((issue) => ({
    ...issue,
    quoteVerified: matchableText ? quoteAppearsIn(issue.quote ?? "", matchableText) : undefined,
  }));
  final.personaId = persona.id;
  final.archetype = persona.archetype;
  final.expertise = persona.expertise;
  return final;
}

// ----------------------------------------------------------------- S6: meta

export async function runMeta(state: RunState): Promise<Partial<RunState>> {
  const reviews = state.reviews ?? [];
  const decision = decideTrack(reviews.map((r) => r.recommendation));
  const meta = await genJSON<MetaReview>({
    system: SIM_NOTE,
    thinking: "high",
    parts: [
      {
        text: `You are the 1AC for this CHI 2027 submission. The four external reviews are below (JSON).

Paper: ${state.paper?.title}
Abstract: ${state.paper?.abstract}

REVIEWS:
${JSON.stringify(reviews.map(({ committeeComments, ...r }) => ({ ...r, committeeComments })))}

The decision was computed from CHI 2027's threshold rules and is FIXED: "${decision}" (minor = 3+ reviews at A/ARR; major = majority positive; reject otherwise). Do not change it.

Return JSON:
{
  "discussion": [{ "speaker": "1AC" | "R1" | "R2" | "R3" | "R4", "text": string }],   // a brief simulated PCS exchange (4-8 turns) resolving the biggest disagreement between reviewers
  "metaReview": string,        // the 1AC meta-review: synthesize the reviews, reference reviewers by number ("R2 raises..."), state what must change; ~200-300 words
  "decision": "${decision}",
  "decisionRationale": string  // 1-2 sentences tying the decision to the recommendation spread
}`,
      },
    ],
  });
  meta.decision = decision;
  return { meta };
}

// ---------------------------------------------------------------- S7: guide

interface GuideDraft {
  actions: GuideAction[];
  searchQueries: string[];
}

export async function runGuide(state: RunState): Promise<Partial<RunState>> {
  const draft = await genJSON<GuideDraft>({
    system: SIM_NOTE,
    thinking: "high",
    parts: [
      {
        text: `Convert this CHI 2027 review packet into a constructive strengthening guide for the AUTHORS. Voice: a coach, not a judge — every action is imperative and concrete ("Add a power analysis justifying N=24", never "the evaluation is weak").

Paper: ${state.paper?.title}
ADR report: ${JSON.stringify(state.adr)}
Reviews: ${JSON.stringify((state.reviews ?? []).map(({ committeeComments: _c, ...r }) => r))}
Meta-review: ${JSON.stringify(state.meta)}
Reference audit summary: ${JSON.stringify(state.refAudit?.summary)}; problems: ${JSON.stringify(
          state.refAudit?.verdicts.filter((v) => v.status !== "verified").map((v) => ({ key: v.key, status: v.status, notes: v.notes }))
        )}

Merge and deduplicate everything into 8-16 actions. Group each as:
- "track": fixing it plausibly changes the decision track
- "criterion": strengthens one ACM criterion
- "polish": clarity/presentation
Each action: { "title", "detail" (why, citing which reviewer/report raised it), "group", "criterion" (the ACM criterion it moves, or "References"), "effort": "Quick fix" | "A day's work" | "New data needed", "anchor" (section/page like "§4.1 · p.6") }.

Also produce "searchQueries": 3-5 scholarly search queries for related work the reviewers found under-cited (topics, NOT specific paper titles — real papers will be fetched from databases, never invented).

Return JSON: { "actions": [...], "searchQueries": [...] }`,
      },
    ],
  });

  const candidates = await searchReadingList(draft.searchQueries ?? []);
  const guide: Guide = {
    actions: draft.actions ?? [],
    reading: candidates.map((c, i) => ({
      title: c.title,
      venue: c.venue ?? "",
      year: c.year,
      doi: c.doi,
      url: c.url,
      source: c.source,
      bibtex: makeBibtex({
        key: `suggested${i + 1}`,
        title: c.title,
        year: c.year,
        venue: c.venue,
        doi: c.doi,
        authors: c.authors.slice(0, 12),
      }),
    })),
  };
  return { guide };
}

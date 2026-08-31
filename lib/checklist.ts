// The CHI 2027 paper submission checklist (community working aid — the CFP and
// PCS overrule it), with every item that the rehearsal can verify from the
// uploaded paper wired to the run's results. Items it cannot see (PCS form
// fields, supplements, profiles) stay manual.

import type { RunState, DeskRejectCheck } from "./types";
import { KEYWORD_RULES } from "./keywords";
import { WORD_THRESHOLD } from "./chi2027";
import { scanAltText } from "./screen";
import { authorLooksAnonymous } from "./pdfmeta";

export type AutoStatus = "pass" | "flag" | "unverified";
export interface AutoResult {
  status: AutoStatus;
  note: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isNew?: boolean;
  detail?: string;
  /** Present when the rehearsal can verify the item from the run. */
  verify?: (state: RunState) => AutoResult;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST_DISCLAIMER =
  "A working aid, not an authoritative or exhaustive source. CHI adjusts its policies, templates, and deadlines every year — verify against the official Call for Papers, and if this sheet and the CHI website or PCS disagree, the websites overrule.";

export const CHECKLIST_LINKS = [
  { label: "CHI Call for Papers", url: "https://chi2027.acm.org/authors/papers/" },
  { label: "CHI Anonymization Policy", url: "https://chi2027.acm.org/chi-anonymization-policy/" },
  { label: "CHI Publication Formats & Templates", url: "https://chi2027.acm.org/chi-publication-formats/" },
  { label: "CHI Guide to a Successful Paper Submission", url: "https://chi2027.acm.org/guide-to-a-successful-submission/" },
  { label: "CHI Steering Committee Policies and Processes", url: "https://chi.acm.org/policies-processes/" },
  { label: "SIGCHI Submission-Review Process", url: "https://sigchi.org/about/policies/conference-policies/submission-and-review/" },
  { label: "SIGCHI Guide to an Accessible Submission", url: "https://sigchi.org/resources/guides-for-authors/accessibility/" },
  { label: "ACM Policy on Authorship / AI Use", url: "https://www.acm.org/publications/policies/new-acm-policy-on-authorship" },
  { label: "ACM Open Participating Institutions", url: "https://libraries.acm.org/acmopen/open-participants" },
  { label: "Precision Conference (PCS) Submission Portal", url: "https://new.precisionconference.com/" },
];

export const KEY_DATES = [
  { date: "17 Aug 2026", milestone: "Submission site (PCS) opens" },
  { date: "10 Sep 2026", milestone: "PAPER DEADLINE — PDF, form data, and all supplementary material. No abstract deadline." },
  { date: "5 Nov 2026", milestone: "Reviews released" },
  { date: "5 Nov – 3 Dec 2026", milestone: "Revise & Resubmit window (5 weeks)" },
  { date: "3 Dec 2026", milestone: "Resubmission deadline" },
  { date: "17 Dec 2026", milestone: "Final notification" },
  { date: "7 Jan 2027", milestone: "ACM eRights completion deadline" },
  { date: "14 Jan 2027", milestone: "TAPS upload deadline (final source)" },
  { date: "18 Feb 2027", milestone: "Publication-ready deadline (TAPS-approved version to PCS)" },
  { date: "4 Mar 2027", milestone: "Conference registration deadline + video presentation deadline" },
  { date: "10–14 May 2027", milestone: "Conference, Pittsburgh, PA, USA" },
];

export const WHATS_NEW = [
  {
    title: "No more subcommittees",
    text: "You no longer pick a topical subcommittee. You tag the reviewer expertise your paper needs (PCS keywords), and an algorithmic matching system brings reviewers and papers together.",
  },
  {
    title: "Review Responsibility Policy (RRP)",
    text: "At submission your team names four review-responsibility slots from the author list (one author may be named more than once). Those authors must update their PCS profiles and complete the reviews assigned to them; failing to deliver can desk-reject your own submissions.",
  },
  {
    title: "Restructured review model",
    text: "A single Primary AC manages each paper and writes the meta-review; Subcommunity Chairs (SCs) oversee groups of 10–15 ACs for quality and consistency instead of chairing author-chosen subcommittees; and every submission gets a rapid triage pass (desk-reject screen + Assisted Desk Reject) before external review.",
  },
  {
    title: "Minimum qualifications for peer review",
    text: "Formal criteria now govern who may serve as reviewer, AC, or SC. Choose your four review-slot names accordingly, and do not push the burden onto your most junior co-authors.",
  },
];

// ------------------------------------------------------------ helpers

function rv(state: RunState, id: string): DeskRejectCheck | undefined {
  return state.deskReject?.checks.find((c) => c.id === id);
}

function fromRv(state: RunState, id: string, passNote?: string): AutoResult {
  const c = rv(state, id);
  if (!c) return { status: "unverified", note: "The desk-reject screen did not run." };
  if (c.status === "flag") return { status: "flag", note: `${c.id} ${c.name} flagged — ${c.evidence.slice(0, 220)}` };
  if (c.status === "pass") return { status: "pass", note: passNote ?? `${c.id} ${c.name} cleared — ${c.reasoning.slice(0, 160)}` };
  return { status: "unverified", note: `${c.id} ${c.name} could not be verified — ${c.evidence.slice(0, 160)}` };
}

function combineRv(state: RunState, ids: string[]): AutoResult {
  const results = ids.map((id) => fromRv(state, id));
  const flagged = results.find((r) => r.status === "flag");
  if (flagged) return flagged;
  if (results.every((r) => r.status === "pass")) return { status: "pass", note: `${ids.join(", ")} all cleared.` };
  const un = results.find((r) => r.status === "unverified");
  return { status: "unverified", note: un?.note ?? "Not fully verified." };
}

function fromAdr(state: RunState, kind: "reviewability" | "flags", name: string, note: string): AutoResult {
  const list = kind === "reviewability" ? state.adr?.reviewability : state.adr?.flags;
  const item = list?.find((x) => x.name === name);
  if (!item) return { status: "unverified", note: "The run did not reach the ADR assessment." };
  if (item.status === "flag") return { status: "flag", note: `ADR flag — ${item.rationale.slice(0, 220)}` };
  if (item.status === "borderline") return { status: "unverified", note: `ADR borderline — ${item.rationale.slice(0, 220)}` };
  return { status: "pass", note: `${note} ${item.rationale.slice(0, 160)}` };
}

export function lengthCategory(words: number | undefined): AutoResult & { label: string } {
  if (!words) return { status: "unverified", label: "unknown", note: "Word count not available." };
  const w = words.toLocaleString();
  if (words > WORD_THRESHOLD)
    return { status: "flag", label: "over threshold", note: `≈${w} words — above CHI's ${WORD_THRESHOLD.toLocaleString()}-word threshold; desk-rejected unless the length is strongly justified.` };
  if (words > 8000)
    return { status: "pass", label: "long standard paper", note: `≈${w} words — under the threshold, but above the encouraged 5,000–8,000; make sure the length is proportionate to the contribution.` };
  if (words >= 5000)
    return { status: "pass", label: "standard paper", note: `≈${w} words — within the encouraged 5,000–8,000 range.` };
  return { status: "pass", label: "short paper", note: `≈${w} words — under 5,000 counts as a short paper; self-classify it as one in PCS.` };
}

function wordCount(s: string | undefined): number {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function altText(state: RunState): AutoResult {
  const scan = scanAltText(state.latexText);
  if (!scan) return { status: "unverified", note: "Alt text cannot be read from a PDF here — check each figure's \\Description (LaTeX) or alt text (Word) yourself." };
  if (scan.figures === 0) return { status: "unverified", note: "No figure environments found in the source." };
  if (scan.descriptions >= scan.figures)
    return { status: "pass", note: `${scan.descriptions} \\Description{} for ${scan.figures} figure environment${scan.figures > 1 ? "s" : ""}${scan.tables ? ` (${scan.tables} tables — consider describing those too)` : ""}.` };
  return { status: "flag", note: `${scan.figures} figure environment${scan.figures > 1 ? "s" : ""} but only ${scan.descriptions} \\Description{} — acmart requires one per figure.` };
}

function pdfMetadata(state: RunState): AutoResult {
  if (state.kind !== "pdf") return { status: "unverified", note: "LaTeX source uploaded — compile, then run pdfinfo on the PDF and search it for your surname, institution, and grant numbers." };
  const m = state.pdfMeta;
  if (!m || !m.readable) return { status: "unverified", note: "The PDF's metadata could not be read from the file (packed in a compressed object stream) — run pdfinfo yourself." };
  if (!authorLooksAnonymous(m.author)) return { status: "flag", note: `PDF Author field is "${m.author}" — the checklist's exact leak. Clear it in the exporter (LaTeX: \\hypersetup{pdfauthor={}}) and re-export.` };
  const title = m.title && !/^\s*$/.test(m.title) ? ` Title field: "${m.title.slice(0, 80)}".` : "";
  return { status: "pass", note: `Author field ${m.author ? `"${m.author}"` : "empty"}.${title}${m.producer ? ` Producer: ${m.producer.slice(0, 60)}.` : ""}` };
}

function keywordQuotas(state: RunState): AutoResult {
  const pcs = state.paper?.pcs;
  if (!pcs) return { status: "unverified", note: "No keywords suggested." };
  const problems: string[] = [];
  const check = (label: string, n: number, min: number, max: number) => {
    if (n < min || n > max) problems.push(`${label}: ${n} (needs ${min}–${max})`);
  };
  check("Domain", pcs.domain.length, KEYWORD_RULES.domain.min, KEYWORD_RULES.domain.max);
  check("Method", pcs.method.length, KEYWORD_RULES.method.min, KEYWORD_RULES.method.max);
  check("Users", pcs.users.length, KEYWORD_RULES.users.min, KEYWORD_RULES.users.max);
  check("Primary Contribution", pcs.contribution ? 1 : 0, 1, 1);
  if (problems.length) return { status: "flag", note: problems.join("; ") };
  return { status: "pass", note: `Domain ${pcs.domain.length} · Method ${pcs.method.length} · Users ${pcs.users.length} · Contribution 1 — suggested keywords are in the header; the checklist recommends at least 3 domain keywords.` };
}

function referencesSupplied(state: RunState): AutoResult {
  const s = state.refAudit?.summary;
  const n = state.paper?.references.length ?? 0;
  if (!n) return { status: "flag", note: "No reference list was parsed from the upload — the form needs the list for integrity checking." };
  if (!s) return { status: "unverified", note: `${n} references parsed; the audit did not run.` };
  return {
    status: s.notFound ? "flag" : "pass",
    note: `${n} references parsed; ${s.verified} verified, ${s.mismatch} metadata mismatches, ${s.notFound} not found in any database, ${s.skipped} skipped. ${s.notFound ? "Fix or justify every unresolved entry before submitting." : ""}`,
  };
}

// ------------------------------------------------------------ the checklist

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "A",
    title: "Desk-rejection risks",
    items: [
      {
        id: "A1",
        text: "Correct template: single-column ACM Primary Article Template.",
        detail: "LaTeX: \\documentclass[manuscript,review,anonymous]{acmart} with sigconf-authordraft.tex. Word: the 1-column acm_submission_template.docx.",
        verify: (s) => fromRv(s, "RV-4"),
      },
      {
        id: "A2",
        text: "Length is proportionate: 5,000–8,000 words encouraged; under 5,000 is a short paper; over 12,000 is desk-rejected without a strong justification.",
        detail: "A length out of proportion to the contribution is desk-rejectable regardless of word count.",
        verify: (s) => {
          const l = lengthCategory(s.paper?.words);
          const adr = s.adr?.flags.find((f) => f.name.startsWith("A disproportionately small"));
          const extra = adr ? ` ADR "contribution vs length": ${adr.status}.` : "";
          return { status: adr?.status === "flag" ? "flag" : l.status, note: l.note + extra };
        },
      },
      {
        id: "A3",
        text: "Self-categorisation at submission matches the manuscript (do not submit a 12,000-word paper as a short paper).",
        verify: (s) => {
          const l = lengthCategory(s.paper?.words);
          if (l.status === "unverified") return l;
          return {
            status: "pass",
            note: l.status === "flag" ? "Classify as: standard paper — and supply the length justification the form asks for." : `Classify as: ${l.label}.`,
          };
        },
      },
      {
        id: "A4",
        text: "The main PDF stands alone: everything needed to understand the contribution is in the paper; heavy reliance on appendices or supplements is grounds for rejection.",
        verify: (s) => fromAdr(s, "reviewability", "Self-contained", "Judged self-contained."),
      },
      { id: "A5", text: "Concurrent and closely related submissions are declared, with an anonymized copy uploaded to the concurrent-submissions field." },
      { id: "A6", text: "The work is original: not published elsewhere, not under review elsewhere." },
      { id: "A7", text: "No reference is marked “anonymous”.", verify: (s) => fromRv(s, "RV-3") },
      {
        id: "A8",
        text: "The paper is a conference paper, in English, in scope, and complete enough to review.",
        verify: (s) => combineRv(s, ["RV-5", "RV-7", "RV-11"]),
      },
    ],
  },
  {
    id: "B",
    title: "Anonymization",
    items: [
      {
        id: "B1",
        text: "Author names and affiliations removed from title and header. Changing the text colour is NOT sufficient.",
        verify: (s) => fromRv(s, "RV-1"),
      },
      {
        id: "B2",
        text: "Document metadata cleaned — specifically the “Author” field written by Word, LaTeX, or your PDF exporter.",
        detail: "Check the compiled PDF, not just the source: run pdfinfo and search the PDF for your surname, institution, and grant numbers.",
        verify: pdfMetadata,
      },
      {
        id: "B3",
        text: "Acknowledgements scrubbed, including grant numbers and named funders.",
        verify: (s) => fromRv(s, "RV-1", "RV-1 read the text for acknowledgments, funders, and grant numbers and found none."),
      },
      {
        id: "B4",
        text: "No identity-revealing detail in the body: over-specific study locations, a named IRB or ethics board, screenshots of your lab, figures showing authors' faces.",
        verify: (s) => {
          const r = fromRv(s, "RV-1");
          return r.status === "pass" ? { status: "unverified", note: "Text cleared by RV-1; figures and screenshots are not inspected — check them yourself." } : r;
        },
      },
      {
        id: "B5",
        text: "Self-citations kept, but in the third person: “As described by Chetty et al. [10]…”, never “in our previous work [10]…”.",
        verify: (s) => fromRv(s, "RV-1", "RV-1 found no first-person self-citation."),
      },
      {
        id: "B6",
        text: "External links (code, data, OSF, project pages) do not identify the authors.",
        verify: (s) => fromRv(s, "RV-2"),
      },
      { id: "B7", text: "Video figures and all supplementary files anonymized, including file metadata, voice-overs, and visible faces." },
      { id: "B8", text: "If you preprint (e.g. arXiv), you understand CHI permits it but warns that it undermines anonymity and can bias reviews." },
      { id: "B9", text: "At the R&R stage: re-check anonymity of the revised PDF, the response letter, and the highlighted changes; change marks must not be attributed to a named author." },
    ],
  },
  {
    id: "C",
    title: "Content, ethics and quality",
    items: [
      {
        id: "C1",
        text: "The contribution is stated explicitly and early.",
        verify: (s) => {
          const first = s.paper?.claims?.[0];
          return first
            ? { status: "unverified", note: `First claim inventoried: “${first.claim.slice(0, 160)}” (${first.section}). Confirm the abstract and introduction state it explicitly.` }
            : { status: "unverified", note: "No contribution claims were inventoried." };
        },
      },
      {
        id: "C2",
        text: "The work is situated in the relevant literature and reports enough methodological detail and data to be evaluated by CHI's norms for its research tradition.",
        verify: (s) => {
          const lit = fromAdr(s, "flags", "Grossly insufficient literature review to contextualize the contribution", "Literature review adequate.");
          const meth = fromAdr(s, "flags", "Grossly insufficient methodological detail, conceptual clarity, or research transparency", "Methodological detail adequate.");
          const data = fromAdr(s, "flags", "Grossly insufficient data to support the claims", "Data adequate.");
          const worst = [lit, meth, data].find((r) => r.status === "flag") ?? [lit, meth, data].find((r) => r.status === "unverified");
          return worst ?? { status: "pass", note: "ADR found literature, methodological detail, and data all adequate." };
        },
      },
      { id: "C3", text: "Human-subjects research complies with the ethics requirements of your research environment." },
      { id: "C4", text: "Use of AI / LLM tools complies with the ACM Policy on Authorship: an LLM cannot be an author; disclose use where the policy requires it." },
      { id: "C5", text: "Reproducibility supported where relevant (protocols, instruments, analysis code, data)." },
      { id: "C6", text: "Inclusive and gender-inclusive language; the paper acknowledges whose contexts it does and does not serve." },
      {
        id: "C7",
        text: "References follow the ACM Reference Format.",
        verify: (s) => {
          const n = s.paper?.references.length ?? 0;
          return { status: "unverified", note: n ? `${n} references parsed; format itself is not checked — use the template's bibliography style.` : "No references parsed." };
        },
      },
    ],
  },
  {
    id: "D",
    title: "Accessibility",
    items: [
      { id: "D1", text: "Alt text on every figure — meaningful, not “Figure 1”.", verify: altText },
      { id: "D2", text: "Colour is not the only carrier of meaning; contrast is sufficient; text in figures is legible at print size." },
      { id: "D3", text: "Headings use real heading styles; tables have proper header rows; reading order is correct in the exported PDF." },
      { id: "D4", text: "You have read (and understood) SIGCHI's Guide to an Accessible Submission." },
    ],
  },
  {
    id: "E",
    title: "Supplementary materials (optional)",
    items: [
      { id: "E1", text: "Video figure: no hard limit, but stay around 5 minutes. Anonymized." },
      { id: "E2", text: "Non-video supplements bundled as a single .zip with a README describing the contents." },
      { id: "E3", text: "Everything is uploaded by the paper deadline." },
      { id: "E4", text: "The paper still makes sense with the supplements removed.", verify: (s) => fromAdr(s, "reviewability", "Self-contained", "Judged self-contained.") },
    ],
  },
  {
    id: "F",
    title: "Submitting in PCS",
    items: [
      { id: "F1", text: "Title pasted from your source file, not the PDF, with each important word capitalised. The title is final." },
      { id: "F2", text: "ALL authors listed by the paper deadline. The list is frozen: adding or removing an author afterwards means withdrawing the paper." },
      { id: "F3", text: "Affiliations double-checked: you CANNOT change them later." },
      {
        id: "F4",
        text: "Abstract (maximum 150 words) pasted into the form.",
        verify: (s) => {
          const n = wordCount(s.paper?.abstract);
          if (!n) return { status: "unverified", note: "No abstract extracted." };
          return n > 150
            ? { status: "flag", note: `The paper's abstract is ≈${n} words — trim it to 150 for the PCS form.` }
            : { status: "pass", note: `The paper's abstract is ≈${n} words (≤150).` };
        },
      },
      {
        id: "F5",
        isNew: true,
        text: "Keywords chosen to describe the reviewer expertise needed (“A reviewer judging my work should have expertise related to…”): Domain 3–6 · Method / Approach 1–2 · Users 0–2 · Primary Contribution exactly 1.",
        verify: keywordQuotas,
      },
      { id: "F6", text: "PDF and form data both submitted. Anything still “incomplete” after the deadline is deleted." },
      { id: "F7", text: "PDF uploaded in single-column ACM format.", verify: (s) => fromRv(s, "RV-4") },
      { id: "F8", text: "Anonymity self-verification checkbox ticked." },
      {
        id: "F9",
        text: "Paper-length self-classification chosen (length justification supplied if needed).",
        verify: (s) => {
          const l = lengthCategory(s.paper?.words);
          return { status: l.status, note: l.status === "flag" ? `${l.note} Supply the justification in the form.` : `Classify as: ${l.label}.` };
        },
      },
      { id: "F10", isNew: true, text: "The list of references is supplied (used for integrity checking).", verify: referencesSupplied },
      { id: "F11", text: "Alt text entered for every figure and table in the form's accessibility box, one per line.", verify: altText },
      { id: "F12", text: "Anonymized source files (ZIP) uploaded." },
      { id: "F13", text: "Ethics field(s) completed where relevant." },
      { id: "F14", text: "Related concurrent submissions declared." },
      {
        id: "F15",
        isNew: true,
        text: "Four review-responsibility slots filled with authors from this submission (the same author may be named more than once).",
        detail: "Reviewer-eligibility option selected and any exemption declared · at least one slot holds a senior author qualified to serve as an AC · all four meet the CHI Minimum Review Qualifications · declining an invitation does not discharge a slot, and an author who fails to complete assigned reviews desk-rejects every submission they were named on.",
      },
      {
        id: "F16",
        isNew: true,
        text: "ALL authors created or updated their PCS profile.",
        detail: "ORCID and DBLP profile (or “N/A”) under Account → Change contact information · each declared reviewer has volunteered for CHI 2027 Papers under the Reviews tab, with areas of expertise and sample publications · every author's PCS email is current and monitored.",
      },
      { id: "F17", text: "All four submitter confirmations ticked: the work is yours and your co-authors'; you hold copyright/permissions; at least one author will register if accepted; the paper goes public up to two weeks before the conference." },
    ],
  },
  {
    id: "G",
    title: "After submission",
    items: [
      { id: "G1", isNew: true, text: "Reasonable review requests are accepted. Declining all requests (with no exemption) desk-rejects every submission that author was named on." },
      { id: "G2", isNew: true, text: "Assigned reviews are completed by the deadline; failure can desk-reject the submission." },
      { id: "G3", text: "Reviews released 5 November 2026. If any AC recommendation is at or above the R&R threshold, you get 5 weeks to revise." },
      { id: "G4", text: "R&R package: revised paper with changes highlighted in colour, plus a response letter addressing each reviewer comment. Anonymous. No late resubmissions." },
    ],
  },
  {
    id: "H",
    title: "On acceptance",
    items: [
      { id: "H1", text: "Complete ACM eRights by 7 January 2027." },
      { id: "H2", text: "Upload final source to TAPS by 14 January 2027. Word: 1-column source. LaTeX: 1- or 2-column (sigconf) source. TAPS generates the 2-column PDF and the HTML5 version." },
      { id: "H3", text: "Inspect the TAPS proofs: figure placement, tables and equations shift in the 2-column conversion. Do not add substantial content the reviewers did not ask for." },
      { id: "H4", text: "Upload the TAPS-approved version to PCS by 18 February 2027, with supplements and any video preview." },
      { id: "H5", text: "You hold permission to use any video, audio, images of identifiable people, or proprietary content." },
      { id: "H6", text: "At least one author registers by 4 March 2027; otherwise the paper is pulled from the ACM Digital Library." },
      { id: "H7", text: "If nobody attends in person, upload a video presentation by 4 March 2027." },
    ],
  },
];

export interface ChecklistEvaluation {
  auto: Record<string, AutoResult>;
  counts: { pass: number; flag: number; unverified: number; manual: number };
}

export function evaluateChecklist(state: RunState): ChecklistEvaluation {
  const auto: Record<string, AutoResult> = {};
  const counts = { pass: 0, flag: 0, unverified: 0, manual: 0 };
  for (const sec of CHECKLIST_SECTIONS) {
    for (const item of sec.items) {
      if (item.verify) {
        let r: AutoResult;
        try {
          r = item.verify(state);
        } catch {
          r = { status: "unverified", note: "Could not evaluate." };
        }
        auto[item.id] = r;
        counts[r.status]++;
      } else {
        counts.manual++;
      }
    }
  }
  return { auto, counts };
}

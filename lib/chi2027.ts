// CHI 2027 review process, encoded as data.
// Sources: chi2027.acm.org/papers-review-process and the CHI Steering Committee's
// rubric-based Assisted Desk Reject (ADR) process description.

export const ACM_CRITERIA = [
  {
    name: "Originality",
    prompt: "What new ideas or approaches are introduced? Is the combination of problem, method, and setting genuinely new?",
  },
  {
    name: "Correctness",
    prompt: "Are the authors' processes clear and is the rigor appropriate for the method used? Do the analyses support the conclusions drawn?",
  },
  {
    name: "Novelty",
    prompt: "Is prior work adequately covered, and is the contribution clearly differentiated from the state of the art?",
  },
  {
    name: "Importance",
    prompt: "Why do the contributions matter to HCI, and how large is the likely impact?",
  },
  {
    name: "Clarity of Exposition",
    prompt: "Is the paper well written and well structured? Can a CHI reader follow the argument?",
  },
] as const;

export const ADR_FLAGS = [
  "Grossly insufficient literature review to contextualize the contribution",
  "Grossly insufficient methodological detail, conceptual clarity, or research transparency",
  "Grossly insufficient data to support the claims",
  "A disproportionately small HCI contribution given the paper's length",
] as const;

export const DESK_REJECT_CHECKS = [
  { name: "Anonymization", severity: "hard", prompt: "Author names, affiliations, acknowledgments, identifying repo/OSF links, or 'our previous work [X]' phrasing that de-anonymizes the authors." },
  { name: "Completeness", severity: "hard", prompt: "Placeholder text, missing sections, missing references list, or obviously unfinished content." },
  { name: "English language", severity: "hard", prompt: "The paper must be written in English." },
  { name: "In scope for CHI", severity: "hard", prompt: "The paper must concern human-computer interaction; no HCI framing at all is a hard failure." },
  { name: "Template conformance", severity: "soft", prompt: "Signals of the ACM template (single column manuscript for review); obvious non-template formatting." },
  { name: "Length justified", severity: "soft", prompt: "Paper length should be proportionate to its contribution; note if it appears excessive without justification." },
  { name: "HCI literature context", severity: "soft", prompt: "The paper should engage HCI literature, not only literature from another field." },
  { name: "Reference completeness", severity: "soft", prompt: "In-text citations resolve to entries in the reference list; no obviously broken citations." },
  { name: "Figures readable", severity: "soft", prompt: "Figures and tables are legible and referenced in the text." },
  { name: "Writing quality floor", severity: "soft", prompt: "Not riddled with typos or broken sentences to the point of impeding review." },
] as const;

export const RECOMMENDATION_SCALE = [
  { code: "A", label: "Accept with Minor Revisions" },
  { code: "ARR", label: "Either Accept with Minor Revisions or Revise & Resubmit" },
  { code: "RR", label: "Revise & Resubmit" },
  { code: "RRX", label: "Either Reject or Revise & Resubmit" },
  { code: "X", label: "Reject" },
] as const;

export const SUBCOMMUNITIES = [
  "Auto-detect from the paper",
  "Accessibility & Aging",
  "Blending Interaction: Engineering Interactive Systems & Tools",
  "Building Devices: Hardware, Materials & Fabrication",
  "Computational Interaction",
  "Critical Computing, Sustainability & Social Justice",
  "Design",
  "Games & Play",
  "Health & Wellbeing",
  "Interacting with Devices: Interaction Techniques & Modalities",
  "Interaction Beyond the Individual",
  "Learning, Education & Families",
  "Privacy & Security",
  "Understanding People: Qualitative Methods",
  "Understanding People: Quantitative Methods",
  "User Experience & Usability",
  "Visualization",
] as const;

export const BASE_RATES = `Calibration facts you must apply:
- CHI historically accepts roughly 25% of submissions. Reviews at CHI are demanding.
- The modal first-round recommendation across all CHI reviews sits between RR and ARR, not at A.
- Rubric anchors for criterion scores (1-5): 1 = fundamentally deficient; 2 = serious problems that a revision cycle may not fix; 3 = adequate with clear weaknesses; 4 = strong with minor weaknesses; 5 = exemplary, top decile of CHI submissions. Score 5 must be rare.
- Your recommendation must match the weight of your criticisms. A review with an unresolved major methodological issue cannot recommend A. A review with only minor issues should not recommend RR or below.`;

export const REVIEW_ANATOMY = `Write roughly one page of text (CHI's reviewer guide norm), structured as a real CHI review:
1. A summary of the paper IN YOUR OWN WORDS (2-4 sentences) — never paraphrase the abstract.
2. Numbered major issues. Each carries an actual argument (what is wrong, why it matters, what would fix it) and is anchored to a VERBATIM quote from the paper plus a section/page anchor like "§4.1, p.6".
3. A short minor issues / nits list.
4. Questions the authors should answer in a revision.
5. Comments to the committee: 1-3 candid sentences the authors will not see.
Never make a criticism that could apply to any paper. Never restate a limitation the authors already state themselves — if you engage one, frame it as: the authors acknowledge X; my concern is what X means for claim Y.
Be direct and demanding — CHI reviews are. Hedged niceties help no one: the authors should finish your review knowing exactly what would make the committee reject this paper, and exactly what would save it. Praise only what is genuinely strong, and say why.`;

// First-round decision rules, applied in code (not by the model).
export function decideTrack(recs: string[]): "minor" | "major" | "reject" {
  const positive = recs.filter((r) => r === "A" || r === "ARR").length;
  if (positive >= 3) return "minor";
  if (positive >= 2) return "major";
  return "reject";
}

export const DECISION_LABELS: Record<string, string> = {
  minor: "Minor Revisions track",
  major: "Major Revisions track",
  reject: "Reject (this cycle)",
};

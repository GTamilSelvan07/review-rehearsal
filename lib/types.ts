export type SourceKind = "pdf" | "latex";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
}

export interface RefEntry {
  key: string;
  raw: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  doi: string | null;
}

/** The CHI 2027 PCS keywords: the expertise a reviewer needs to judge the paper. */
export interface PcsKeywords {
  /** 2–6 */
  domain: string[];
  /** 1–2 */
  method: string[];
  /** 0–2, only if a specific population is the focus */
  users: string[];
  /** exactly 1 */
  contribution: string;
}

export interface PaperInfo {
  title: string;
  abstract: string;
  subcommunity: string;
  /** PCS keywords the author should enter, chosen from the official taxonomy. */
  pcs: PcsKeywords;
  pages: number;
  words: number;
  sections: { title: string; page: number | null }[];
  claims: { claim: string; evidence: string; section: string }[];
  methods: string[];
  statedLimitations: string[];
  references: RefEntry[];
  fullText: string;
}

export type RefStatus = "verified" | "mismatch" | "not_found" | "skipped";

export interface RefVerdict {
  key: string;
  raw: string;
  title: string;
  status: RefStatus;
  source: string | null;
  matchedTitle: string | null;
  matchedYear: number | null;
  matchedDoi: string | null;
  matchedVenue: string | null;
  score: number;
  notes: string | null;
  correctedBibtex: string | null;
}

export interface RefAudit {
  verdicts: RefVerdict[];
  summary: { total: number; verified: number; mismatch: number; notFound: number; skipped: number };
}

export type CheckStatus = "pass" | "flag" | "unverified";
export type CheckBasis = "deterministic" | "model" | "both";

export interface DeskRejectCheck {
  id: string;
  name: string;
  status: CheckStatus;
  /** hard = blocking (would halt the submission if confirmed); soft = discretionary/advisory */
  severity: "hard" | "soft";
  basis: CheckBasis;
  /** The strongest concrete evidence for the verdict (quotes, URLs, entries). */
  evidence: string;
  /** Why the evidence supports the verdict — what the AC would read. */
  reasoning: string;
  /** How the check was performed, for the disclosure triangle. */
  method: string;
  /** Hits from the deterministic scan, when one ran. */
  deterministicHits?: string[];
}

export interface DeskRejectResult {
  checks: DeskRejectCheck[];
  /** false only when a blocking (hard) check is flagged. */
  passed: boolean;
}

export interface ContributionType {
  type: string;
  /** The visible premise for the inference — tentative, as the AC would state it. */
  premise: string;
  /** What form of validation is appropriate for this type. */
  validationExpectation: string;
}

export interface AdrReport {
  contributionTypes: ContributionType[];
  reviewability: { name: string; status: "pass" | "borderline" | "flag"; rationale: string; evidence: string }[];
  criteria: { name: string; score: number; note: string; evidence: string }[];
  flags: { name: string; status: "pass" | "borderline" | "flag"; rationale: string; evidence: string }[];
  decision: "advance" | "adr";
  acNote: string;
}

export interface ExpertiseTag {
  /** A PCS taxonomy keyword. */
  tag: string;
  /** Self-rated expertise 1–4, as reviewers declare in PCS. */
  level: number;
}

export interface Persona {
  id: string;
  archetype: string;
  background: string;
  expertise: number;
  focus: string[];
  style: string;
  biases: string;
  /** Self-rated expertise profile over the PCS taxonomy (~8 keywords). */
  expertiseTags: ExpertiseTag[];
  /** IDF-weighted match to the paper's keywords, 0–1 (computed in code). */
  match?: number;
  /** false = adversarial advisory reviewer, excluded from decision thresholds */
  counted?: boolean;
}

export interface MatchTag {
  tag: string;
  group: "domain" | "method" | "users" | "contribution";
  weight: number;
}

export interface Matching {
  tags: MatchTag[];
  scores: { personaId: string; score: number }[];
  /** For each paper keyword: the best self-rating among counted reviewers and who holds it. */
  coverage: (MatchTag & { best: number; by: string | null })[];
  /** Keywords covered at expertise ≥3 by at least one counted reviewer. */
  teamCovers: number;
  total: number;
}

export type Recommendation = "A" | "ARR" | "RR" | "RRX" | "X";

export interface MajorIssue {
  title: string;
  argument: string;
  quote: string;
  anchor: string;
  quoteVerified?: boolean;
}

export interface AuditFinding {
  issue: string;
  severity: "major" | "moderate" | "minor";
  quote: string;
  anchor: string;
  quoteVerified?: boolean;
}

export interface SectionAudit {
  section: string;
  findings: AuditFinding[];
}

export interface Review {
  personaId: string;
  archetype: string;
  expertise: number;
  summary: string;
  contribution: string;
  criteria: { name: string; score: number; assessment: string }[];
  majorIssues: MajorIssue[];
  minorIssues: string[];
  questions: string[];
  revisions: string[];
  recommendation: Recommendation;
  committeeComments: string;
  /** false = adversarial advisory review, excluded from decision thresholds */
  counted?: boolean;
  /** R5 only: exhaustive section-by-section scrutiny findings */
  sectionAudit?: SectionAudit[];
}

export interface MetaReview {
  discussion: { speaker: string; text: string }[];
  metaReview: string;
  decision: "minor" | "major" | "reject";
  decisionRationale: string;
}

export interface GuideAction {
  title: string;
  detail: string;
  group: "track" | "criterion" | "polish";
  criterion: string;
  effort: "Quick fix" | "A day's work" | "New data needed" | string;
  anchor: string;
}

export interface ReadingItem {
  title: string;
  venue: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  bibtex: string;
  source: string;
}

export interface Guide {
  actions: GuideAction[];
  reading: ReadingItem[];
}

export type StageName =
  | "ingest"
  | "refaudit"
  | "deskreject"
  | "adr"
  | "panel"
  | "reviews"
  | "meta"
  | "guide";

/** Gates the user chose to override, as the AC may override an automated flag. */
export type GateName = "deskreject" | "adr";

export interface PdfMetadata {
  readable: boolean;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

export interface RunState {
  runId: string;
  kind: SourceKind;
  files: UploadedFile[];
  /** @deprecated CHI 2027 has no subcommittees; kept so old run states still parse. */
  subcommunityHint?: string;
  geminiFileUri?: string | null;
  /** Document-information fields read from the uploaded PDF (anonymization leak check). */
  pdfMeta?: PdfMetadata;
  latexText?: string;
  bibText?: string;
  paper?: PaperInfo;
  refAudit?: RefAudit;
  deskReject?: DeskRejectResult;
  adr?: AdrReport;
  personas?: Persona[];
  matching?: Matching;
  reviews?: Review[];
  meta?: MetaReview;
  guide?: Guide;
  overrides?: GateName[];
}

export const STAGE_ORDER: { id: StageName; label: string; detail: string }[] = [
  { id: "ingest", label: "Ingest & normalize", detail: "Reading the paper, claims inventory, expertise descriptors" },
  { id: "refaudit", label: "Reference audit", detail: "Crossref · OpenAlex · Semantic Scholar · DBLP — no model involved" },
  { id: "deskreject", label: "Desk-reject screen", detail: "The RV checks: identity, links, masked refs, template, hidden text, scope…" },
  { id: "adr", label: "ADR assessment", detail: "Simulated AC reading: contribution type, reviewability, rubric, four flags" },
  { id: "panel", label: "Reviewer matching", detail: "Five expert personas matched to the paper's descriptors" },
  { id: "reviews", label: "Five independent reviews", detail: "Four counted + one adversarial · draft → fact-check → sharpen" },
  { id: "meta", label: "Meta-review & decision", detail: "1AC synthesis and decision track" },
  { id: "guide", label: "Strengthening guide", detail: "Prioritized fixes and a verified reading list" },
];

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

export interface PaperInfo {
  title: string;
  abstract: string;
  subcommunity: string;
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

export interface DeskRejectCheck {
  name: string;
  passed: boolean;
  severity: "hard" | "soft";
  evidence: string;
}

export interface DeskRejectResult {
  checks: DeskRejectCheck[];
  passed: boolean;
}

export interface AdrReport {
  criteria: { name: string; score: number; note: string; evidence: string }[];
  flags: { name: string; status: "pass" | "borderline" | "flag"; rationale: string; evidence: string }[];
  decision: "advance" | "adr";
  acNote: string;
}

export interface Persona {
  id: string;
  archetype: string;
  background: string;
  expertise: number;
  focus: string[];
  style: string;
  biases: string;
}

export type Recommendation = "A" | "ARR" | "RR" | "RRX" | "X";

export interface MajorIssue {
  title: string;
  argument: string;
  quote: string;
  anchor: string;
  quoteVerified?: boolean;
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

export interface RunState {
  runId: string;
  kind: SourceKind;
  files: UploadedFile[];
  subcommunityHint?: string;
  geminiFileUri?: string | null;
  latexText?: string;
  bibText?: string;
  paper?: PaperInfo;
  deskReject?: DeskRejectResult;
  refAudit?: RefAudit;
  adr?: AdrReport;
  personas?: Persona[];
  reviews?: Review[];
  meta?: MetaReview;
  guide?: Guide;
}

export type StageName =
  | "ingest"
  | "deskreject"
  | "refaudit"
  | "adr"
  | "panel"
  | "reviews"
  | "meta"
  | "guide";

export const STAGE_ORDER: { id: StageName; label: string; detail: string }[] = [
  { id: "ingest", label: "Ingest & normalize", detail: "Reading the paper, building the claims inventory" },
  { id: "deskreject", label: "Desk-reject screen", detail: "Anonymization, template, completeness" },
  { id: "refaudit", label: "Reference audit", detail: "Crossref · OpenAlex · Semantic Scholar · DBLP" },
  { id: "adr", label: "ADR assessment", detail: "Five ACM criteria, four flags, simulated AC decision" },
  { id: "panel", label: "Reviewer matching", detail: "Four expert personas derived from the paper" },
  { id: "reviews", label: "Four independent reviews", detail: "Draft → fact-check → sharpen, in parallel" },
  { id: "meta", label: "Meta-review & decision", detail: "1AC synthesis and decision track" },
  { id: "guide", label: "Strengthening guide", detail: "Prioritized fixes and a verified reading list" },
];

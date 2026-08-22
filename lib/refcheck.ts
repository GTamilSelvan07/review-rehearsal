import type { RefEntry, RefVerdict, RefAudit } from "./types";
import { diceSimilarity, normalizeTitle } from "./similarity";
import { makeBibtex } from "./bibtex";
import { pLimit } from "./gemini";

const VERIFY_THRESHOLD = 0.93;
const CANDIDATE_THRESHOLD = 0.8;

interface Candidate {
  title: string;
  year: number | null;
  doi: string | null;
  venue: string | null;
  authors: string[];
  url: string | null;
  source: string;
}

interface SearchResult {
  cands: Candidate[];
  ok: boolean; // false = the service failed (throttled/down), not "no results"
}

function mailto(): string {
  return process.env.CONTACT_EMAIL || "review-rehearsal@example.com";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-host concurrency gates so a burst of references never stampedes one API.
const gates = {
  crossref: pLimit(2),
  openalex: pLimit(2),
  semanticscholar: pLimit(1),
  dblp: pLimit(2),
};

/** Fetch JSON with timeout + retries on 429/5xx/timeouts. Throws on final failure. */
async function getJSON(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": `ReviewRehearsal/0.1 (mailto:${mailto()})`, ...headers },
        signal: ctrl.signal,
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      return await res.json();
    } catch (err) {
      lastErr = err;
      if ((err as { fatal?: boolean }).fatal) throw err;
      await sleep(1200 * Math.pow(2, attempt) + Math.random() * 500);
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function candidateFromCrossref(w: any): Candidate {
  return {
    title: Array.isArray(w.title) ? (w.title[0] ?? "") : String(w.title ?? ""),
    year: w.issued?.["date-parts"]?.[0]?.[0] ?? null,
    doi: w.DOI ?? null,
    venue: Array.isArray(w["container-title"]) ? (w["container-title"][0] ?? null) : null,
    authors: (w.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(" ")),
    url: w.URL ?? (w.DOI ? `https://doi.org/${w.DOI}` : null),
    source: "crossref",
  };
}

async function crossrefByDoi(doi: string): Promise<Candidate | null> {
  try {
    const data: any = await gates.crossref(() =>
      getJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(mailto())}`)
    );
    return data?.message ? candidateFromCrossref(data.message) : null;
  } catch {
    return null;
  }
}

async function searchCrossref(q: string): Promise<SearchResult> {
  try {
    const data: any = await gates.crossref(() =>
      getJSON(
        `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&rows=5&select=title,author,issued,DOI,container-title,URL&mailto=${encodeURIComponent(mailto())}`
      )
    );
    return { cands: (data?.message?.items ?? []).map(candidateFromCrossref), ok: true };
  } catch {
    return { cands: [], ok: false };
  }
}

async function searchOpenAlex(q: string): Promise<SearchResult> {
  try {
    const data: any = await gates.openalex(() =>
      getJSON(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=5&mailto=${encodeURIComponent(mailto())}`)
    );
    return {
      ok: true,
      cands: (data?.results ?? []).map((w: any) => ({
        title: w.display_name ?? "",
        year: w.publication_year ?? null,
        doi: w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//, "") : null,
        venue: w.primary_location?.source?.display_name ?? null,
        authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
        url: w.doi ?? w.id ?? null,
        source: "openalex",
      })),
    };
  } catch {
    return { cands: [], ok: false };
  }
}

async function searchSemanticScholar(q: string): Promise<SearchResult> {
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  try {
    const data: any = await gates.semanticscholar(async () => {
      const out = await getJSON(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=5&fields=title,year,venue,externalIds,url,authors`,
        headers
      );
      await sleep(1100); // stay under the shared unauthenticated rate limit
      return out;
    });
    return {
      ok: true,
      cands: (data?.data ?? []).map((w: any) => ({
        title: w.title ?? "",
        year: w.year ?? null,
        doi: w.externalIds?.DOI ?? null,
        venue: w.venue ?? null,
        authors: (w.authors ?? []).map((a: any) => a.name).filter(Boolean),
        url: w.url ?? null,
        source: "semanticscholar",
      })),
    };
  } catch {
    return { cands: [], ok: false };
  }
}

async function searchDblp(q: string): Promise<SearchResult> {
  try {
    const data: any = await gates.dblp(() =>
      getJSON(`https://dblp.org/search/publ/api?q=${encodeURIComponent(q)}&format=json&h=5`)
    );
    const hits = data?.result?.hits?.hit ?? [];
    return {
      ok: true,
      cands: hits.map((h: any) => {
        const info = h.info ?? {};
        const authorField = info.authors?.author;
        const authors = Array.isArray(authorField)
          ? authorField.map((a: any) => (typeof a === "string" ? a : a.text)).filter(Boolean)
          : authorField
            ? [typeof authorField === "string" ? authorField : authorField.text]
            : [];
        return {
          title: String(info.title ?? "").replace(/\.$/, ""),
          year: info.year ? parseInt(info.year, 10) : null,
          doi: info.doi ?? null,
          venue: info.venue ?? null,
          authors,
          url: info.ee ?? info.url ?? null,
          source: "dblp",
        };
      }),
    };
  } catch {
    return { cands: [], ok: false };
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Title similarity with a containment boost (handles subtitle truncation). */
function titleScore(refTitle: string, candTitle: string): number {
  let s = diceSimilarity(refTitle, candTitle);
  const a = normalizeTitle(refTitle);
  const b = normalizeTitle(candTitle);
  if (a && b) {
    if (a === b) return 1;
    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    if (longer.includes(shorter) && shorter.length >= 0.5 * longer.length) s = Math.max(s, 0.95);
  }
  return s;
}

function lastName(n: string): string {
  if (n.includes(",")) return n.split(",")[0].trim().toLowerCase();
  const parts = n.trim().split(/\s+/);
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function authorsCorroborate(refAuthors: string[], candAuthors: string[]): boolean | null {
  if (!refAuthors.length || !candAuthors.length) return null; // nothing to compare
  const wanted = lastName(refAuthors[0]);
  if (!wanted) return null;
  return candAuthors.some((c) => lastName(c) === wanted);
}

function isShortTitle(title: string): boolean {
  const n = normalizeTitle(title);
  return n.length < 16 || n.split(" ").length <= 3;
}

async function runSearches(ref: RefEntry, titleOnly: boolean): Promise<{ best: { cand: Candidate; score: number } | null; okCount: number }> {
  const surname = ref.authors[0] ? lastName(ref.authors[0]) : "";
  const query = titleOnly
    ? ref.title.slice(0, 250)
    : `${ref.title} ${surname}${ref.year ? ` ${ref.year}` : ""}`.slice(0, 250);

  let best: { cand: Candidate; score: number } | null = null;
  let okCount = 0;
  for (const search of [searchCrossref, searchOpenAlex, searchSemanticScholar, searchDblp]) {
    const { cands, ok } = await search(query);
    if (ok) okCount++;
    for (const cand of cands) {
      const score = titleScore(ref.title, cand.title);
      if (!best || score > best.score) best = { cand, score };
    }
    if (best && best.score >= VERIFY_THRESHOLD && okCount >= 1) break;
  }
  return { best, okCount };
}

async function verifyOne(ref: RefEntry, titleOnly = false): Promise<RefVerdict> {
  const base: Omit<RefVerdict, "status" | "score" | "notes"> = {
    key: ref.key,
    raw: ref.raw,
    title: ref.title,
    source: null,
    matchedTitle: null,
    matchedYear: null,
    matchedDoi: null,
    matchedVenue: null,
    correctedBibtex: null,
  };

  // DOI first: authoritative.
  if (ref.doi && !titleOnly) {
    const cand = await crossrefByDoi(ref.doi);
    if (cand) {
      const score = titleScore(ref.title, cand.title);
      if (score >= CANDIDATE_THRESHOLD) return judge(ref, cand, score, base);
      return {
        ...base,
        source: "crossref",
        matchedTitle: cand.title,
        matchedYear: cand.year,
        matchedDoi: cand.doi,
        matchedVenue: cand.venue,
        status: "mismatch",
        score,
        notes: "The DOI in your entry resolves to a different work than the title suggests.",
        correctedBibtex: null,
      };
    }
  }

  const { best, okCount } = await runSearches(ref, titleOnly);

  if (best && best.score >= CANDIDATE_THRESHOLD) {
    return judge(ref, best.cand, best.score, base);
  }
  if (okCount < 2) {
    return {
      ...base,
      status: "skipped",
      score: best?.score ?? 0,
      notes: "Lookup services were rate-limiting or unreachable — this reference could not be reliably checked (it is NOT necessarily wrong).",
    };
  }
  return {
    ...base,
    status: "not_found",
    score: best?.score ?? 0,
    notes: `No match in Crossref, OpenAlex, Semantic Scholar, or DBLP (closest title scored ${(best?.score ?? 0).toFixed(2)}). We could not verify this reference — double-check the entry.`,
  };
}

function judge(
  ref: RefEntry,
  cand: Candidate,
  score: number,
  base: Omit<RefVerdict, "status" | "score" | "notes">
): RefVerdict {
  const yearOk = ref.year === null || cand.year === null || Math.abs(ref.year - cand.year) <= 1;
  const authorMatch = authorsCorroborate(ref.authors, cand.authors);
  const matched = {
    source: cand.source,
    matchedTitle: cand.title,
    matchedYear: cand.year,
    matchedDoi: cand.doi,
    matchedVenue: cand.venue,
  };

  // Short, generic titles ("Common ground") need author corroboration, not just a title hit.
  const short = isShortTitle(ref.title);
  const corroborated = short ? authorMatch === true && ref.year !== null && yearOk : authorMatch !== false;

  if (score >= VERIFY_THRESHOLD && yearOk && corroborated) {
    return { ...base, ...matched, status: "verified", score, notes: null, correctedBibtex: null };
  }

  const problems: string[] = [];
  if (!yearOk) problems.push(`published ${cand.year}, your entry says ${ref.year}`);
  if (authorMatch === false) problems.push("first author differs from the matched record");
  if (short && authorMatch !== true) problems.push("title is too generic to verify without an author match");
  if (score < VERIFY_THRESHOLD) problems.push("title differs from the matched record");
  return {
    ...base,
    ...matched,
    status: "mismatch",
    score,
    notes: problems.join("; ") || "metadata differs from the matched record",
    correctedBibtex: makeBibtex({
      key: ref.key,
      title: cand.title,
      year: cand.year,
      venue: cand.venue,
      doi: cand.doi,
      authors: cand.authors.slice(0, 12),
    }),
  };
}

const RANK: Record<RefVerdict["status"], number> = { verified: 3, mismatch: 2, not_found: 1, skipped: 0 };

export async function verifyReferences(refs: RefEntry[]): Promise<RefAudit> {
  const limit = pLimit(4);
  let verdicts = await Promise.all(refs.map((r) => limit(() => verifyOne(r))));

  // Second-chance pass for anything unresolved: cool down, retry with a
  // title-only query (author strings from PDF extraction are sometimes noisy).
  const retryIdx = verdicts
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.status === "not_found" || v.status === "skipped")
    .map(({ i }) => i);
  if (retryIdx.length) {
    await sleep(4000);
    const retries = await Promise.all(retryIdx.map((i) => limit(() => verifyOne(refs[i], true))));
    verdicts = verdicts.map((v, i) => {
      const j = retryIdx.indexOf(i);
      if (j === -1) return v;
      return RANK[retries[j].status] > RANK[v.status] ? retries[j] : v;
    });
  }

  const summary = {
    total: verdicts.length,
    verified: verdicts.filter((v) => v.status === "verified").length,
    mismatch: verdicts.filter((v) => v.status === "mismatch").length,
    notFound: verdicts.filter((v) => v.status === "not_found").length,
    skipped: verdicts.filter((v) => v.status === "skipped").length,
  };
  return { verdicts, summary };
}

/** Search real papers for the strengthening guide's reading list. */
export async function searchReadingList(queries: string[]): Promise<Candidate[]> {
  const limit = pLimit(2);
  const results = await Promise.all(
    queries.slice(0, 5).map((q) =>
      limit(async () => {
        const [oa, s2] = await Promise.all([searchOpenAlex(q), searchSemanticScholar(q)]);
        return [...oa.cands.slice(0, 2), ...s2.cands.slice(0, 2)];
      })
    )
  );
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const cand of results.flat()) {
    const key = cand.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
  }
  return out.slice(0, 8);
}

export type { Candidate };

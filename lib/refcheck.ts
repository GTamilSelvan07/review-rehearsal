import type { RefEntry, RefVerdict, RefAudit } from "./types";
import { diceSimilarity } from "./similarity";
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

function mailto(): string {
  return process.env.CONTACT_EMAIL || "review-rehearsal@example.com";
}

async function getJSON(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `ReviewRehearsal/0.1 (mailto:${mailto()})`, ...headers },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function crossrefByDoi(doi: string): Promise<Candidate | null> {
  try {
    const data: any = await getJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(mailto())}`);
    const w = data?.message;
    if (!w) return null;
    return candidateFromCrossref(w);
  } catch {
    return null;
  }
}

function candidateFromCrossref(w: any): Candidate {
  return {
    title: Array.isArray(w.title) ? w.title[0] ?? "" : String(w.title ?? ""),
    year: w.issued?.["date-parts"]?.[0]?.[0] ?? null,
    doi: w.DOI ?? null,
    venue: Array.isArray(w["container-title"]) ? w["container-title"][0] ?? null : null,
    authors: (w.author ?? []).map((a: any) => [a.given, a.family].filter(Boolean).join(" ")),
    url: w.URL ?? (w.DOI ? `https://doi.org/${w.DOI}` : null),
    source: "crossref",
  };
}

async function searchCrossref(q: string): Promise<Candidate[]> {
  try {
    const data: any = await getJSON(
      `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&rows=3&mailto=${encodeURIComponent(mailto())}`
    );
    return (data?.message?.items ?? []).map(candidateFromCrossref);
  } catch {
    return [];
  }
}

async function searchOpenAlex(q: string): Promise<Candidate[]> {
  try {
    const data: any = await getJSON(
      `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=3&mailto=${encodeURIComponent(mailto())}`
    );
    return (data?.results ?? []).map((w: any) => ({
      title: w.display_name ?? "",
      year: w.publication_year ?? null,
      doi: w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//, "") : null,
      venue: w.primary_location?.source?.display_name ?? null,
      authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
      url: w.doi ?? w.id ?? null,
      source: "openalex",
    }));
  } catch {
    return [];
  }
}

async function searchSemanticScholar(q: string): Promise<Candidate[]> {
  try {
    const data: any = await getJSON(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=3&fields=title,year,venue,externalIds,url,authors`
    );
    return (data?.data ?? []).map((w: any) => ({
      title: w.title ?? "",
      year: w.year ?? null,
      doi: w.externalIds?.DOI ?? null,
      venue: w.venue ?? null,
      authors: (w.authors ?? []).map((a: any) => a.name).filter(Boolean),
      url: w.url ?? null,
      source: "semanticscholar",
    }));
  } catch {
    return [];
  }
}

async function searchDblp(q: string): Promise<Candidate[]> {
  try {
    const data: any = await getJSON(
      `https://dblp.org/search/publ/api?q=${encodeURIComponent(q)}&format=json&h=3`
    );
    const hits = data?.result?.hits?.hit ?? [];
    return hits.map((h: any) => {
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
    });
  } catch {
    return [];
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

function lastNameMatches(refAuthors: string[], candAuthors: string[]): boolean {
  if (!refAuthors.length || !candAuthors.length) return true; // nothing to compare
  const last = (n: string) => {
    if (n.includes(",")) return n.split(",")[0].trim().toLowerCase();
    const parts = n.trim().split(/\s+/);
    return (parts[parts.length - 1] ?? "").toLowerCase();
  };
  const refFirst = last(refAuthors[0]);
  return candAuthors.some((c) => last(c) === refFirst);
}

async function verifyOne(ref: RefEntry): Promise<RefVerdict> {
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

  let networkFailures = 0;

  // DOI first: authoritative.
  if (ref.doi) {
    const cand = await crossrefByDoi(ref.doi);
    if (cand) {
      const score = diceSimilarity(ref.title, cand.title);
      if (score >= CANDIDATE_THRESHOLD) {
        return judge(ref, cand, score, base);
      }
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
    networkFailures++;
  }

  const query = `${ref.title} ${ref.authors[0] ?? ""}`.trim();
  let best: { cand: Candidate; score: number } | null = null;

  for (const search of [searchCrossref, searchOpenAlex, searchSemanticScholar, searchDblp]) {
    const cands = await search(query);
    if (!cands.length) networkFailures++;
    for (const cand of cands) {
      const score = diceSimilarity(ref.title, cand.title);
      if (!best || score > best.score) best = { cand, score };
    }
    if (best && best.score >= VERIFY_THRESHOLD) break; // good enough, stop early
  }

  if (best && best.score >= CANDIDATE_THRESHOLD) {
    return judge(ref, best.cand, best.score, base);
  }

  if (networkFailures >= 4 && !best) {
    return { ...base, status: "skipped", score: 0, notes: "Lookup services were unreachable — could not check this reference." };
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
  const authorsOk = lastNameMatches(ref.authors, cand.authors);
  const matched = {
    source: cand.source,
    matchedTitle: cand.title,
    matchedYear: cand.year,
    matchedDoi: cand.doi,
    matchedVenue: cand.venue,
  };
  if (score >= VERIFY_THRESHOLD && yearOk && authorsOk) {
    return { ...base, ...matched, status: "verified", score, notes: null, correctedBibtex: null };
  }
  const problems: string[] = [];
  if (!yearOk) problems.push(`published ${cand.year}, your entry says ${ref.year}`);
  if (!authorsOk) problems.push("first author differs from the matched record");
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

export async function verifyReferences(refs: RefEntry[]): Promise<RefAudit> {
  const limit = pLimit(5);
  const verdicts = await Promise.all(refs.map((r) => limit(() => verifyOne(r))));
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
  const limit = pLimit(3);
  const results = await Promise.all(
    queries.slice(0, 5).map((q) =>
      limit(async () => {
        const [oa, s2] = await Promise.all([searchOpenAlex(q), searchSemanticScholar(q)]);
        return [...oa.slice(0, 2), ...s2.slice(0, 2)];
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

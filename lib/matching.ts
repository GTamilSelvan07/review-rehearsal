// Reviewer matching, in code — a stand-in for CHI 2027's matching tool: the
// paper's PCS keywords are compared with each reviewer's self-rated expertise,
// rarer descriptors weigh more, and the AC (not the score) decides. Also checks
// the AC's duty that the team collectively covers both topic and method.

import type { PcsKeywords, Persona, Matching, MatchTag } from "./types";
import { KEYWORD_RULES, canonicalTag, groupOf, tagWeight, type KeywordGroup } from "./keywords";

/** Snap model output to exact taxonomy names, dedupe, and enforce the PCS count rules. */
export function normalizePcs(raw: Partial<PcsKeywords> | undefined): PcsKeywords {
  const fix = (list: unknown, group: KeywordGroup): string[] => {
    const arr = Array.isArray(list) ? (list as unknown[]).map(String) : [];
    const out: string[] = [];
    for (const s of arr) {
      const c = canonicalTag(s, group);
      if (c && !out.includes(c)) out.push(c);
    }
    return out.slice(0, KEYWORD_RULES[group].max);
  };
  const contributionRaw = typeof raw?.contribution === "string" ? raw.contribution : Array.isArray(raw?.contribution) ? String((raw!.contribution as unknown[])[0] ?? "") : "";
  return {
    domain: fix(raw?.domain, "domain"),
    method: fix(raw?.method, "method"),
    users: fix(raw?.users, "users"),
    contribution: canonicalTag(contributionRaw, "contribution") ?? "",
  };
}

export function paperTags(pcs: PcsKeywords | undefined): MatchTag[] {
  if (!pcs) return [];
  const tags: MatchTag[] = [];
  const push = (tag: string, group: KeywordGroup) => {
    if (tag && !tags.some((t) => t.tag === tag)) tags.push({ tag, group, weight: tagWeight(tag) });
  };
  pcs.domain.forEach((t) => push(t, "domain"));
  pcs.method.forEach((t) => push(t, "method"));
  pcs.users.forEach((t) => push(t, "users"));
  if (pcs.contribution) push(pcs.contribution, "contribution");
  return tags;
}

/** Canonicalize a persona's self-rated tags; unknown tags are dropped. */
export function normalizeExpertise(tags: { tag: string; level: number }[] | undefined): { tag: string; level: number }[] {
  const out: { tag: string; level: number }[] = [];
  for (const t of tags ?? []) {
    const c = canonicalTag(String(t.tag));
    if (!c || !groupOf(c)) continue;
    const level = Math.min(4, Math.max(1, Math.round(Number(t.level) || 1)));
    const existing = out.find((o) => o.tag === c);
    if (existing) existing.level = Math.max(existing.level, level);
    else out.push({ tag: c, level });
  }
  return out;
}

export function computeMatching(pcs: PcsKeywords | undefined, personas: Persona[]): Matching {
  const tags = paperTags(pcs);
  const totalWeight = tags.reduce((s, t) => s + t.weight, 0) || 1;
  const levelOf = (p: Persona, tag: string) => p.expertiseTags?.find((e) => e.tag === tag)?.level ?? 0;

  const scores = personas.map((p) => ({
    personaId: p.id,
    score: tags.reduce((s, t) => s + t.weight * (levelOf(p, t.tag) / 4), 0) / totalWeight,
  }));

  const counted = personas.filter((p) => p.counted !== false);
  const coverage = tags.map((t) => {
    let best = 0;
    let by: string | null = null;
    for (const p of counted) {
      const l = levelOf(p, t.tag);
      if (l > best) {
        best = l;
        by = p.id;
      }
    }
    return { ...t, best, by };
  });
  const teamCovers = coverage.filter((c) => c.best >= 3).length;
  return { tags, scores, coverage, teamCovers, total: tags.length };
}

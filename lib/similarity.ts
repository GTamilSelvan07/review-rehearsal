/** Normalize a title for comparison: lowercase, strip accents and punctuation. */
export function normalizeTitle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sørensen–Dice similarity over character bigrams (0..1). */
export function diceSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };
  const ma = bigrams(na);
  const mb = bigrams(nb);
  let overlap = 0;
  let sizeA = 0;
  let sizeB = 0;
  for (const v of ma.values()) sizeA += v;
  for (const v of mb.values()) sizeB += v;
  for (const [bg, ca] of ma) {
    const cb = mb.get(bg);
    if (cb) overlap += Math.min(ca, cb);
  }
  return (2 * overlap) / (sizeA + sizeB);
}

/** Normalize free text for verbatim-quote checking. */
export function normalizeProse(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[-‐-―]/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if `quote` appears (near-)verbatim inside `text`. */
export function quoteAppearsIn(quote: string, text: string): boolean {
  const q = normalizeProse(quote);
  if (q.length < 12) return true; // too short to check meaningfully
  return normalizeProse(text).includes(q);
}

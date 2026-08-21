import type { RefEntry } from "./types";

/** Parse a .bib file into structured entries. Tolerant of nested braces. */
export function parseBibtex(bib: string): RefEntry[] {
  const entries: RefEntry[] = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bib)) !== null) {
    const type = m[1].toLowerCase();
    if (type === "comment" || type === "preamble" || type === "string") continue;
    const key = m[2];
    // Find the balanced closing brace for this entry.
    let depth = 1;
    let i = re.lastIndex;
    while (i < bib.length && depth > 0) {
      if (bib[i] === "{") depth++;
      else if (bib[i] === "}") depth--;
      i++;
    }
    const body = bib.slice(re.lastIndex, i - 1);
    const fields = parseFields(body);
    const authorsRaw = fields["author"] ?? "";
    entries.push({
      key,
      raw: `@${type}{${key}, ...}`,
      title: cleanValue(fields["title"] ?? ""),
      authors: authorsRaw
        ? authorsRaw.split(/\s+and\s+/i).map((a) => cleanValue(a.trim())).filter(Boolean)
        : [],
      year: fields["year"] ? parseInt(fields["year"].replace(/\D/g, ""), 10) || null : null,
      venue: cleanValue(fields["journal"] ?? fields["booktitle"] ?? fields["publisher"] ?? ""),
      doi: fields["doi"] ? fields["doi"].replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim() : null,
    });
    re.lastIndex = i;
  }
  return entries.filter((e) => e.title);
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    const eq = body.indexOf("=", i);
    if (eq === -1) break;
    const name = body.slice(i, eq).replace(/[,\s]/g, "").toLowerCase();
    let j = eq + 1;
    while (j < body.length && /\s/.test(body[j])) j++;
    let value = "";
    if (body[j] === "{") {
      let depth = 1;
      let k = j + 1;
      while (k < body.length && depth > 0) {
        if (body[k] === "{") depth++;
        else if (body[k] === "}") depth--;
        if (depth > 0) value += body[k];
        k++;
      }
      i = k;
    } else if (body[j] === '"') {
      let k = j + 1;
      while (k < body.length && body[k] !== '"') {
        value += body[k];
        k++;
      }
      i = k + 1;
    } else {
      let k = j;
      while (k < body.length && body[k] !== "," && body[k] !== "\n") {
        value += body[k];
        k++;
      }
      i = k;
    }
    if (name) fields[name] = value.trim();
    const comma = body.indexOf(",", i);
    if (comma === -1) break;
    i = comma + 1;
  }
  return fields;
}

function cleanValue(s: string): string {
  return s
    .replace(/[{}]/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a corrected BibTeX entry from a matched database record. */
export function makeBibtex(opts: {
  key: string;
  title: string;
  year: number | null;
  venue: string | null;
  doi: string | null;
  authors?: string[];
}): string {
  const lines = [
    `@inproceedings{${opts.key},`,
    `  title = {${opts.title}},`,
  ];
  if (opts.authors && opts.authors.length) lines.push(`  author = {${opts.authors.join(" and ")}},`);
  if (opts.year) lines.push(`  year = {${opts.year}},`);
  if (opts.venue) lines.push(`  booktitle = {${opts.venue}},`);
  if (opts.doi) lines.push(`  doi = {${opts.doi}},`);
  lines.push("}");
  return lines.join("\n");
}

/** Roughly convert LaTeX source into plain prose for quote matching. */
export function detex(tex: string): string {
  return tex
    .replace(/(?<!\\)%.*$/gm, "")
    .replace(/\\begin\{(figure|table|equation|algorithm)\*?\}[\s\S]*?\\end\{\1\*?\}/g, " ")
    .replace(/\\(cite|citep|citet|ref|autoref|label|includegraphics|input|bibliography|bibliographystyle|usepackage|documentclass)\*?(\[[^\]]*\])?\{[^}]*\}/g, " ")
    .replace(/\\(section|subsection|subsubsection|paragraph|title|author|caption)\*?\{([^}]*)\}/g, " $2 ")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, " ")
    .replace(/[{}$~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

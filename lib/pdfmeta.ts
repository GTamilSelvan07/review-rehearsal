// Reads a PDF's document-information fields (the "Author" field Word, LaTeX,
// and PDF exporters write) straight from the bytes — the anonymization leak
// the CHI checklist tells authors to check with pdfinfo. Works for the usual
// uncompressed Info dictionary and for XMP metadata; if the PDF packs its Info
// dictionary into a compressed object stream we report it as not readable.

export interface PdfMeta {
  readable: boolean;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
}

function decodeLiteral(raw: string): string {
  // Unescape PDF literal-string escapes; handle a UTF-16BE BOM.
  let s = raw.replace(/\\([nrtbf()\\])/g, (_, c) =>
    c === "n" ? "\n" : c === "r" ? "\r" : c === "t" ? "\t" : c === "b" ? "\b" : c === "f" ? "\f" : c
  );
  s = s.replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  if (s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < s.length; i += 2) out += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
    return out.trim();
  }
  return s.trim();
}

function decodeHex(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let s = "";
  for (let i = 0; i + 1 < clean.length; i += 2) s += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  return decodeLiteral(s);
}

function lastMatch(re: RegExp, text: string): RegExpExecArray | null {
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(text))) last = m;
  return last;
}

function infoField(text: string, name: string): string | undefined {
  // The last occurrence wins: incrementally updated PDFs append newer Info dicts.
  const lit = lastMatch(new RegExp(`/${name}\\s*\\(((?:\\\\.|[^\\\\)])*)\\)`), text);
  const hex = lastMatch(new RegExp(`/${name}\\s*<([0-9A-Fa-f\\s]+)>`), text);
  const pick = lit && hex ? (lit.index > hex.index ? lit : hex) : lit ?? hex;
  if (!pick) return undefined;
  const v = pick === lit ? decodeLiteral(pick[1]) : decodeHex(pick[1]);
  return v || undefined;
}

function xmpField(text: string, tag: string): string | undefined {
  const m = lastMatch(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`), text);
  if (!m) return undefined;
  const inner = m[1];
  const li = inner.match(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g);
  const v = (li ? li.map((x) => x.replace(/<[^>]+>/g, "")).join("; ") : inner.replace(/<[^>]+>/g, "")).trim();
  return v || undefined;
}

export function extractPdfMeta(buf: Buffer): PdfMeta {
  const text = buf.toString("latin1");
  const hasInfo = /\/Producer|\/Creator|\/Author|\/Title|<x:xmpmeta|<rdf:RDF/.test(text);
  const meta: PdfMeta = { readable: hasInfo };
  const field = (name: string, xmp: string[]) => {
    const v = infoField(text, name) ?? xmp.map((t) => xmpField(text, t)).find(Boolean);
    return v && v.length <= 500 ? v : undefined;
  };
  meta.author = field("Author", ["dc:creator"]);
  meta.title = field("Title", ["dc:title"]);
  meta.subject = field("Subject", ["dc:description"]);
  meta.keywords = field("Keywords", ["pdf:Keywords"]);
  meta.creator = field("Creator", ["xmp:CreatorTool"]);
  meta.producer = field("Producer", ["pdf:Producer"]);
  return meta;
}

/** True when the Author field is empty or an obvious anonymization placeholder. */
export function authorLooksAnonymous(author: string | undefined): boolean {
  if (!author) return true;
  return /^(anonymous|anonymised|anonymized|anon\.?|author\(s\)|authors?|unknown|blinded|removed|n\/?a|-+)\b/i.test(author.trim()) || /anonym/i.test(author);
}

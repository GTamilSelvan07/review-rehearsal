# Review Rehearsal

Rehearse the review before the review. Upload a CHI submission — PDF, or LaTeX
source (`.tex` + `.bib`), or a project `.zip` — and get a faithful simulation of
the **CHI 2027** review pipeline:

1. **Reference audit** — every bibliography entry verified against **Crossref, OpenAlex, Semantic Scholar, and DBLP** (no LLM involved: an entry is *verified*, *mismatched*, or *not found* based only on database records; corrected BibTeX offered for mismatches)
2. **Desk-reject screen** — the same check list as CHI 2027's desk-reject support tool (RV-1 identity, RV-2 links, RV-3 masked references, RV-4 template, RV-5 not-a-paper, RV-6 reference integrity, RV-7 language, RV-8 build defects, RV-10 hidden text / prompt injection, RV-11 scope), rendered as a report card with evidence, reasoning, and a deterministic-vs-model-judged label on every finding. Blocking flags stop the run, as a confirmed flag would in the real process — and, as the real AC can, you can override a wrong flag and continue.
3. **ADR assessment** — a simulated *human* AC reading (CHI 2027 deploys no AI rubric tool for ADR): contribution type first, then reviewability lenses, then the five ACM criteria and the four ADR flags, with a verbatim quote behind every judgment
4. **Four independent expert reviews** — personas matched to the paper's expertise descriptors, each writing blind to the others via a *draft → fact-check → sharpen* loop, with verbatim-quote anchors verified in code, plus an adversarial advisory fifth reader
5. **1AC meta-review & decision track** — CHI 2027's real threshold rules (3+ at A/ARR → Minor Revisions)
6. **Strengthening guide** — every finding re-voiced as concrete author actions with impact/effort tags, plus a reading list containing **only papers returned by scholarly databases** (never model-invented citations)

The `/process` page explains what CHI 2027 actually automates (completeness check, reviewer matching, desk-reject support) and what it leaves to people — summarized from the Papers Chairs' post *AI-assisted tools in the CHI 2027 papers review process* (29 Aug 2026).

Built with Next.js (App Router) + Gemini 3.7 Flash, deployed on Vercel.

> **This is an unofficial simulation** for authors preparing a submission. It is
> not affiliated with ACM/SIGCHI, it does not predict real outcomes, and it must
> not be used to produce actual CHI reviews (CHI prohibits AI-generated
> reviewing). Uploaded papers are deleted within 24 hours by a daily cron and
> are never used for training.

## Deploy (about 5 minutes)

1. **Fork/clone this repo and import it in Vercel** (vercel.com → Add New →
   Project → import the GitHub repo). Framework preset: Next.js, no build
   changes needed.
2. **Attach a Blob store**: project → Storage → Create Database → **Blob** →
   connect. This auto-sets `BLOB_READ_WRITE_TOKEN`.
3. **Add environment variables** (project → Settings → Environment Variables):
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey) (required)
   - `CONTACT_EMAIL` — your email, sent as the polite `mailto` to Crossref/OpenAlex (recommended)
   - `CRON_SECRET` — any random string, protects the cleanup cron (recommended)
4. **Deploy.** The daily cleanup cron (`vercel.json`) deletes uploaded blobs
   older than 24 hours.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and BLOB_READ_WRITE_TOKEN
npm run dev
```

The Blob token for local dev comes from the Vercel dashboard (Storage → your
Blob store → `.env.local` snippet). Uploads go browser → Blob directly, so the
4.5 MB serverless body limit never applies.

## Architecture

```
Browser ──(client upload)──▶ Vercel Blob
   │
   ▼  POST /api/stage  (one call per stage, client-orchestrated, maxDuration 300)
Next.js route ──▶ Gemini API (gemini-3.7-flash, Files API for PDFs, JSON output)
              ──▶ Crossref / OpenAlex / Semantic Scholar / DBLP (reference audit, reading list)
```

- `lib/chi2027.ts` — the CHI 2027 process encoded as data (desk-reject checks,
  criteria, ADR flags and reviewability lenses, contribution types, recommendation
  scale, decision thresholds). Another venue would be a new data module.
- `lib/stages.ts` — the eight pipeline stages and their prompts, including the
  review realism mechanisms (quote verification, criticism fact-checking, no
  credit for restating the authors' limitations, calibrated score anchors).
- `lib/screen.ts` — deterministic desk-reject scans (masked references, build
  defects, AI-directed hidden text, reference integrity). A deterministic
  prompt-injection hit always overrides the model — the model is what an
  injection targets.
- `lib/refcheck.ts` — database-only reference verification; an LLM never decides
  whether a citation exists.
- Rate limit: 4 runs per hour per IP (per instance). Cost is roughly $0.55 per
  paper at Gemini 3.7 Flash introductory pricing.

## License

MIT

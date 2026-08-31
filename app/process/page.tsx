"use client";

import { useState } from "react";
import { TopBar, Ribbon } from "@/components/chrome";
import { DESK_REJECT_CHECKS } from "@/lib/chi2027";

interface FlowStage {
  id: string;
  badge: string;
  title: string;
  sub: string;
  gate?: boolean;
  pct?: string;
  detail: React.ReactNode;
  dropNote?: string;
}

const AI_POST_URL =
  "https://chi2027.acm.org/2026/08/29/ai-assisted-tools-in-the-chi-2027-papers-review-process-what-they-do-what-they-do-not-do-and-how-humans-remain-responsible/";

const STAGES: FlowStage[] = [
  {
    id: "submit",
    badge: "1",
    title: "Submission & completeness check",
    sub: "September 10, 2026 · anonymized, ACM single-column template · rule-based metadata check",
    detail: (
      <>
        <p>
          Authors submit an anonymized paper in the ACM single-column manuscript format via PCS. There is no
          subcommittee to choose in CHI 2027 — instead authors tag the reviewer expertise the paper needs (PCS
          keywords) and name four review-responsibility slots from the author list. Length should be proportionate to
          the contribution: 5,000–8,000 words are encouraged, under 5,000 is a short paper, and above 12,000 the length
          must be justified or the paper is desk-rejectable.
        </p>
        <p>
          Anonymization is strict: no author names, no identifying acknowledgments or links, and your own prior work
          cited in the third person — never masked as “Anonymous”.
        </p>
        <p>
          <strong>Tool 1 — completeness check.</strong> A deterministic, rule-based check of the PCS metadata (no
          model, no manuscript reading): are the review-responsibility slots declared, do named reviewer-authors have
          valid ORCIDs and DBLP identifiers, and are there enough expertise descriptors for matching? Authors get a
          report and a window to correct it before screening begins.
        </p>
      </>
    ),
  },
  {
    id: "desk",
    badge: "2",
    title: "Desk-reject screening",
    sub: "Tool 3 surfaces candidates with evidence → AC inspects → SC confirms",
    gate: true,
    dropNote: "Confirmed violations — non-anonymous, off-template, not a paper, out of scope, duplicate — are removed",
    detail: (
      <>
        <p>
          The only AI-assisted tool in CHI 2027 that reads manuscripts. It surfaces <em>candidate</em> submissions for
          human inspection against the desk-reject grounds — incomplete, non-anonymous, wrong template, undeclared
          concurrent submission, out of scope, unreviewable, or in breach of ACM policy — as a report card with
          evidence, reasoning, and a note of whether each finding is deterministic or model-confirmed.{" "}
          <strong>It issues no decisions.</strong>
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
          {DESK_REJECT_CHECKS.map((c) => (
            <span key={c.id} className={`pill ${c.severity === "hard" ? "slate" : "warn"}`} title={c.prompt}>
              {c.id} · {c.name}
            </span>
          ))}
          <span className="pill neutral" title="Needs the whole PCS corpus — not run by Review Rehearsal">
            RV-9 · Duplicates
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--soft)" }}>
          Amber checks are discretionary and never halt a submission on their own — in CHI 2026, four accepted papers
          carried masked references and seven carried compilation defects.
        </p>
        <p>
          <strong>The human chain.</strong> Tool surfaces a candidate → the AC reads the paper and the report and forms
          an independent judgment → the SC confirms before any desk rejection is issued. Human disagreement overrides
          the flag. Desk rejection can happen at any point in the process, not only at the start.
        </p>
        <p>
          <strong>How well it works</strong> (tested on the 6,286 CHI 2026 submissions): all 19 papers flagged for a
          two-column layout were real desk-rejects; 26 of 71 anonymization breaches were caught with no false positives
          on 250 accepted papers — the misses were first-person self-citations, figures, and supplementary files; the
          scope check cleared every one of 601 accepted papers but catches only about a fifth of borderline cases, by
          design. Hidden text aimed at AI readers is detected from the PDF&apos;s rendering instructions and scrubbed
          from every other check — zero injection attacks were found in the 2026 corpus.
        </p>
        <p style={{ fontSize: 12.5, color: "var(--soft)" }}>
          Review Rehearsal runs the same check list on your paper, labels each finding deterministic or model-judged,
          and lets you override a flag the way an AC would.
        </p>
      </>
    ),
  },
  {
    id: "adr",
    badge: "3",
    title: "Assisted Desk Reject (ADR)",
    sub: "A human AC judgment → SC + Papers Chairs confirm · no AI rubric tool is used",
    gate: true,
    pct: "50–60% advance",
    dropNote: "Papers without a realistic path to acceptance stop here, with a written AC note (~Oct 25)",
    detail: (
      <>
        <p>
          New for CHI 2027. ADR is ACM&apos;s term for a rejection on the judgment of the editor or sub-editor — here
          the AC and SC — that a paper is out of scope or so far from acceptable that external reviews are unnecessary.
          The “Assisted” refers to the AC and SC assisting the Papers Chairs, <strong>not to any AI</strong>.
        </p>
        <p>
          The AC reads the paper against a method-agnostic rubric built on the five ACM criteria —{" "}
          <strong>Originality, Correctness, Novelty, Importance, Clarity of Exposition</strong> — and four flags:
          grossly insufficient literature review, methodological detail, or data to support the claims, or a
          disproportionately small HCI contribution for the length. The SC and Papers Chairs confirm every ADR.
        </p>
        <p>
          <strong>The rubric tool that was not deployed.</strong> An AI-assisted rubric report (Tool 4) was built and
          tested for this stage, but the Papers Chairs decided not to use it in CHI 2027 — there was no time for public
          community testing before the deadline. Its design still tells you what the rubric values: reason about the
          contribution type <em>before</em> applying validation expectations (an artifact, a qualitative study, and a
          controlled experiment warrant different ones); check reviewability — enough grounding to assess, claims
          supported, self-contained, HCI literature engaged, length justified; and never score originality or novelty
          automatically, because that proved unreliable. Its designers chose to under-flag rather than make quality
          accusations the evidence could not support.
        </p>
        <p>
          Only papers with a realistic path to acceptance — a working target of 50–60% of submissions — advance.
          Full peer review is treated as a scarce community resource.
        </p>
        <p style={{ fontSize: 12.5, color: "var(--soft)" }}>
          Review Rehearsal simulates the AC&apos;s reading using those design principles: contribution type first,
          then reviewability, then the rubric and flags, with a verbatim quote behind every judgment.
        </p>
      </>
    ),
  },
  {
    id: "review",
    badge: "4",
    title: "Full peer review",
    sub: "1AC + four external reviewers · matching tool suggests, ACs decide",
    detail: (
      <>
        <p>
          <strong>Tool 2 — matching.</strong> A matching system suggests ACs and reviewers by comparing the paper&apos;s
          author-supplied expertise descriptors with reviewer profiles, weighting rarer descriptors higher and
          respecting conflicts and workload. It reads no manuscript and assigns no one: the AC accepts, rejects, or
          replaces every suggestion and must ensure the team covers both the topic and the methods. Simulations found
          about eight descriptors per profile gives effective matching.
        </p>
        <p>
          The descriptors come from a fixed taxonomy, framed as “a reviewer judging my work should have expertise
          related to…”: <strong>Domain</strong> (2–6), <strong>Method / Approach</strong> (1–2),{" "}
          <strong>Users</strong> (0–2, only if a specific population is the focus), and exactly one{" "}
          <strong>Primary Contribution</strong>. They tag the expertise needed to assess the paper, not the paper
          itself, and reviewers self-rate against the same list. Review Rehearsal suggests your keywords from that
          taxonomy and builds its reviewer panel by matching self-rated expertise against them.
        </p>
        <p>
          Each reviewer independently files a structured form: a contribution statement, an expertise self-rating
          (1–4), written assessments of the five ACM criteria, an itemized list of required revisions, and a
          recommendation:
        </p>
        <div className="flow-fan">
          <div className="flow-reviewer"><strong>R1</strong>Domain expert</div>
          <div className="flow-reviewer"><strong>R2</strong>Methods expert</div>
          <div className="flow-reviewer"><strong>R3</strong>Broad HCI senior</div>
          <div className="flow-reviewer"><strong>R4</strong>Applications lens</div>
          <div className="flow-reviewer adv"><strong>R5*</strong>Devil&apos;s advocate</div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--soft)" }}>
          * R5 is Review Rehearsal&apos;s addition — an adversarial advisory reader that does not exist in the real
          process and is excluded from decision thresholds.
        </p>
        <p>
          The five-point recommendation scale: <strong>A</strong> (Accept with Minor Revisions), <strong>ARR</strong>{" "}
          (A or R&amp;R), <strong>RR</strong> (Revise &amp; Resubmit), <strong>RRX</strong> (Reject or R&amp;R),{" "}
          <strong>X</strong> (Reject).
        </p>
        <p style={{ fontSize: 12.5, color: "var(--soft)" }}>
          No AI tool reads your paper at this stage. ACM policy lets reviewers use off-the-shelf LLMs only where
          confidentiality is preserved; CHI&apos;s answer to that is a tailored, safeguarded screening tool rather than
          reviewers pasting papers into chatbots.
        </p>
      </>
    ),
  },
  {
    id: "discussion",
    badge: "5",
    title: "PCS discussion & meta-review",
    sub: "AC-led discussion resolves disagreements; the 1AC synthesizes",
    detail: (
      <>
        <p>
          Once reviews arrive, the AC leads a discussion with the reviewers on PCS to resolve disagreements and
          clarify concerns — synchronous, asynchronous, or hybrid. Subcommunity Chairs (SCs), each overseeing 10–15
          ACs, monitor review quality, consistency, and fairness. The single Primary AC then writes a meta-review
          synthesizing the external reviews and the discussion into a first-round outcome.
        </p>
      </>
    ),
  },
];

const BRANCHES = [
  {
    cls: "b-minor",
    title: "Minor Revisions",
    rule: "3+ reviews at A or ARR",
    text: "Likely acceptance. Authors get 4 weeks for tracked-change revisions plus an author response.",
  },
  {
    cls: "b-major",
    title: "Major Revisions",
    rule: "Majority positive, below the minor threshold",
    text: "4 weeks for substantive changes with tracked changes and a response. Final rejection remains possible in round 2.",
  },
  {
    cls: "b-reject",
    title: "Reject",
    rule: "AC recommends X",
    text: "The work is not ready for this year's CHI — which is not a judgment that it has no place at CHI at all.",
  },
];

const TOOLS = [
  {
    name: "Tool 1 · Completeness check",
    reads: "PCS metadata only",
    does: "Verifies review-responsibility slots, ORCID/DBLP identifiers, and enough keywords for matching. Rule-based; no model.",
    not: "Does not evaluate research quality, novelty, methods, or contribution.",
  },
  {
    name: "Tool 2 · Matching",
    reads: "Descriptors and reviewer profiles",
    does: "Suggests suitable ACs and reviewers, weighting rare expertise higher, respecting conflicts and workload.",
    not: "Does not read manuscripts, does not assign anyone — ACs accept, reject, or replace every suggestion.",
  },
  {
    name: "Tool 3 · Desk-reject support",
    reads: "The full manuscript",
    does: "Surfaces candidate violations (identity, links, masked refs, template, document type, references, language, build defects, duplicates, hidden text, scope) with evidence and reasoning.",
    not: "Does not reject, does not judge scientific soundness, cannot see figures or supplementary files, cannot check IRB compliance or concurrent submissions elsewhere.",
  },
  {
    name: "Tool 4 · ADR rubric report",
    reads: "— not deployed",
    does: "Built and tested, then withheld from CHI 2027 for lack of time for public community testing. Kept in the record for transparency.",
    not: "Produces nothing in this cycle. The ADR is a human AC judgment confirmed by the SC and Papers Chairs.",
  },
];

export default function ProcessPage() {
  const [open, setOpen] = useState<string | null>("desk");

  return (
    <>
      <TopBar />
      <Ribbon />
      <main className="shell">
        <div style={{ maxWidth: 760, margin: "0 auto 28px", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)" }}>
            How it really works
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4.5vw, 40px)", marginTop: 8 }}>The CHI 2027 review process</h1>
          <p style={{ fontSize: 15.5, color: "var(--soft)", marginTop: 10 }}>
            Every paper travels this pipeline. Click any stage to see what happens inside it, what is automated, and
            who decides — Review Rehearsal simulates each one. Based on the published CHI 2027 papers review process and
            the Papers Chairs&apos; account of its AI-assisted tools.
          </p>
        </div>

        <div className="flow">
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ display: "contents" }}>
              <div
                className={`flow-node ${s.gate ? "gate-node" : ""} ${open === s.id ? "open" : ""}`}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <button
                  className="flow-node-head"
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                  aria-expanded={open === s.id}
                >
                  <span className="flow-badge">{s.badge}</span>
                  <span>
                    <span className="flow-title">
                      {s.title}
                      {s.pct && <span className="flow-pct">{s.pct}</span>}
                    </span>
                    <span className="flow-sub" style={{ display: "block" }}>{s.sub}</span>
                  </span>
                  <svg className="flow-caret" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
                <div className="flow-detail">
                  <div className="flow-detail-inner">{s.detail}</div>
                </div>
              </div>
              {i < STAGES.length && (
                <div>
                  <div className={`flow-link ${s.dropNote ? "drop-link" : ""}`} />
                  {s.dropNote && (
                    <div className="flow-drop">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M8 3v7" />
                        <path d="M4.5 7.5L8 11l3.5-3.5" />
                      </svg>
                      {s.dropNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flow-branches">
            {BRANCHES.map((b, i) => (
              <div key={b.title} className={`flow-branch ${b.cls}`} style={{ animationDelay: `${(STAGES.length + i) * 0.12}s` }}>
                <div className="flow-branch-title">{b.title}</div>
                <p style={{ fontWeight: 700 }}>{b.rule}</p>
                <p>{b.text}</p>
              </div>
            ))}
          </div>

          <div className="flow-link" style={{ marginTop: 12 }} />
          <div className="flow-node" style={{ animationDelay: `${(STAGES.length + 3) * 0.12}s` }}>
            <div className="flow-node-head" style={{ cursor: "default" }}>
              <span className="flow-badge">6</span>
              <span>
                <span className="flow-title">Round 2 — binary outcome</span>
                <span className="flow-sub" style={{ display: "block" }}>
                  Revised papers return to the same AC and reviewers with color-highlighted changes and an author
                  response. Round 2 produces Accept or Reject — no further major-revision rounds exist.
                </span>
              </span>
            </div>
          </div>
        </div>

        <section style={{ maxWidth: 880, margin: "44px auto 0" }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)" }}>
              Assistance is not authority
            </div>
            <h2 style={{ fontSize: 26, marginTop: 6 }}>What the AI tools do — and what they don&apos;t</h2>
          </div>
          <div className="principle" style={{ marginBottom: 18 }}>
            “No AI system decides whether a CHI 2027 paper is accepted or rejected. … Tools can check, search, flag,
            suggest, produce reports. People decide.” — CHI 2027 Papers Chairs
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {TOOLS.map((t) => (
              <div key={t.name} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--soft)", margin: "2px 0 8px" }}>Reads: {t.reads}</div>
                <p style={{ fontSize: 13.5 }}>{t.does}</p>
                <p style={{ fontSize: 13, color: "var(--pen)", marginTop: 6 }}>{t.not}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: "18px 22px", marginTop: 18 }}>
            <div className="cardlbl" style={{ marginBottom: 8 }}>How Review Rehearsal differs — on purpose</div>
            <ul className="tight" style={{ fontSize: 14 }}>
              <li>
                A model plays every role here — screener, AC, four reviewers, the adversarial fifth, and the 1AC. CHI
                does that for none of them. This is a rehearsal for authors, not a review, and its output must never be
                submitted to PCS as one.
              </li>
              <li>
                Where the real process is deterministic, so is this one: reference integrity comes from Crossref,
                OpenAlex, Semantic Scholar, and DBLP; masked references, build defects, and AI-directed text are found
                by pattern scans; decision tracks are computed from the threshold rules in code. The model never
                decides whether a citation exists.
              </li>
              <li>
                Every flag carries a verbatim quote, and both gates can be overridden — the same “human disagreement
                overrides the flag” rule the real AC works under. A model-generated concern is not a finding of fact.
              </li>
              <li>
                Like CHI&apos;s own tools, nothing you upload trains a model; unlike a published paper, it is deleted
                within 24 hours. CHI&apos;s advice applies here too: do not submit content you would not be comfortable
                seeing processed by AI once published.
              </li>
            </ul>
          </div>
        </section>

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <a className="btn primary" href="/" style={{ textDecoration: "none" }}>
            Rehearse this pipeline with your paper
          </a>
        </div>

        <p className="footer-note">
          Summarized from the published CHI 2027 papers review process and the Papers Chairs&apos; post{" "}
          <a href={AI_POST_URL} target="_blank" rel="noreferrer">
            “AI-assisted tools in the CHI 2027 papers review process”
          </a>{" "}
          (29 Aug 2026). Review Rehearsal is an unofficial author-side simulation, not affiliated with ACM or SIGCHI.
        </p>
      </main>
    </>
  );
}

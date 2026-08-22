"use client";

import { useState } from "react";
import { TopBar, Ribbon } from "@/components/chrome";

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

const STAGES: FlowStage[] = [
  {
    id: "submit",
    badge: "1",
    title: "Submission",
    sub: "September 10, 2026 · anonymized, ACM template",
    detail: (
      <>
        <p>
          Authors submit an anonymized paper in the ACM single-column manuscript format via PCS, declaring the
          best-fitting subcommunity. Length should be proportionate to the contribution.
        </p>
        <p>
          Anonymization is strict: no author names, no identifying acknowledgments or links, and your own prior work
          cited in the third person.
        </p>
      </>
    ),
  },
  {
    id: "desk",
    badge: "2",
    title: "Desk-reject screening",
    sub: "Papers Chairs · automatic flagging + manual AC/SC checks",
    gate: true,
    dropNote: "Incomplete, non-anonymous, off-template, or out-of-scope papers are removed",
    detail: (
      <>
        <p>
          Before anyone reviews the science, papers are screened for mechanical violations: broken anonymization,
          placeholder or incomplete content, wrong template, undeclared concurrent submissions, missing HCI framing,
          non-English text, or excessive length without justification.
        </p>
        <p>Desk rejection can happen at any point in the process, not only at the start.</p>
      </>
    ),
  },
  {
    id: "adr",
    badge: "3",
    title: "Assisted Desk Reject (ADR)",
    sub: "AI-assisted rubric report → AC decides → SC + Papers Chairs confirm",
    gate: true,
    pct: "50–60% advance",
    dropNote: "Papers without a realistic path to acceptance stop here, with a written AC meta-review (~Oct 25)",
    detail: (
      <>
        <p>
          New for CHI 2027. An automated tool produces a preliminary report against a method-agnostic rubric built on
          the five ACM criteria — <strong>Originality, Correctness, Novelty, Importance, Clarity of Exposition</strong>{" "}
          — focused on whether claims align with the evidence supporting them.
        </p>
        <p>
          The AC reads the paper and the report independently and decides; the Subcommunity Chair and Papers Chairs
          confirm every ADR outcome. Flags include: grossly insufficient literature review, methodological detail,
          or data to support claims — or a disproportionately small HCI contribution for the length.
        </p>
        <p>
          Only papers with a realistic path to acceptance — a working target of 50–60% of submissions — advance to
          full review. Full peer review is treated as a scarce community resource.
        </p>
      </>
    ),
  },
  {
    id: "review",
    badge: "4",
    title: "Full peer review",
    sub: "1AC + four external reviewers, matched by expertise descriptors",
    detail: (
      <>
        <p>
          The AC selects at least four external reviewers, assisted by a matching system that compares paper
          descriptors with reviewer expertise. Each reviewer independently files a structured form: a contribution
          statement, an expertise self-rating (1–4), written assessments of the five ACM criteria, an itemized list
          of required revisions, and a recommendation:
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
          clarify concerns — synchronous, asynchronous, or hybrid, overseen by the Subcommunity Chairs. The 1AC then
          writes a meta-review synthesizing the external reviews and the discussion into a first-round outcome.
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

export default function ProcessPage() {
  const [open, setOpen] = useState<string | null>("adr");

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
            Every paper travels this pipeline. Click any stage to see what happens inside it — Review Rehearsal
            simulates each one. Based on the published CHI 2027 papers review process.
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

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <a className="btn primary" href="/" style={{ textDecoration: "none" }}>
            Rehearse this pipeline with your paper
          </a>
        </div>

        <p className="footer-note">
          Summarized from the published CHI 2027 papers review process (chi2027.acm.org). Review Rehearsal is an
          unofficial author-side simulation, not affiliated with ACM or SIGCHI.
        </p>
      </main>
    </>
  );
}

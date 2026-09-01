"use client";

import type { RunState, Review, RefVerdict, DeskRejectCheck, GateName, PaperInfo, Persona } from "@/lib/types";
import { DECISION_LABELS, RECOMMENDATION_SCALE, PCS_COMPLETENESS, WORD_THRESHOLD } from "@/lib/chi2027";
import { KEYWORD_FRAMING, KEYWORD_RULES, groupOf, type KeywordGroup } from "@/lib/keywords";
import {
  CHECKLIST_SECTIONS,
  CHECKLIST_LINKS,
  CHECKLIST_DISCLAIMER,
  KEY_DATES,
  WHATS_NEW,
  evaluateChecklist,
  lengthCategory,
  type AutoStatus,
} from "@/lib/checklist";
import { checklistMarkdown } from "@/lib/markdown";
import { useState } from "react";

export type OverrideHandler = (gate: GateName) => void;

// ------------------------------------------------------------ PCS keywords

export function PcsKeywordsView({ paper }: { paper: PaperInfo }) {
  const pcs = paper.pcs;
  if (!pcs) return null;
  const groups: [KeywordGroup, string[]][] = [
    ["domain", pcs.domain ?? []],
    ["method", pcs.method ?? []],
    ["users", pcs.users ?? []],
    ["contribution", pcs.contribution ? [pcs.contribution] : []],
  ];
  const text = groups.map(([g, list]) => `${KEYWORD_RULES[g].label}: ${list.join("; ") || "—"}`).join("\n");
  return (
    <div className="card" style={{ padding: "14px 18px", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="cardlbl">PCS keywords to enter</span>
        <span style={{ fontSize: 12.5, color: "var(--soft)", fontStyle: "italic" }}>“{KEYWORD_FRAMING}”</span>
        <button className="btn ghost small" style={{ marginLeft: "auto" }} onClick={() => navigator.clipboard.writeText(text)}>
          Copy for PCS
        </button>
      </div>
      {groups.map(([g, list]) => {
        const rule = KEYWORD_RULES[g];
        const ok = list.length >= rule.min && list.length <= rule.max;
        return (
          <div key={g} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ minWidth: 170, fontSize: 12.5, fontWeight: 700, color: ok ? "var(--soft)" : "var(--pen)" }}>
              {rule.label}{" "}
              <span className="mono" style={{ fontWeight: 500 }}>
                {list.length}/{rule.max}
              </span>
            </span>
            {list.length === 0 && (
              <span style={{ fontSize: 12.5, color: "var(--soft)" }}>
                {g === "users" ? "none — no specific population is the focus" : "none chosen"}
              </span>
            )}
            {list.map((k) => (
              <span
                key={k}
                className="kw"
                title={groupOf(k) ? rule.hint : "Not an exact taxonomy name — pick the closest in PCS"}
                style={groupOf(k) ? undefined : { outline: "2px dashed var(--warn)" }}
              >
                {k}
              </span>
            ))}
          </div>
        );
      })}
      <p style={{ fontSize: 12, color: "var(--soft)", marginTop: 8 }}>
        Chosen from the official CHI 2027 taxonomy to tag the expertise a reviewer needs — not to describe the paper.
        The matching tool compares these with reviewers&apos; self-rated expertise, and rarer keywords weigh more.
      </p>
    </div>
  );
}

// -------------------------------------------------------- Reviewer matching

function levelOf(p: Persona, tag: string): number {
  return p.expertiseTags?.find((e) => e.tag === tag)?.level ?? 0;
}

export function MatchingView({ state }: { state: RunState }) {
  const m = state.matching;
  const personas = state.personas ?? [];
  if (!m || !personas.length || !m.tags.length) return null;
  const coverClass = m.teamCovers === m.total ? "pass" : m.teamCovers >= m.total - 1 ? "warn" : "fail";
  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="cardlbl">Reviewer matching</span>
        <span className={`pill ${coverClass}`}>
          Team covers {m.teamCovers} of {m.total} keywords at expertise ≥3
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 10 }}>
        Each reviewer self-rated their expertise over the PCS taxonomy, as real reviewers do. The score is the
        weighted overlap with your keywords — rarer keywords weigh more, as in CHI&apos;s matching tool. The AC, not
        the score, picks the panel; their duty is that the team collectively covers topic <em>and</em> method.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Your keyword</th>
              <th title="IDF-style weight: log of the group's vocabulary size">Weight</th>
              {personas.map((p) => (
                <th key={p.id} style={{ textAlign: "center" }} title={p.archetype}>
                  {p.id}
                  {p.counted === false ? "*" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.coverage.map((c) => (
              <tr key={c.tag}>
                <td>
                  <span className="tag effort" style={{ marginRight: 6 }}>{KEYWORD_RULES[c.group].label}</span>
                  {c.tag}
                  {c.best < 3 && (
                    <span className="pill warn" style={{ marginLeft: 8 }}>
                      uncovered
                    </span>
                  )}
                </td>
                <td className="mono" style={{ color: "var(--soft)" }}>{c.weight.toFixed(1)}</td>
                {personas.map((p) => {
                  const l = levelOf(p, c.tag);
                  return (
                    <td key={p.id} style={{ textAlign: "center" }}>
                      <span className={`lvl l${l}`} title={`${p.id} self-rated ${l || "no"} expertise`}>{l || "–"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td colSpan={2}>
                <strong>Match score</strong>
              </td>
              {personas.map((p) => (
                <td key={p.id} style={{ textAlign: "center" }}>
                  <strong style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round((p.match ?? 0) * 100)}%</strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "var(--soft)", marginTop: 8 }}>
        * R5 is advisory and does not count toward coverage. An uncovered keyword is where the real AC would replace a
        suggestion — and where your reviewers may lack the expertise to appreciate the work, so choose keywords that
        name expertise a reviewer can actually hold.
      </p>
    </div>
  );
}

function Segs({ score }: { score: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`seg ${i <= score ? "on" : ""}`} />
      ))}
    </span>
  );
}

function recClass(code: string): string {
  if (code === "A" || code === "ARR") return "pass";
  if (code === "RR" || code === "RRX") return "warn";
  return "fail";
}

function statusPill(status: RefVerdict["status"]) {
  switch (status) {
    case "verified":
      return <span className="pill pass">Verified</span>;
    case "mismatch":
      return <span className="pill warn">Mismatch</span>;
    case "not_found":
      return <span className="pill fail">Not found</span>;
    default:
      return <span className="pill neutral">Skipped</span>;
  }
}

// ------------------------------------------------------------- Reference audit

export function RefAuditView({ state }: { state: RunState }) {
  const audit = state.refAudit;
  const [filter, setFilter] = useState<string>("problems");
  if (!audit) return null;
  const s = audit.summary;
  const shown = audit.verdicts.filter((v) =>
    filter === "all" ? true : filter === "problems" ? v.status !== "verified" : v.status === filter
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--soft)", fontSize: 14 }}>
        Every bibliography entry checked against Crossref, OpenAlex, Semantic Scholar, and DBLP. Nothing here comes
        from the model — only from the databases.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          [s.verified, "Verified", "var(--pass)"],
          [s.mismatch, "Metadata mismatch", "var(--warn)"],
          [s.notFound, "Not found", "var(--pen)"],
          [s.skipped, "Skipped (lookup failed)", "var(--soft)"],
        ].map(([num, label, color]) => (
          <div key={String(label)} className="card" style={{ padding: "12px 20px", minWidth: 140 }}>
            <div className="stat-num" style={{ color: String(color) }}>
              {String(num)}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--soft)" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["problems", `Problems · ${s.mismatch + s.notFound + s.skipped}`],
          ["all", `All · ${s.total}`],
          ["verified", `Verified · ${s.verified}`],
        ].map(([key, label]) => (
          <button key={key} className={`tab ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Entry</th>
              <th>Status</th>
              <th>Matched record</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--pass)", fontWeight: 600 }}>
                  Nothing to show — every reference verified clean.
                </td>
              </tr>
            )}
            {shown.map((v) => (
              <tr key={v.key + v.title}>
                <td className="mono" style={{ fontSize: 12.5, color: "var(--soft)", whiteSpace: "nowrap" }}>
                  [{v.key}]
                </td>
                <td>{v.title}</td>
                <td>{statusPill(v.status)}</td>
                <td style={{ fontSize: 13, color: "var(--soft)" }}>
                  {v.matchedTitle ? (
                    <>
                      <div>
                        {v.source} · {v.matchedTitle}
                        {v.matchedYear ? ` (${v.matchedYear})` : ""}
                      </div>
                      {v.notes && <div style={{ color: "var(--warn)" }}>{v.notes}</div>}
                      {v.matchedDoi && (
                        <a href={`https://doi.org/${v.matchedDoi}`} target="_blank" rel="noreferrer">
                          doi.org/{v.matchedDoi}
                        </a>
                      )}
                      {v.correctedBibtex && (
                        <div style={{ marginTop: 6 }}>
                          <button
                            className="btn ghost small"
                            onClick={() => navigator.clipboard.writeText(v.correctedBibtex!)}
                          >
                            Copy corrected BibTeX
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: v.status === "not_found" ? "var(--pen)" : "var(--soft)" }}>{v.notes}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------------------- Desk-reject screen

function basisLabel(basis: DeskRejectCheck["basis"]): string {
  return basis === "deterministic" ? "Deterministic" : basis === "model" ? "Model-judged" : "Deterministic + model";
}

function CheckCard({ c }: { c: DeskRejectCheck }) {
  const pill =
    c.status === "pass" ? (
      <span className="pill pass">✓ Cleared</span>
    ) : c.status === "unverified" ? (
      <span className="pill neutral">? Unverified</span>
    ) : c.severity === "hard" ? (
      <span className="pill fail">✗ Flagged · blocking</span>
    ) : (
      <span className="pill warn">! Flagged · discretionary</span>
    );
  return (
    <div className={`rv-card ${c.status === "flag" ? (c.severity === "hard" ? "rv-block" : "rv-soft") : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--soft)", fontWeight: 700 }}>{c.id}</span>
        <strong style={{ fontSize: 15 }}>{c.name}</strong>
        {pill}
        <span className="tag effort" title="How this verdict was produced">{basisLabel(c.basis)}</span>
      </div>
      {c.reasoning && <p style={{ fontSize: 13.5, marginTop: 8 }}>{c.reasoning}</p>}
      {c.evidence && (
        <div className="quote" style={{ marginTop: 8 }}>
          <span className="rsec" style={{ display: "block", marginBottom: 2 }}>Evidence</span>
          {c.evidence}
        </div>
      )}
      <details className="rv-method">
        <summary>How this was checked</summary>
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 6 }}>{c.method}</p>
        {c.deterministicHits && c.deterministicHits.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div className="rsec">Deterministic scan hits · {c.deterministicHits.length}</div>
            <ul className="tight" style={{ fontSize: 12.5, color: "var(--soft)" }}>
              {c.deterministicHits.slice(0, 12).map((h, i) => (
                <li key={i} className="mono" style={{ fontSize: 12 }}>{h}</li>
              ))}
              {c.deterministicHits.length > 12 && <li>… {c.deterministicHits.length - 12} more</li>}
            </ul>
          </div>
        )}
      </details>
    </div>
  );
}

export function ScreeningView({ state, onOverride }: { state: RunState; onOverride?: OverrideHandler }) {
  const dr = state.deskReject;
  if (!dr) return null;
  const blocking = dr.checks.filter((c) => c.status === "flag" && c.severity === "hard");
  const discretionary = dr.checks.filter((c) => c.status === "flag" && c.severity === "soft");
  const unverified = dr.checks.filter((c) => c.status === "unverified");
  const cleared = dr.checks.filter((c) => c.status === "pass");
  const overridden = state.overrides?.includes("deskreject");
  const groups: [string, DeskRejectCheck[], string][] = [
    ["Flagged — blocking if confirmed", blocking, "var(--pen)"],
    ["Flagged — discretionary (never halts a submission on its own)", discretionary, "var(--warn)"],
    ["Unverified — the AC must look by hand", unverified, "var(--soft)"],
    ["Cleared", cleared, "var(--pass)"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={`banner ${dr.passed ? "good" : "bad"}`} style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: dr.passed ? "#1c5940" : "var(--pen)" }}>
            {dr.passed ? "Cleared the desk-reject screen" : "Surfaced for desk-reject inspection"}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--soft)", marginTop: 4, lineHeight: 1.55 }}>
            {dr.passed ? (
              <>
                No blocking check was flagged
                {discretionary.length ? ` — ${discretionary.length} discretionary finding${discretionary.length > 1 ? "s" : ""} below for you to fix anyway` : ""}
                {unverified.length ? `; ${unverified.length} check${unverified.length > 1 ? "s" : ""} could not be verified from the document` : ""}.
              </>
            ) : (
              <>
                {blocking.length} blocking check{blocking.length > 1 ? "s" : ""} flagged:{" "}
                <strong>{blocking.map((c) => `${c.id} ${c.name}`).join(", ")}</strong>. This is what the real CHI 2027 tool
                does — it surfaces a candidate with evidence and reasoning; it never rejects. The AC then reads the paper
                and this report, forms an independent judgment, and the Subcommunity Chair confirms before any decision
                reaches the authors. A confirmed flag ends the submission, which is why the rehearsal stopped here.
                {overridden && " You overrode this gate, as an AC would for a wrong flag, and the run continued."}
              </>
            )}
          </div>
          {!dr.passed && !overridden && onOverride && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn ghost small" onClick={() => onOverride("deskreject")}>
                The flag is wrong — override as the AC and continue to full review
              </button>
              <span style={{ fontSize: 12.5, color: "var(--soft)" }}>
                Use this when you know the finding is a false positive (e.g. a deliberately non-anonymized early draft).
              </span>
            </div>
          )}
        </div>
      </div>

      {groups.map(([label, items, color]) =>
        items.length ? (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="cardlbl" style={{ color }}>
              {label} · {items.length}
            </div>
            {items.map((c) => (
              <CheckCard key={c.id} c={c} />
            ))}
          </div>
        ) : null
      )}

      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="cardlbl" style={{ marginBottom: 8 }}>Checked in PCS, not here</div>
        <p style={{ fontSize: 13, color: "var(--soft)", marginBottom: 8 }}>
          The real screening also runs a completeness check on submission metadata and a duplicate-submission check
          (RV-9) across the whole cycle. This rehearsal only sees your manuscript, so confirm these yourself:
        </p>
        <ul className="tight" style={{ fontSize: 13.5 }}>
          {PCS_COMPLETENESS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ ADR view

function triPill(status: "pass" | "borderline" | "flag") {
  return (
    <span className={`pill ${status === "pass" ? "pass" : status === "borderline" ? "warn" : "fail"}`}>
      {status === "pass" ? "Pass" : status === "borderline" ? "Borderline" : "Flag"}
    </span>
  );
}

export function AdrView({ state, onOverride }: { state: RunState; onOverride?: OverrideHandler }) {
  const adr = state.adr;
  if (!adr) return null;
  const advance = adr.decision === "advance";
  const overridden = state.overrides?.includes("adr");
  const words = state.paper?.words ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={`banner ${advance ? "good" : "bad"}`} style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: advance ? "#1c5940" : "var(--pen)" }}>
            {advance ? "Advance to full review" : "Assisted Desk Reject"}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--soft)", marginTop: 4, lineHeight: 1.55 }}>
            Simulated AC judgment. In CHI 2027 the ADR is a <strong>human</strong> decision — no AI rubric tool is used;
            “Assisted” means the AC and SC assisting the Papers Chairs. The SC and Papers Chairs confirm every ADR, and
            50–60% of submissions advance.
            {overridden && " You overrode this gate and the run continued to full review."}
          </div>
          {!advance && !overridden && onOverride && (
            <div style={{ marginTop: 12 }}>
              <button className="btn ghost small" onClick={() => onOverride("adr")}>
                Override as the SC would — send it to full review anyway
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="cardlbl" style={{ marginBottom: 4 }}>Contribution type · tentative</div>
          <p style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 8 }}>
            Inferred before any quality judgment, with the premise visible — validation expectations depend on it.
          </p>
          {(adr.contributionTypes ?? []).map((t, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--panel)" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.type}</div>
              <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 2 }}>
                <em>Premise:</em> {t.premise}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <em>Appropriate validation:</em> {t.validationExpectation}
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="cardlbl" style={{ marginBottom: 4 }}>Reviewability · advisory</div>
          <p style={{ fontSize: 12.5, color: "var(--soft)", marginBottom: 8 }}>
            The lenses the CHI 2027 rubric tool was designed around. They inform the AC&apos;s reading; they are not
            decision rules. Body ≈ {words.toLocaleString()} words{" "}
            {words > WORD_THRESHOLD ? (
              <span style={{ color: "var(--pen)", fontWeight: 700 }}>— above the {WORD_THRESHOLD.toLocaleString()}-word threshold; the length must be justified</span>
            ) : (
              <span>(threshold {WORD_THRESHOLD.toLocaleString()})</span>
            )}
            .
          </p>
          {(adr.reviewability ?? []).map((r) => (
            <div key={r.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--panel)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {triPill(r.status)}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 2 }}>{r.rationale}</div>
                  {r.evidence && <div className="quote">“{r.evidence}”</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="cardlbl" style={{ marginBottom: 8 }}>ACM criteria rubric · 1–5</div>
          {adr.criteria.map((c) => (
            <div key={c.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--panel)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ minWidth: 150, fontSize: 14 }}>{c.name}</strong>
                <Segs score={c.score} />
                <span className="mono" style={{ fontSize: 12.5, color: "var(--soft)" }}>{c.score}/5</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 4 }}>{c.note}</div>
              {c.evidence && <div className="quote">“{c.evidence}”</div>}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="cardlbl" style={{ marginBottom: 8 }}>ADR flags · decision-driving</div>
          {adr.flags.map((f) => (
            <div key={f.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--panel)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {triPill(f.status)}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 2 }}>{f.rationale}</div>
                  {f.evidence && <div className="quote">“{f.evidence}”</div>}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div className="cardlbl" style={{ marginBottom: 6 }}>Simulated AC note to authors</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.55 }}>
              “{adr.acNote}”
            </p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--soft)", textAlign: "center" }}>
        A model-generated concern is not a finding of fact. Every flag above carries a verbatim quote so you can check
        it against your own paper — exactly what the AC would be asked to do.
      </p>
    </div>
  );
}

// ------------------------------------------------------------- Review room

function evidenceLabel(type: Review["majorIssues"][number]["evidenceType"] | undefined): string {
  if (!type) return "Evidence type unavailable";
  return type === "textual" ? "Text" : type === "table" ? "Table" : type === "figure" ? "Figure" : type === "database" ? "Database" : type === "inferred" ? "Inference" : "Unverified";
}

function issueVerification(m: Review["majorIssues"][number]) {
  if (m.factChecked === true || m.quoteVerified === true) return <span className="pill pass">✓ Evidence verified</span>;
  if (m.factChecked === false || m.quoteVerified === false) return <span className="pill warn">! Evidence needs checking</span>;
  return <span className="pill neutral">Evidence status unavailable</span>;
}

function ReviewCard({ r }: { r: Review }) {
  const rec = RECOMMENDATION_SCALE.find((x) => x.code === r.recommendation);
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="mono" style={{ fontSize: 12, color: "var(--soft)" }}>
          {r.personaId} · expertise {r.expertise}/4
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{r.archetype}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span className={`pill ${recClass(r.recommendation)}`}>
          {r.recommendation} — {rec?.label}
        </span>
        {r.counted === false && (
          <span className="pill navy" title="Advisory only — excluded from the decision thresholds">
            Adversarial · not counted
          </span>
        )}
      </div>
      <div>
        <div className="rsec">Summary</div>
        <p style={{ fontSize: 13.5 }}>{r.summary}</p>
      </div>
      <div>
        <div className="rsec">Major issues</div>
        <ul className="tight" style={{ fontSize: 13.5 }}>
          {r.majorIssues.map((m, i) => (
            <li key={i}>
              <strong>{m.title}</strong>{" "}
              <span className={`pill ${m.severity === "major" ? "fail" : m.severity === "moderate" ? "warn" : "neutral"}`}>
                {m.severity ?? "issue"}
              </span>{" "}
              {issueVerification(m)}
            </li>
          ))}
        </ul>
      </div>
      {r.sectionAudit && r.sectionAudit.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--soft)" }}>
          <span className="pill navy">
            Full scrutiny: {r.sectionAudit.reduce((n, s) => n + s.findings.length, 0)} findings across{" "}
            {r.sectionAudit.length} sections
          </span>
        </div>
      )}
      <div style={{ borderTop: "1px solid var(--panel)", paddingTop: 10, marginTop: "auto" }}>
        {r.criteria.map((c) => (
          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--soft)", padding: "2px 0" }}>
            <span>{c.name}</span>
            <strong style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{c.score}</strong>
          </div>
        ))}
      </div>
      <details className="review-full">
        <summary>Read full review</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, fontSize: 13.5 }}>
          <div>
            <div className="rsec">Contribution</div>
            <p>{r.contribution}</p>
          </div>
          {r.majorIssues.map((m, i) => (
            <div key={i}>
              <div className="rsec" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>Issue {i + 1} — {m.title}</span>
                <span className={`pill ${m.severity === "major" ? "fail" : m.severity === "moderate" ? "warn" : "neutral"}`}>
                  {m.severity ?? "severity unavailable"}
                </span>
                <span className="pill neutral">{evidenceLabel(m.evidenceType)}</span>
                <span className="pill neutral">{m.confidence ?? "confidence unavailable"} confidence</span>
                {issueVerification(m)}
              </div>
              <p>{m.argument}</p>
              {m.quote && (
                <div className="quote">
                  “{m.quote}” — {m.anchor}
                </div>
              )}
              <div style={{ display: "grid", gap: 6, marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--panel)" }}>
                {m.whyItMatters && <div><strong>Why it matters:</strong> {m.whyItMatters}</div>}
                {m.revision && <div><strong>Concrete revision:</strong> {m.revision}</div>}
              </div>
            </div>
          ))}
          {r.criteria.map((c) => (
            <div key={c.name}>
              <div className="rsec">{c.name} — {c.score}/5</div>
              <p>{c.assessment}</p>
            </div>
          ))}
          {r.minorIssues.length > 0 && (
            <div>
              <div className="rsec">Minor issues</div>
              <ul className="tight">{r.minorIssues.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {r.questions.length > 0 && (
            <div>
              <div className="rsec">Questions for the authors</div>
              <ul className="tight">{r.questions.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {r.revisions.length > 0 && (
            <div>
              <div className="rsec">Required revisions</div>
              <ul className="tight">{r.revisions.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
          {r.sectionAudit && r.sectionAudit.length > 0 && (
            <div>
              <div className="rsec">Section-by-section scrutiny</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {r.sectionAudit.map((sec) => (
                  <div key={sec.section} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>{sec.section}</div>
                    {sec.findings.map((f, i) => (
                      <div key={i} style={{ padding: "6px 0", borderTop: i > 0 ? "1px solid var(--panel)" : "none" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <span className={`pill ${f.severity === "major" ? "fail" : f.severity === "moderate" ? "warn" : "neutral"}`}>
                            {f.severity}
                          </span>
                          <span style={{ flex: 1, minWidth: 200 }}>{f.issue}</span>
                        </div>
                        {f.quote && (
                          <div className="quote">
                            “{f.quote}” — {f.anchor}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                          <span className="pill neutral">{evidenceLabel(f.evidenceType)}</span>
                          <span className="pill neutral">{f.confidence ?? "confidence unavailable"} confidence</span>
                          {f.factChecked === true || f.quoteVerified === true ? (
                            <span className="pill pass">✓ Evidence verified</span>
                          ) : (
                            <span className="pill warn">! Evidence needs checking</span>
                          )}
                        </div>
                        {f.whyItMatters && <div style={{ marginTop: 5 }}><strong>Why it matters:</strong> {f.whyItMatters}</div>}
                        {f.revision && <div style={{ marginTop: 5 }}><strong>Concrete revision:</strong> {f.revision}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="rsec">Comments to the committee</div>
            <p style={{ color: "var(--soft)" }}>{r.committeeComments}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

export function ReviewRoomView({ state }: { state: RunState }) {
  const reviews = state.reviews ?? [];
  const counted = reviews.filter((r) => r.counted !== false);
  const advisory = reviews.filter((r) => r.counted === false);
  const positive = counted.filter((r) => r.recommendation === "A" || r.recommendation === "ARR").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span className="cardlbl">Recommendation spread</span>
        {counted.map((r) => (
          <span key={r.personaId} className={`pill ${recClass(r.recommendation)}`}>
            {r.personaId} · {r.recommendation}
          </span>
        ))}
        {advisory.map((r) => (
          <span key={r.personaId} className="pill navy" title="Adversarial reviewer — advisory only, not counted toward the decision">
            {r.personaId} · {r.recommendation} (advisory)
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 600, color: positive >= 3 ? "var(--pass)" : "var(--soft)" }}>
          {positive} of {counted.length} at A/ARR {positive >= 3 ? "— meets the Minor Revisions threshold" : "— below the Minor Revisions threshold (3 needed)"}
        </span>
      </div>
      <MatchingView state={state} />
      <div className="review-grid">
        {reviews.map((r) => (
          <ReviewCard key={r.personaId} r={r} />
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--soft)", textAlign: "center" }}>
        Reviews are written independently — no reviewer saw another&apos;s review before the simulated discussion.
        R5 is a deliberately adversarial reader: its review is advisory and excluded from the decision thresholds, so
        the panel stays faithful to the real process while you still get the hardest possible critique.
      </p>
    </div>
  );
}

// -------------------------------------------------------- Decision + guide

export function GuideView({ state }: { state: RunState }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const meta = state.meta;
  const guide = state.guide;
  const total = guide?.actions.length ?? 0;
  const groups: ["track" | "criterion" | "polish", string, string][] = [
    ["track", "Changes your decision track", "var(--pen)"],
    ["criterion", "Strengthens a criterion", "var(--brand)"],
    ["polish", "Polish", "var(--soft)"],
  ];
  const toggle = (t: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {meta && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className={`pill ${meta.decision === "reject" ? "fail" : meta.decision === "major" ? "warn" : "pass"}`}>
              Simulated outcome · {DECISION_LABELS[meta.decision]}
            </span>
            <span style={{ fontSize: 13, color: "var(--soft)" }}>{meta.decisionRationale}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="cardlbl" style={{ marginBottom: 6 }}>1AC meta-review</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {meta.metaReview}
            </p>
          </div>
          {meta.discussion.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--brand)", fontSize: 13.5 }}>
                PCS discussion (simulated)
              </summary>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {meta.discussion.map((d, i) => (
                  <p key={i} style={{ fontSize: 13.5 }}>
                    <strong className="mono" style={{ fontSize: 12 }}>{d.speaker}:</strong> {d.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {guide && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 24 }}>Strengthening guide</h2>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--soft)" }}>
              {done.size} of {total} addressed
            </span>
          </div>
          {groups.map(([g, label, color]) => {
            const actions = guide.actions.filter((a) => a.group === g);
            if (!actions.length) return null;
            return (
              <div key={g} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="cardlbl" style={{ color }}>{label} · {actions.length}</div>
                {actions.map((a) => (
                  <label key={a.title} className="card" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={done.has(a.title)}
                      onChange={() => toggle(a.title)}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--pass)" }}
                    />
                    <div style={{ opacity: done.has(a.title) ? 0.55 : 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontSize: 13.5, color: "var(--soft)", marginTop: 3 }}>{a.detail}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span className="tag crit">{a.criterion}</span>
                        <span className="tag effort">{a.effort}</span>
                        <span className="tag anchor">{a.anchor}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            );
          })}
          {guide.reading.length > 0 && (
            <div className="card" style={{ padding: "18px 22px" }}>
              <div className="cardlbl">Verified reading list</div>
              <p style={{ fontSize: 12.5, color: "var(--soft)", margin: "6px 0 10px" }}>
                Every entry was returned by a scholarly database — real papers with live links. Nothing here is
                model-generated.
              </p>
              {guide.reading.map((r) => (
                <div key={r.title} style={{ padding: "10px 0", borderBottom: "1px solid var(--panel)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                    ) : (
                      r.title
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--soft)", marginTop: 2 }}>
                    {[r.venue, r.year, r.source].filter(Boolean).join(" · ")}{" "}
                    <span style={{ color: "var(--pass)", fontWeight: 700 }}>verified</span>
                  </div>
                  <button className="btn ghost small" style={{ marginTop: 6 }} onClick={() => navigator.clipboard.writeText(r.bibtex)}>
                    Copy BibTeX
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------ Submission checklist

function autoPill(s: AutoStatus) {
  if (s === "pass") return <span className="pill pass">✓ Verified from upload</span>;
  if (s === "flag") return <span className="pill fail">✗ Fix before submitting</span>;
  return <span className="pill neutral">? Check yourself</span>;
}

function fmtSize(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function ChecklistView({ state }: { state: RunState }) {
  const evaln = evaluateChecklist(state);
  const storageKey = `rr-checklist-${state.runId}`;
  const [done, setDone] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* storage unavailable — in-memory only */
      }
      return next;
    });

  const len = lengthCategory(state.paper?.words);
  const meta = state.pdfMeta;
  const c = evaln.counts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 22 }}>CHI 2027 paper submission checklist</h2>
          <button
            className="btn ghost small"
            style={{ marginLeft: "auto" }}
            onClick={() => navigator.clipboard.writeText(checklistMarkdown(state, done))}
          >
            Copy as Markdown
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <span className="pill pass">{c.pass} verified from your upload</span>
          <span className={`pill ${c.flag ? "fail" : "neutral"}`}>{c.flag} to fix</span>
          <span className="pill neutral">{c.unverified} to check yourself</span>
          <span className="pill navy">
            {[...done].filter((id) => !evaln.auto[id]).length} of {c.manual} manual items ticked
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 10, lineHeight: 1.55 }}>
          <strong>Read this first.</strong> {CHECKLIST_DISCLAIMER} It does not guarantee a valid submission, but it
          covers the vast majority of desk-reject grounds. Items marked <span className="ck-new">NEW 2027</span> changed
          from recent years.
        </p>
      </div>

      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="cardlbl" style={{ marginBottom: 8 }}>Verified from your upload</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 24px", fontSize: 13.5 }}>
          <div>
            <div className="rsec">Files</div>
            {state.files.map((f) => (
              <div key={f.name} className="mono" style={{ fontSize: 12.5 }}>
                {f.name} · {fmtSize(f.size)}
              </div>
            ))}
            <div style={{ color: "var(--soft)", marginTop: 2 }}>{state.kind === "pdf" ? "PDF" : "LaTeX source"} · {state.paper?.pages} pages</div>
          </div>
          <div>
            <div className="rsec">Length</div>
            <div>
              ≈{state.paper?.words.toLocaleString()} words →{" "}
              <strong style={{ color: len.status === "flag" ? "var(--pen)" : "var(--ink)" }}>{len.label}</strong>
            </div>
            <div style={{ color: "var(--soft)", fontSize: 12.5 }}>{len.note}</div>
          </div>
          <div>
            <div className="rsec">PDF metadata</div>
            {state.kind !== "pdf" ? (
              <div style={{ color: "var(--soft)" }}>LaTeX upload — compile and run <span className="mono">pdfinfo</span> on the PDF.</div>
            ) : !meta?.readable ? (
              <div style={{ color: "var(--soft)" }}>Not readable from this file — run <span className="mono">pdfinfo</span>.</div>
            ) : (
              <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Author: {meta.author ? <span style={{ color: evaln.auto["B2"]?.status === "flag" ? "var(--pen)" : "inherit", fontWeight: 700 }}>{meta.author}</span> : <em>empty</em>}
                <br />
                Title: {meta.title || <em>empty</em>}
                <br />
                Creator: {meta.creator || <em>—</em>} · Producer: {meta.producer || <em>—</em>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {WHATS_NEW.map((w) => (
          <div key={w.title} className="card" style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span className="ck-new">NEW 2027</span>
              {w.title}
            </div>
            <p style={{ fontSize: 13, color: "var(--soft)", marginTop: 4 }}>{w.text}</p>
          </div>
        ))}
      </div>

      {CHECKLIST_SECTIONS.map((sec) => (
        <div key={sec.id} className="card" style={{ padding: "14px 20px" }}>
          <div className="cardlbl" style={{ marginBottom: 4 }}>
            {sec.id}. {sec.title}
          </div>
          {sec.items.map((item) => {
            const auto = evaln.auto[item.id];
            return (
              <div key={item.id} className="ck-row">
                {auto ? (
                  <span style={{ flexShrink: 0, marginTop: 1 }}>{autoPill(auto.status)}</span>
                ) : (
                  <input type="checkbox" checked={done.has(item.id)} onChange={() => toggle(item.id)} aria-label={item.text} />
                )}
                <div style={{ opacity: !auto && done.has(item.id) ? 0.55 : 1 }}>
                  <div className="ck-text">
                    {item.isNew && <span className="ck-new">NEW 2027</span>}
                    {item.text}
                  </div>
                  {item.detail && <div className="ck-note">{item.detail}</div>}
                  {auto && <div className={`ck-note ${auto.status === "flag" ? "flag" : ""}`}>{auto.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div className="card table-wrap" style={{ padding: "14px 20px" }}>
          <div className="cardlbl" style={{ marginBottom: 6 }}>Key dates (Anywhere on Earth)</div>
          <table>
            <tbody>
              {KEY_DATES.map((d) => (
                <tr key={d.date}>
                  <td className="mono" style={{ whiteSpace: "nowrap", fontSize: 12.5 }}>{d.date}</td>
                  <td style={{ fontSize: 13.5 }}>{d.milestone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ padding: "14px 20px" }}>
          <div className="cardlbl" style={{ marginBottom: 6 }}>Relevant websites</div>
          <ul className="tight" style={{ fontSize: 13.5 }}>
            {CHECKLIST_LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

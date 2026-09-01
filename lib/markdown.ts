import type { RunState } from "./types";
import { DECISION_LABELS } from "./chi2027";
import { KEYWORD_FRAMING } from "./keywords";
import { CHECKLIST_SECTIONS, CHECKLIST_DISCLAIMER, evaluateChecklist, lengthCategory } from "./checklist";

/** The submission checklist with auto-verified items filled in from the run. */
export function checklistMarkdown(state: RunState, done?: Set<string>): string {
  const ev = evaluateChecklist(state);
  const lines: string[] = [];
  lines.push(`## CHI 2027 paper submission checklist — ${state.paper?.title ?? "your paper"}`);
  lines.push("");
  lines.push(`> ${CHECKLIST_DISCLAIMER}`);
  lines.push("");
  const len = lengthCategory(state.paper?.words);
  lines.push(`**Upload:** ${state.files.map((f) => f.name).join(", ")} · ${state.paper?.pages ?? "?"} pages · ≈${state.paper?.words?.toLocaleString() ?? "?"} words (${len.label})`);
  if (state.pdfMeta?.readable) lines.push(`**PDF metadata:** Author = ${state.pdfMeta.author ? `"${state.pdfMeta.author}"` : "(empty)"}; Title = ${state.pdfMeta.title ? `"${state.pdfMeta.title}"` : "(empty)"}`);
  lines.push(`**Auto-verified:** ${ev.counts.pass} passed · ${ev.counts.flag} to fix · ${ev.counts.unverified} to check yourself · ${ev.counts.manual} manual items`);
  lines.push("");
  for (const sec of CHECKLIST_SECTIONS) {
    lines.push(`### ${sec.id}. ${sec.title}`);
    for (const item of sec.items) {
      const auto = ev.auto[item.id];
      const tag = item.isNew ? "**NEW 2027** " : "";
      if (auto) {
        const mark = auto.status === "pass" ? "✓" : auto.status === "flag" ? "✗" : "?";
        lines.push(`- ${mark} ${tag}${item.text}`);
        lines.push(`  _${auto.note}_`);
      } else {
        lines.push(`- [${done?.has(item.id) ? "x" : " "}] ${tag}${item.text}`);
        if (item.detail) lines.push(`  _${item.detail}_`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function buildMarkdown(state: RunState): string {
  const p = state.paper;
  const lines: string[] = [];
  lines.push(`# Review Rehearsal — ${p?.title ?? "your paper"}`);
  lines.push("");
  lines.push(
    `> Unofficial CHI 2027 review simulation (run ${state.runId}). Not affiliated with ACM/SIGCHI; not a predictor of real outcomes.`
  );
  lines.push("");
  if (p?.pcs) {
    lines.push(`## PCS keywords — "${KEYWORD_FRAMING}"`);
    lines.push("");
    lines.push(`- **Domain (2–6):** ${p.pcs.domain.join("; ") || "—"}`);
    lines.push(`- **Method / Approach (1–2):** ${p.pcs.method.join("; ") || "—"}`);
    lines.push(`- **Users (0–2):** ${p.pcs.users.join("; ") || "— (no specific population)"}`);
    lines.push(`- **Primary Contribution (1):** ${p.pcs.contribution || "—"}`);
    lines.push("");
  }

  if (state.refAudit) {
    const s = state.refAudit.summary;
    lines.push(`## Reference audit`);
    lines.push("");
    lines.push(`${s.verified} verified · ${s.mismatch} metadata mismatch · ${s.notFound} not found · ${s.skipped} skipped (of ${s.total})`);
    lines.push("");
    for (const v of state.refAudit.verdicts.filter((v) => v.status !== "verified")) {
      lines.push(`- **[${v.key}]** ${v.title} — **${v.status.replace("_", " ")}**${v.notes ? `: ${v.notes}` : ""}`);
      if (v.correctedBibtex) {
        lines.push("");
        lines.push("  ```bibtex");
        lines.push(v.correctedBibtex.split("\n").map((l) => `  ${l}`).join("\n"));
        lines.push("  ```");
      }
    }
    lines.push("");
  }

  if (state.deskReject) {
    const dr = state.deskReject;
    const blocking = dr.checks.filter((c) => c.status === "flag" && c.severity === "hard");
    lines.push(`## Desk-reject screen — ${dr.passed ? "cleared" : `surfaced for inspection (${blocking.map((c) => c.id).join(", ")})`}`);
    lines.push("");
    if (state.overrides?.includes("deskreject")) {
      lines.push(`_Gate overridden by the author (as an AC would for a wrong flag); the run continued._`);
      lines.push("");
    }
    for (const c of dr.checks) {
      const mark = c.status === "pass" ? "✓" : c.status === "unverified" ? "?" : c.severity === "hard" ? "✗" : "!";
      const label = c.status === "pass" ? "cleared" : c.status === "unverified" ? "unverified" : c.severity === "hard" ? "FLAGGED · blocking" : "flagged · discretionary";
      lines.push(`- ${mark} **${c.id} ${c.name}** — ${label} (${c.basis})`);
      if (c.reasoning) lines.push(`  ${c.reasoning}`);
      if (c.evidence) lines.push(`  > ${c.evidence}`);
    }
    lines.push("");
  }

  if (state.adr) {
    lines.push(`## ADR assessment — ${state.adr.decision === "advance" ? "Advance to full review" : "Assisted Desk Reject"}`);
    lines.push("");
    lines.push(`_Simulated AC judgment. In CHI 2027 the ADR is a human decision (no AI rubric tool); the SC and Papers Chairs confirm._`);
    if (state.overrides?.includes("adr")) lines.push(`_Gate overridden by the author; the run continued to full review._`);
    lines.push("");
    if (state.adr.contributionTypes?.length) {
      lines.push(`### Contribution type (tentative)`);
      for (const t of state.adr.contributionTypes) {
        lines.push(`- **${t.type}** — premise: ${t.premise} — appropriate validation: ${t.validationExpectation}`);
      }
      lines.push("");
    }
    if (state.adr.reviewability?.length) {
      lines.push(`### Reviewability (advisory)`);
      for (const r of state.adr.reviewability) {
        lines.push(`- [${r.status.toUpperCase()}] ${r.name} — ${r.rationale}`);
        if (r.evidence) lines.push(`  > "${r.evidence}"`);
      }
      lines.push("");
    }
    lines.push(`### ACM criteria`);
    for (const c of state.adr.criteria) {
      lines.push(`- **${c.name}: ${c.score}/5** — ${c.note}`);
      if (c.evidence) lines.push(`  > "${c.evidence}"`);
    }
    lines.push("");
    lines.push(`### ADR flags`);
    for (const f of state.adr.flags) {
      lines.push(`- [${f.status.toUpperCase()}] ${f.name} — ${f.rationale}`);
    }
    lines.push("");
    lines.push(`**Simulated AC note:** ${state.adr.acNote}`);
    lines.push("");
  }

  if (state.matching && state.personas?.length && state.matching.tags.length) {
    const m = state.matching;
    const ps = state.personas;
    lines.push(`## Reviewer matching — team covers ${m.teamCovers} of ${m.total} keywords at expertise ≥3`);
    lines.push("");
    lines.push(`| Keyword | Weight | ${ps.map((q) => q.id + (q.counted === false ? "*" : "")).join(" | ")} |`);
    lines.push(`|---|---|${ps.map(() => "---").join("|")}|`);
    for (const c of m.coverage) {
      const cells = ps.map((q) => String(q.expertiseTags?.find((e) => e.tag === c.tag)?.level ?? "–"));
      lines.push(`| ${c.tag}${c.best < 3 ? " _(uncovered)_" : ""} | ${c.weight.toFixed(1)} | ${cells.join(" | ")} |`);
    }
    lines.push(`| **Match score** | | ${ps.map((q) => `${Math.round((q.match ?? 0) * 100)}%`).join(" | ")} |`);
    lines.push("");
    lines.push(`_Each reviewer's self-rated expertise (1–4) over the PCS taxonomy; the score is the weighted overlap with the paper's keywords (rarer keywords weigh more). * = advisory, not counted toward coverage._`);
    lines.push("");
  }

  for (const r of state.reviews ?? []) {
    const advisory = r.counted === false ? " — ADVISORY (adversarial, not counted in the decision)" : "";
    lines.push(`## ${r.personaId} · ${r.archetype} — recommendation: ${r.recommendation} (expertise ${r.expertise}/4)${advisory}`);
    lines.push("");
    lines.push(`**Summary.** ${r.summary}`);
    lines.push("");
    lines.push(`**Contribution.** ${r.contribution}`);
    lines.push("");
    for (const c of r.criteria) lines.push(`- ${c.name}: **${c.score}/5** — ${c.assessment}`);
    lines.push("");
    lines.push(`### Major issues`);
    r.majorIssues.forEach((m, i) => {
      lines.push(`${i + 1}. **${m.title}** [${m.severity ?? "severity unavailable"}; ${m.evidenceType ?? "evidence type unavailable"}; ${m.confidence ?? "confidence unavailable"} confidence; ${m.factChecked === true || m.quoteVerified === true ? "evidence verified" : "evidence needs checking"}] (${m.anchor}) — ${m.argument}`);
      if (m.quote) lines.push(`   > "${m.quote}"`);
      if (m.whyItMatters) lines.push(`   - **Why it matters:** ${m.whyItMatters}`);
      if (m.revision) lines.push(`   - **Concrete revision:** ${m.revision}`);
    });
    lines.push("");
    if (r.minorIssues.length) {
      lines.push(`### Minor issues`);
      r.minorIssues.forEach((m) => lines.push(`- ${m}`));
      lines.push("");
    }
    if (r.questions.length) {
      lines.push(`### Questions for the authors`);
      r.questions.forEach((q) => lines.push(`- ${q}`));
      lines.push("");
    }
    if (r.revisions.length) {
      lines.push(`### Required revisions`);
      r.revisions.forEach((q) => lines.push(`- ${q}`));
      lines.push("");
    }
    if (r.sectionAudit?.length) {
      lines.push(`### Section-by-section scrutiny`);
      for (const sec of r.sectionAudit) {
        lines.push(`**${sec.section}**`);
        sec.findings.forEach((f) => {
          lines.push(`- [${f.severity.toUpperCase()}] ${f.issue} [${f.evidenceType ?? "evidence type unavailable"}; ${f.confidence ?? "confidence unavailable"} confidence; ${f.factChecked === true || f.quoteVerified === true ? "evidence verified" : "evidence needs checking"}] (${f.anchor})`);
          if (f.quote) lines.push(`  > "${f.quote}"`);
          if (f.whyItMatters) lines.push(`  - **Why it matters:** ${f.whyItMatters}`);
          if (f.revision) lines.push(`  - **Concrete revision:** ${f.revision}`);
        });
        lines.push("");
      }
    }
  }

  if (state.meta) {
    lines.push(`## 1AC meta-review — ${DECISION_LABELS[state.meta.decision]}`);
    lines.push("");
    lines.push(state.meta.metaReview);
    lines.push("");
    lines.push(`*${state.meta.decisionRationale}*`);
    lines.push("");
    if (state.meta.discussion.length) {
      lines.push(`### PCS discussion (simulated)`);
      state.meta.discussion.forEach((d) => lines.push(`- **${d.speaker}:** ${d.text}`));
      lines.push("");
    }
  }

  if (state.guide) {
    lines.push(`## Strengthening guide`);
    lines.push("");
    const groups: [string, string][] = [
      ["track", "Changes your decision track"],
      ["criterion", "Strengthens a criterion"],
      ["polish", "Polish"],
    ];
    for (const [g, label] of groups) {
      const actions = state.guide.actions.filter((a) => a.group === g);
      if (!actions.length) continue;
      lines.push(`### ${label}`);
      actions.forEach((a) => {
        lines.push(`- [ ] **${a.title}** — ${a.detail} _(${a.criterion} · ${a.effort} · ${a.anchor})_`);
      });
      lines.push("");
    }
    if (state.guide.reading.length) {
      lines.push(`### Verified reading list`);
      lines.push("");
      lines.push(`Every entry below was returned by a scholarly database (${[...new Set(state.guide.reading.map((r) => r.source))].join(", ")}) — nothing is model-generated.`);
      lines.push("");
      state.guide.reading.forEach((r) => {
        lines.push(`- ${r.title}${r.venue ? ` — *${r.venue}*` : ""}${r.year ? ` (${r.year})` : ""}${r.url ? ` — ${r.url}` : ""}`);
      });
      lines.push("");
    }
  }

  if (p) {
    lines.push(checklistMarkdown(state));
  }

  return lines.join("\n");
}

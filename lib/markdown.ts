import type { RunState } from "./types";
import { DECISION_LABELS } from "./chi2027";

export function buildMarkdown(state: RunState): string {
  const p = state.paper;
  const lines: string[] = [];
  lines.push(`# Review Rehearsal — ${p?.title ?? "your paper"}`);
  lines.push("");
  lines.push(
    `> Unofficial CHI 2027 review simulation (run ${state.runId}). Not affiliated with ACM/SIGCHI; not a predictor of real outcomes.`
  );
  lines.push("");

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
    lines.push(`## Desk-reject screen`);
    lines.push("");
    for (const c of state.deskReject.checks) {
      lines.push(`- ${c.passed ? "✓" : "✗"} **${c.name}** (${c.severity}) — ${c.evidence}`);
    }
    lines.push("");
  }

  if (state.adr) {
    lines.push(`## ADR report — ${state.adr.decision === "advance" ? "Advance to full review" : "Assisted Desk Reject"}`);
    lines.push("");
    for (const c of state.adr.criteria) {
      lines.push(`- **${c.name}: ${c.score}/5** — ${c.note}`);
      if (c.evidence) lines.push(`  > "${c.evidence}"`);
    }
    lines.push("");
    for (const f of state.adr.flags) {
      lines.push(`- [${f.status.toUpperCase()}] ${f.name} — ${f.rationale}`);
    }
    lines.push("");
    lines.push(`**Simulated AC note:** ${state.adr.acNote}`);
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
      lines.push(`${i + 1}. **${m.title}** (${m.anchor}) — ${m.argument}`);
      if (m.quote) lines.push(`   > "${m.quote}"`);
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

  return lines.join("\n");
}

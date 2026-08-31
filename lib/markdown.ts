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
  if (p?.keywords?.length) {
    lines.push(`**Expertise descriptors for matching:** ${p.keywords.join(" · ")}`);
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
    if (r.sectionAudit?.length) {
      lines.push(`### Section-by-section scrutiny`);
      for (const sec of r.sectionAudit) {
        lines.push(`**${sec.section}**`);
        sec.findings.forEach((f) => {
          lines.push(`- [${f.severity.toUpperCase()}] ${f.issue} (${f.anchor})`);
          if (f.quote) lines.push(`  > "${f.quote}"`);
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

  return lines.join("\n");
}

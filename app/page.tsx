"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { RunState, StageName } from "@/lib/types";
import { STAGE_ORDER } from "@/lib/types";
import { SUBCOMMUNITIES } from "@/lib/chi2027";
import { buildMarkdown } from "@/lib/markdown";
import { TopBar, Ribbon, type AppStep } from "@/components/chrome";
import { RefAuditView, AdrView, ReviewRoomView, GuideView } from "@/components/results";

type StageStatus = "queued" | "active" | "done" | "failed" | "skipped";
type Phase = "upload" | "running" | "results";
type Tab = "refs" | "adr" | "reviews" | "guide";

const DEADLINE = new Date("2026-09-10T23:59:00Z");

function daysToDeadline(): number {
  return Math.max(0, Math.ceil((DEADLINE.getTime() - Date.now()) / 86_400_000));
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [subcommunity, setSubcommunity] = useState<string>(SUBCOMMUNITIES[0]);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StageStatus>>({});
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [state, setState] = useState<RunState | null>(null);
  const [tab, setTab] = useState<Tab>("guide");
  const inputRef = useRef<HTMLInputElement>(null);

  const appStep: AppStep =
    phase === "upload" ? "Upload" : phase === "running" ? "Screening" : state?.guide ? "Guide" : state?.reviews ? "Reviews" : "Screening";

  function addFiles(list: FileList | File[]) {
    const ok = Array.from(list).filter((f) => /\.(pdf|tex|bib|zip)$/i.test(f.name));
    setFiles((prev) => {
      const names = new Set(prev.map((p) => p.name));
      return [...prev, ...ok.filter((f) => !names.has(f.name))];
    });
    if (!ok.length) setError("Only .pdf, .tex, .bib, or .zip files are accepted.");
    else setError(null);
  }

  async function callStage(stage: StageName, current: RunState): Promise<RunState> {
    const res = await fetch("/api/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, state: current }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Stage ${stage} failed`);
    return { ...current, ...data.update };
  }

  async function run() {
    if (!files.length) return;
    setError(null);
    setStopNote(null);
    setPhase("running");
    const init: Record<string, StageStatus> = Object.fromEntries(STAGE_ORDER.map((s) => [s.id, "queued"]));
    setStatuses(init);

    try {
      // 1. Upload directly to Blob (bypasses the 4.5 MB function body limit).
      const uploaded = await Promise.all(
        files.map(async (f) => {
          const blob = await upload(f.name, f, { access: "public", handleUploadUrl: "/api/blob" });
          return { url: blob.url, name: f.name, size: f.size };
        })
      );

      let current: RunState = {
        runId: `rr-${Math.random().toString(36).slice(2, 7)}`,
        kind: files.some((f) => /\.tex$/i.test(f.name)) ? "latex" : "pdf",
        files: uploaded,
        subcommunityHint: subcommunity,
      };
      setState(current);

      const mark = (id: string, st: StageStatus) => setStatuses((prev) => ({ ...prev, [id]: st }));

      for (const stage of STAGE_ORDER) {
        mark(stage.id, "active");
        current = await callStage(stage.id, current);
        setState(current);
        mark(stage.id, "done");

        if (stage.id === "deskreject" && current.deskReject && !current.deskReject.passed) {
          STAGE_ORDER.slice(STAGE_ORDER.findIndex((s) => s.id === "deskreject") + 1).forEach((s) => mark(s.id, "skipped"));
          setStopNote(
            "Desk rejected — a hard check failed. In the real process this paper would not reach reviewers. Fix the failed checks below and run again."
          );
          setTab("adr");
          setPhase("results");
          return;
        }
        if (stage.id === "adr" && current.adr?.decision === "adr") {
          (["panel", "reviews", "meta", "guide"] as const).forEach((s) => mark(s, "skipped"));
          setStopNote(
            "The simulated AC did not advance this paper past the ADR gate. Authors receive the AC's written feedback below — address it and run again."
          );
          setTab("adr");
          setPhase("results");
          return;
        }
      }
      setTab("guide");
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The run failed.");
      setStatuses((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) if (next[k] === "active") next[k] = "failed";
        return next;
      });
      setPhase(state?.paper ? "running" : "upload");
    }
  }

  function exportMarkdown() {
    if (!state) return;
    const blob = new Blob([buildMarkdown(state)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `review-rehearsal-${state.runId}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <TopBar current={appStep} runId={state?.runId} />
      <Ribbon />
      <main className="shell">
        {phase === "upload" && (
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brand)" }}>
                CHI 2027 · Papers
              </div>
              <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)" }}>Rehearse the review before the review.</h1>
              <p style={{ fontSize: 16, color: "var(--soft)", maxWidth: 560, margin: "0 auto" }}>
                Your paper runs the real CHI 2027 gauntlet: desk-reject checks, a reference-authenticity audit, the
                ADR rubric, four independent expert reviews plus an adversarial fifth reader, and a 1AC meta-review
                — ending in a guide to strengthen it.
              </p>
              <p style={{ fontSize: 14 }}>
                <a href="/process">See how the real CHI 2027 review process works →</a>
              </p>
            </div>

            <div
              className={`dropzone ${drag ? "drag" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 16V5" />
                <path d="M7.5 9.5L12 5l4.5 4.5" />
                <path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3" />
              </svg>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {files.length ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : "Drop your paper here"}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--soft)" }}>
                PDF · or LaTeX source (.tex + .bib) · or a project .zip — up to 50 MB
              </div>
              {files.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {files.map((f) => (
                    <span key={f.name} className="pill slate">
                      {f.name}
                      <button
                        aria-label={`Remove ${f.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles((prev) => prev.filter((p) => p.name !== f.name));
                        }}
                        style={{ background: "none", border: "none", color: "inherit", fontWeight: 700, padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.tex,.bib,.zip"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
              <select className="select" value={subcommunity} onChange={(e) => setSubcommunity(e.target.value)} aria-label="Subcommunity">
                {SUBCOMMUNITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="btn primary" disabled={!files.length} onClick={run}>
                Run the rehearsal
              </button>
            </div>

            {error && <p style={{ color: "var(--pen)", textAlign: "center", fontWeight: 600 }}>{error}</p>}

            <p style={{ fontSize: 13, color: "var(--soft)", textAlign: "center" }}>
              Processed once, deleted within 24 hours. Your paper is never used for training.
              <br />
              <strong style={{ color: "var(--brand-dark)" }}>{daysToDeadline()} days</strong> until the CHI 2027 submission
              deadline (September 10, 2026). A full run takes 4–6 minutes.
            </p>
          </div>
        )}

        {phase === "running" && (
          <div style={{ maxWidth: 640, margin: "24px auto 0" }}>
            <div className="card" style={{ padding: "24px 28px" }}>
              <h2 style={{ fontSize: 22, marginBottom: 6 }}>Running the rehearsal</h2>
              {state?.paper && (
                <p style={{ fontSize: 13.5, color: "var(--soft)", marginBottom: 8 }}>
                  {state.paper.title} · {state.paper.pages} pages · {state.paper.references.length} references
                </p>
              )}
              {STAGE_ORDER.map((s) => {
                const st = statuses[s.id] ?? "queued";
                return (
                  <div key={s.id} className={`stage-row ${st}`}>
                    {st === "done" ? (
                      <span className="dot-done">✓</span>
                    ) : st === "active" ? (
                      <span className="spinner" />
                    ) : st === "failed" ? (
                      <span className="dot-fail">✗</span>
                    ) : (
                      <span className="dot-queued" />
                    )}
                    <div>
                      <div className="stage-name">{s.label}</div>
                      <div className="stage-sub">{s.detail}</div>
                    </div>
                  </div>
                );
              })}
              {error && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ color: "var(--pen)", fontWeight: 600 }}>{error}</p>
                  <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setPhase("upload")}>
                    Back to upload
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "results" && state && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <h1 style={{ fontSize: 26 }}>{state.paper?.title}</h1>
                <p style={{ fontSize: 13.5, color: "var(--soft)", marginTop: 4 }}>
                  {state.paper?.subcommunity} · {state.paper?.pages} pages · {state.paper?.references.length} references
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn ghost small" onClick={exportMarkdown}>
                  Export Markdown
                </button>
                <button className="btn ghost small" onClick={() => window.print()}>
                  Print / PDF
                </button>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setPhase("upload");
                    setFiles([]);
                    setState(null);
                    setStopNote(null);
                  }}
                >
                  New run
                </button>
              </div>
            </div>

            {stopNote && (
              <div className="banner bad" style={{ marginTop: 16 }}>
                <p style={{ fontWeight: 600, color: "var(--pen)" }}>{stopNote}</p>
              </div>
            )}

            <div className="tabs">
              <button className={`tab ${tab === "refs" ? "on" : ""}`} onClick={() => setTab("refs")}>
                Reference audit
              </button>
              <button className={`tab ${tab === "adr" ? "on" : ""}`} onClick={() => setTab("adr")}>
                ADR report
              </button>
              {state.reviews && (
                <button className={`tab ${tab === "reviews" ? "on" : ""}`} onClick={() => setTab("reviews")}>
                  Review room
                </button>
              )}
              {(state.meta || state.guide) && (
                <button className={`tab ${tab === "guide" ? "on" : ""}`} onClick={() => setTab("guide")}>
                  Decision &amp; guide
                </button>
              )}
            </div>

            {tab === "refs" && <RefAuditView state={state} />}
            {tab === "adr" && <AdrView state={state} />}
            {tab === "reviews" && state.reviews && <ReviewRoomView state={state} />}
            {tab === "guide" && <GuideView state={state} />}
          </div>
        )}

        <p className="footer-note">
          Review Rehearsal is an unofficial simulation for authors, built on the published CHI 2027 review process.
          It must not be used to produce actual CHI reviews. Papers are deleted within 24 hours and never used for
          training.
        </p>
      </main>
    </>
  );
}

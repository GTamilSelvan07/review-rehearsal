import Link from "next/link";

export function PenIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 4l7 7-9.5 9.5L4 22l1.5-6.5L15 6z" />
      <path d="M10.5 15.5L15 11" />
    </svg>
  );
}

const STEPS = ["Upload", "Screening", "Reviews", "Guide"] as const;
export type AppStep = (typeof STEPS)[number];

export function TopBar({ current, runId }: { current?: AppStep; runId?: string }) {
  const idx = current ? STEPS.indexOf(current) : -1;
  return (
    <div className="topbar">
      <Link href="/" className="wordmark">
        <PenIcon />
        <span>Review Rehearsal</span>
      </Link>
      <Link href="/process" className="navlink">
        The CHI 2027 process
      </Link>
      {current ? (
        <div className="steps">
          {STEPS.map((s, i) => (
            <span key={s} className={`step ${i === idx ? "active" : i < idx ? "done" : ""}`}>
              {i + 1} · {s}
              {i < idx ? " ✓" : ""}
            </span>
          ))}
        </div>
      ) : (
        <div className="steps" />
      )}
      <span className="pill neutral mono" style={{ fontSize: 12 }}>
        {runId ? `run ${runId}` : "CHI 2027 rules · v1"}
      </span>
    </div>
  );
}

export function Ribbon() {
  return (
    <div className="ribbon">
      Unofficial simulation for authors preparing a submission — not affiliated with ACM or SIGCHI, and never a
      predictor of real outcomes.
    </div>
  );
}

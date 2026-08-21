import { NextRequest, NextResponse } from "next/server";
import type { RunState, StageName } from "@/lib/types";
import {
  runIngest,
  runDeskReject,
  runRefAudit,
  runAdr,
  runPanel,
  runReviews,
  runMeta,
  runGuide,
} from "@/lib/stages";

export const maxDuration = 300;

const RUNNERS: Record<StageName, (s: RunState) => Promise<Partial<RunState>>> = {
  ingest: runIngest,
  deskreject: runDeskReject,
  refaudit: runRefAudit,
  adr: runAdr,
  panel: runPanel,
  reviews: runReviews,
  meta: runMeta,
  guide: runGuide,
};

// Basic per-instance rate limit: a new run (ingest) at most 4×/hour per IP.
const starts = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  let body: { stage: StageName; state: RunState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { stage, state } = body ?? {};
  if (!stage || !RUNNERS[stage] || !state) {
    return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  }

  if (stage === "ingest") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const now = Date.now();
    const recent = (starts.get(ip) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= 4) {
      return NextResponse.json(
        { error: "Rate limit: at most 4 runs per hour. Please try again later." },
        { status: 429 }
      );
    }
    recent.push(now);
    starts.set(ip, recent);
  }

  try {
    const update = await RUNNERS[stage](state);
    return NextResponse.json({ update });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stage failed";
    console.error(`[stage:${stage}]`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

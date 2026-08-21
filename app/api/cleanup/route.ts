import { NextRequest, NextResponse } from "next/server";
import { list, del } from "@vercel/blob";

export const maxDuration = 60;

// Daily cron (vercel.json): delete uploaded papers older than 24 hours.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cutoff = Date.now() - 24 * 3600 * 1000;
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 500 });
    const old = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < cutoff);
    if (old.length) {
      await del(old.map((b) => b.url));
      deleted += old.length;
    }
    cursor = page.cursor ?? undefined;
  } while (cursor);
  return NextResponse.json({ deleted });
}

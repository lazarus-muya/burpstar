import { getScans, createScan } from "@/lib/server/store";
import { runScanInBackground } from "@/lib/server/scanner";

export async function GET() {
  return Response.json({ scans: getScans() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    target?: string;
    checks?: string[];
  };
  const target = (body.target ?? "").trim();
  if (!target) return Response.json({ error: "target required" }, { status: 400 });
  const checks = Array.isArray(body.checks) ? body.checks.filter((c) => typeof c === "string") : [];
  const record = createScan(target, checks);
  runScanInBackground(record.id, target);
  return Response.json({ scan: record });
}
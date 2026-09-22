import { addTarget, getTargets } from "@/lib/server/store";
import { normalizeHost } from "@/lib/utils";

export async function GET() {
  return Response.json({ targets: getTargets() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    host?: string;
    protocol?: "http" | "https";
    inScope?: boolean;
  };
  const host = normalizeHost(body.host ?? "");
  if (!host) return Response.json({ error: "host required" }, { status: 400 });
  const { targets, created } = addTarget({
    host,
    protocol: body.protocol === "http" ? "http" : "https",
    inScope: body.inScope !== false,
  });
  return Response.json({ targets, created });
}
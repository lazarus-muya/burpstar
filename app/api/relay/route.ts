import { executeRequest } from "@/lib/server/engine";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { raw?: string; host?: string };
  if (!body.raw || typeof body.raw !== "string") {
    return Response.json({ error: "missing raw request" }, { status: 400 });
  }
  const result = await executeRequest(body.raw, { host: body.host });
  return Response.json(result);
}
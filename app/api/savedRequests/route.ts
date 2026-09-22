import { addSavedRequest, getSavedRequests } from "@/lib/server/store";

export async function GET() {
  return Response.json({ requests: getSavedRequests() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    req?: string;
    host?: string;
  };
  if (!body.req || typeof body.req !== "string") {
    return Response.json({ error: "missing req" }, { status: 400 });
  }
  const record = addSavedRequest({
    name: body.name,
    req: body.req,
    host: body.host ?? "",
  });
  return Response.json({ request: record });
}
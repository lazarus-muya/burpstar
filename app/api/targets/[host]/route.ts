import { deleteTarget, getTargets, setTargetScope } from "@/lib/server/store";

export async function PATCH(request: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { inScope?: boolean };
  setTargetScope(host, body.inScope !== false);
  return Response.json({ targets: getTargets() });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  deleteTarget(host);
  return Response.json({ targets: getTargets() });
}
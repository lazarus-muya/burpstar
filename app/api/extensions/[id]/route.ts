import { getExtensions, setExtensionEnabled } from "@/lib/server/store";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
  setExtensionEnabled(id, body.enabled === true);
  return Response.json({ extensions: getExtensions() });
}
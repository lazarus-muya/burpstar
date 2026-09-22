import { deleteSavedRequest, getSavedRequests } from "@/lib/server/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteSavedRequest(Number(id));
  return Response.json({ requests: getSavedRequests() });
}
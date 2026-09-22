import { getHistoryEntry, deleteTrafficEntry } from "@/lib/server/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const entry = getHistoryEntry(Number(id));
  if (!entry) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(entry);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteTrafficEntry(Number(id));
  return Response.json({ ok: true });
}
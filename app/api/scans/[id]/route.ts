import { deleteScan, getScan } from "@/lib/server/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const scan = getScan(Number(id));
  if (!scan) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ scan });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteScan(Number(id));
  return Response.json({ ok: true });
}
import { getExtensionCatalog, getExtensions, getExtLog, installExtension } from "@/lib/server/store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ext = installExtension(id);
  if (!ext) return Response.json({ error: "extension not found in store" }, { status: 404 });
  return Response.json({
    installed: ext,
    extensions: getExtensions(),
    catalog: getExtensionCatalog(),
    log: getExtLog(120),
  });
}
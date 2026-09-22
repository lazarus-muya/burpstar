import { deleteIssue, getIssues } from "@/lib/server/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteIssue(id);
  return Response.json({ issues: getIssues() });
}
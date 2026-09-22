import { clearHistory, getHistory } from "@/lib/server/store";

export async function GET() {
  return Response.json({ entries: getHistory() });
}

export async function DELETE() {
  clearHistory();
  return Response.json({ ok: true });
}
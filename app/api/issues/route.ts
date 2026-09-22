import { getIssues } from "@/lib/server/store";

export async function GET() {
  return Response.json({ issues: getIssues() });
}
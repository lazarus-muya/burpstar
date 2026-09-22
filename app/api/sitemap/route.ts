import { getActivity, getSiteStats } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    sites: getSiteStats(),
    activity: getActivity(12),
  });
}
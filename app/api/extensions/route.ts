import { getExtensions } from "@/lib/server/store";

export async function GET() {
  return Response.json({ extensions: getExtensions() });
}
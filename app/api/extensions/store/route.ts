import { getExtensionCatalog } from "@/lib/server/store";

export async function GET() {
  return Response.json({ catalog: getExtensionCatalog() });
}
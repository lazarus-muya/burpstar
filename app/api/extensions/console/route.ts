import { clearExtLog, getExtLog, logExt } from "@/lib/server/store";
import { evalExtensionExpression } from "@/lib/server/extender";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ log: getExtLog(200) });
}

export async function DELETE() {
  clearExtLog();
  return Response.json({ log: [] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { expression?: string };
  const expression = typeof body.expression === "string" ? body.expression : "";
  const result = evalExtensionExpression(expression);
  logExt("info", `> ${expression}`);
  if (result.ok) {
    const output = result.output ?? "undefined";
    for (const line of output.split("\n")) logExt("info", line);
    return Response.json({ output, ok: true, log: getExtLog(200) });
  }
  logExt("error", `✖ ${result.error}`);
  return Response.json(
    { error: result.error, ok: false, output: "", log: getExtLog(200) },
    { status: 200 },
  );
}
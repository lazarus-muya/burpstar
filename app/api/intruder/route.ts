import { runIntruderAttack } from "@/lib/server/intruder";
import type { IntruderAttackType } from "@/lib/types";

const ATTACK_TYPES = new Set(["sniper", "battering-ram", "pitchfork", "cluster-bomb"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    rawReq?: string;
    host?: string;
    attackType?: string;
    positions?: { marker?: string; values?: unknown[] }[];
    payloads?: unknown[];
    targetHost?: string;
  };
  if (!body.rawReq || typeof body.rawReq !== "string") {
    return Response.json({ error: "missing rawReq" }, { status: 400 });
  }

  const attackType: IntruderAttackType =
    body.attackType && ATTACK_TYPES.has(body.attackType)
      ? (body.attackType as IntruderAttackType)
      : "sniper";

  const positions = Array.isArray(body.positions)
    ? body.positions
        .filter((p) => Array.isArray(p.values))
        .map((p) => ({
          marker: typeof p.marker === "string" ? p.marker : "§payload§",
          values: (p.values as unknown[]).filter((v): v is string => typeof v === "string"),
        }))
        .filter((p) => p.values.length > 0)
    : [];

  const host = typeof body.host === "string" ? body.host : body.targetHost;

  if (positions.length === 0) {
    const payloads = Array.isArray(body.payloads)
      ? body.payloads.filter((p): p is string => typeof p === "string")
      : [];
    if (payloads.length === 0) return Response.json({ error: "no payloads" }, { status: 400 });
    positions.push({ marker: "§payload§", values: payloads });
  }

  const output = await runIntruderAttack({
    rawReq: body.rawReq,
    host,
    attackType,
    positions,
  });
  return Response.json(output);
}
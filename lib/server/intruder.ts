import "server-only";

import type { IntruderAttackType, IntruderPayloadRun } from "@/lib/types";
import { executeRequest } from "@/lib/server/engine";

export interface IntruderAttackInput {
  rawReq: string;
  host?: string;
  attackType: IntruderAttackType;
  positions: { marker: string; values: string[] }[];
}

export interface IntruderAttackOutput {
  requests: IntruderPayloadRun[];
  totalSent: number;
}

/** Ordered payload markers as they appear in the template (`§...§`). */
export function extractMarkers(raw: string): string[] {
  return Array.from(raw.matchAll(/§([^§]*)§/g), (m) => `§${m[1]}§`);
}

/**
 * Substitutes each marker with its mapped value regardless of whether
 * several positions share identical marker text (placeholder tokens are
 * swapped in first so `replaceAll` can never hit the wrong occurrence).
 */
function hydrate(raw: string, markers: string[], values: string[]): string {
  let out = raw;
  for (let i = 0; i < markers.length; i++) {
    out = out.replaceAll(markers[i], `\u0000${i}\u0000`);
  }
  for (let i = 0; i < markers.length; i++) {
    out = out.replaceAll(`\u0000${i}\u0000`, values[i] ?? "");
  }
  return out;
}

function injectPosition(raw: string, marker: string, otherMarkers: string[], value: string): string {
  return hydrate(
    raw,
    otherMarkers,
    otherMarkers.map((m) => (m === marker ? value : m.slice(1, -1))),
  );
}

function classify(payload: string, status: number, len: number, timeMs: number, body: string): string {
  const lower = body.toLowerCase();
  if (/sqlite|syntax error|sql_error|near "/.test(lower)) return "SQL error leak";
  if (timeMs > 2500) return `time-based +${Math.round(timeMs / 100) / 10}s`;
  if (status >= 500) return "server error";
  if (/insufficient_scope/.test(lower)) return "authz rejected";
  if (len === 0) return "empty body";
  return "";
}

async function fire(raw: string, positionLabel: string, payload: string, index: number, host?: string): Promise<IntruderPayloadRun> {
  const result = await executeRequest(raw, { host, log: false });
  return {
    request: index + 1,
    payload,
    position: positionLabel,
    status: result.status,
    length: Buffer.byteLength(result.body),
    time: `${result.timeMs} ms`,
    comment: classify(payload, result.status, Buffer.byteLength(result.body), result.timeMs, result.body),
    servedBy: result.servedBy,
  };
}

/**
 * Runs an Intruder-style attack against the template.
 *
 * - sniper:        each payload in position i, while the other positions keep
 *                  their literal (non-marker) value — one position at a time.
 * - battering-ram: the same payload is substituted into every position at once.
 * - pitchfork:     positions are consumed in parallel (zip) from their sets.
 * - cluster-bomb:  every combination across all position sets (cartesian).
 */
export async function runIntruderAttack(input: IntruderAttackInput): Promise<IntruderAttackOutput> {
  const markers = extractMarkers(input.rawReq);
  const runs: { raw: string; values: string[] }[] = [];

  const hasMarkers = markers.length > 0;
  // A template without markers is treated as one implicit Sniping position.
  const positions =
    hasMarkers && input.positions.length
      ? markers.map((marker, i) => ({
          marker,
          values: input.positions[i]?.values ?? input.positions[0]?.values ?? [],
        }))
      : input.positions.length
        ? [{ marker: markers[0] ?? "§payload§", values: input.positions[0].values }]
        : [];

  switch (input.attackType) {
    case "battering-ram": {
      const values = positions[0]?.values ?? [];
      for (const value of values) {
        runs.push({ raw: hydrate(input.rawReq, markers, positions.map(() => value)), values: positions.map(() => value) });
      }
      break;
    }
    case "pitchfork": {
      const longest = Math.max(0, ...positions.map((p) => p.values.length));
      for (let k = 0; k < longest; k++) {
        const values = positions.map((p) => p.values[Math.min(k, p.values.length - 1)] ?? "");
        runs.push({ raw: hydrate(input.rawReq, markers, values), values });
      }
      break;
    }
    case "cluster-bomb": {
      const sets = positions.map((p) => (p.values.length ? p.values : [""]));
      const cartesian = sets.reduce<string[][]>(
        (acc, set) => acc.flatMap((row) => set.map((v) => [...row, v])),
        [[]],
      );
      for (const values of cartesian) {
        runs.push({ raw: hydrate(input.rawReq, markers, values), values });
      }
      break;
    }
    case "sniper":
    default: {
      const single = positions.map((p) => ({ marker: p.marker, values: p.values }));
      for (const pos of single) {
        for (const value of pos.values) {
          const raw = hasMarkers
            ? injectPosition(input.rawReq, pos.marker, markers, value)
            : input.rawReq;
          runs.push({ raw, values: [value] });
        }
      }
      break;
    }
  }

  const requests: IntruderPayloadRun[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const positionLabel = positions.length ? positions.map((p) => p.marker).join(" + ") : "§payload§";
    const payloadLabel = run.values.length > 1 ? run.values.join(" | ") : (run.values[0] ?? "");
    requests.push(await fire(run.raw, positionLabel, payloadLabel, i, input.host));
  }

  return { requests, totalSent: requests.length };
}
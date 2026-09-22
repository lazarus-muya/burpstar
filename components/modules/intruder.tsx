"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IntruderAttackType, IntruderPayloadRun } from "@/lib/types";
import { payloadSets } from "@/lib/data/intruder";
import { cn } from "@/lib/utils";
import { post } from "@/lib/client/api";
import { Button, CountPill, Panel, PanelHead, ProgressBar } from "@/components/ui";

const ATTACK_TYPES: { id: IntruderAttackType; label: string }[] = [
  { id: "sniper", label: "Sniper" },
  { id: "battering-ram", label: "Battering ram" },
  { id: "pitchfork", label: "Pitchfork" },
  { id: "cluster-bomb", label: "Cluster bomb" },
];

const ATTACK_NOTE: Record<IntruderAttackType, string> = {
  sniper: "Each position is attacked in turn, one payload at a time.",
  "battering-ram": "The same payload is substituted into every position at once.",
  pitchfork: "Positions advance in parallel — one payload set per position.",
  "cluster-bomb": "Every combination across positions — one payload set per position.",
};

const DEFAULT_RAW = `POST /login HTTP/1.1
Host: example.com
Content-Type: application/json

{"email":"§username§","password":"§password§"}`;

function countMarkers(raw: string): number {
  return raw.match(/§[^§]*§/g)?.length ?? 0;
}

export default function IntruderModule() {
  const [attackType, setAttackType] = useState<IntruderAttackType>("sniper");
  const [rawReq, setRawReq] = useState(DEFAULT_RAW);
  const [selSets, setSelSets] = useState<number[]>([3, 4]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [results, setResults] = useState<IntruderPayloadRun[]>([]);
  const [attackError, setAttackError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const markers = useMemo(() => countMarkers(rawReq), [rawReq]);
  const payloadCount = useMemo(() => {
    const count = Math.max(1, markers);
    let n = 0;
    switch (attackType) {
      case "battering-ram":
        n = payloadSets[selSets[0]]?.entries.length ?? 0;
        break;
      case "pitchfork": {
        const used = selSets.slice(0, count);
        n = Math.max(0, ...used.map((i) => payloadSets[i]?.entries.length ?? 0));
        break;
      }
      case "cluster-bomb":
        n = selSets.slice(0, count).reduce((acc, i) => acc * (payloadSets[i]?.entries.length ?? 0), 1);
        break;
      default:
        n = count * (payloadSets[selSets[0]]?.entries.length ?? 0);
    }
    return n;
  }, [attackType, markers, selSets]);

  const start = async () => {
    setRunning(true);
    setBusy(true);
    setRevealed(0);
    setAttackError(null);
    const count = Math.max(1, markers);
    const positions = selSets.slice(0, count).map((idx, i) => ({
      marker: markers ? rawReq.match(/§([^§]*)§/g)![i] : "§payload§",
      values: [...payloadSets[idx % payloadSets.length].entries],
    }));
    try {
      const out = await post<{ requests: IntruderPayloadRun[] }>("/api/intruder", {
        rawReq,
        attackType,
        positions,
      });
      setResults(out.requests);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setRevealed((prev) => {
          if (prev >= out.requests.length) {
            if (timer.current) clearInterval(timer.current);
            setRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, 140);
    } catch (err) {
      setResults([]);
      setRunning(false);
      setAttackError(err instanceof Error ? err.message : "Attack failed — API unreachable.");
    } finally {
      setBusy(false);
    }
  };

  const progress = results.length ? Math.round((revealed / results.length) * 100) : 0;
  const done = !running && revealed >= results.length && results.length > 0;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const showPositions = Math.max(1, markers);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-3 p-3 max-[1100px]:grid-cols-1">
      {/* Attack configuration */}
      <div className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-3">
        <Panel>
          <PanelHead title="Attack config" />
          <div className="p-3">
            <label className="mb-1 block text-[9.5px] font-bold tracking-[.08em] text-mute uppercase">
              Request template
            </label>
            <textarea
              value={rawReq}
              onChange={(e) => setRawReq(e.target.value)}
              spellCheck={false}
              rows={6}
              className="mb-3 w-full resize-y rounded-md border border-line bg-panel-2 px-2.5 py-2 font-mono text-[10.5px] leading-[1.5] whitespace-pre text-text outline-none transition-colors focus:border-accent/40"
            />
            <label className="mb-1 block text-[9.5px] font-bold tracking-[.08em] text-mute uppercase">
              Attack type
            </label>
            <div className="mb-1">
              <select
                value={attackType}
                onChange={(e) => setAttackType(e.target.value as IntruderAttackType)}
                className="h-[28px] w-full appearance-none rounded-md border border-line-2 bg-panel-3 px-2.5 text-[11.5px] text-text outline-none"
              >
                {ATTACK_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="rounded-md border border-line bg-panel-2 px-2.5 py-1.5 text-[9.5px] leading-[1.5] text-mute">
              {ATTACK_NOTE[attackType]}
              {showPositions > 1 && attackType === "sniper" && (
                <span className="mt-0.5 block"> {showPositions} positions found in template.</span>
              )}
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Payload positions" />
          <div className="p-3">
            <pre className="overflow-auto rounded-md border border-line bg-[#0d1014] p-2.5 font-mono text-[10.5px] leading-[1.6] whitespace-pre-wrap break-words text-dim">
              {rawReq.split("\n")[0]}
              {markers === 0 ? "\n(no § markers — payload will run unmodified)" : ""}
            </pre>
            <p className="mt-2 text-[10px] text-mute">
              <span className="text-accent-2">§</span> markers delimit the payload positions.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHead
            title="Payload sets"
            count={<CountPill>{selSets.length}/{showPositions} configured</CountPill>}
          />
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {showPositions === 1 ? (
              <div className="mb-2">
                <SetPicker
                  index={0}
                  selected={selSets[0] ?? 0}
                  count={1}
                  onSelect={(v) => setSelSets((prev) => [v, ...prev.slice(1)])}
                />
              </div>
            ) : (
              selSets.slice(0, showPositions).map((sel, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <SetPicker
                    index={i}
                    selected={sel}
                    count={showPositions}
                    onSelect={(v) =>
                      setSelSets((prev) => {
                        const next = [...prev];
                        next[i] = v;
                        return next;
                      })
                    }
                  />
                </div>
              ))
            )}

            {selSets.length < showPositions && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => setSelSets((prev) => [...prev, 0])}
              >
                + Add payload set
              </Button>
            )}
            {markers > 1 && selSets.length < markers && (
              <p className="mt-1.5 text-[9px] leading-[1.5] text-mute">
                {attackType === "pitchfork" || attackType === "cluster-bomb"
                  ? "Pitchfork / Cluster bomb need one set per § position."
                  : "Optional — Sniper reuses one set across positions."}
              </p>
            )}

            <div className="mt-2 rounded-md border border-line bg-panel-2 p-2">
              <p className="font-mono text-[10px] text-mute">
                {payloadSets[selSets[0]]?.entries.slice(0, 3).join("  ·  ")}
                <span className="text-accent-2"> …</span>
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Results */}
      <Panel>
        <PanelHead
          title="Attack results"
          count={
            running || busy ? (
              <CountPill>
                {revealed}/{payloadCount} sent
              </CountPill>
            ) : (
              <CountPill>{done ? results.length : 0} completed</CountPill>
            )
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              icon="bolt"
              onClick={() => void start()}
              disabled={running || busy}
              className="mr-1"
            >
              {busy ? "Preparing…" : running ? "Attacking…" : done ? "Replay" : "Start attack"}
            </Button>
          }
        />
        {running && (
          <div className="flex-none border-b border-line bg-panel-2 px-3 py-2">
            <div className="mb-1.5 flex justify-between text-[10.5px]">
              <span className="text-dim">
                Sending <b className="text-text">{payloadCount} requests</b> ·{" "}
                {ATTACK_TYPES.find((t) => t.id === attackType)?.label}
              </span>
              <span className="font-mono text-accent-2">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
        {attackError && (
          <div className="flex-none border-b border-line bg-[rgba(255,95,86,.1)] px-3 py-1.5 text-[10.5px] text-red">
            ⚠ {attackError}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-right text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  #
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Payload
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Position
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-right text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Status
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-right text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Length
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-right text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Time
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Comment
                </th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, revealed).map((r) => {
                const highlight =
                  r.status >= 500 ||
                  (r.comment || "").toLowerCase().includes("time") ||
                  (r.comment || "").toLowerCase().includes("error");
                return (
                  <tr
                    key={r.request}
                    className={cn(
                      "transition-colors hover:bg-panel-2",
                      highlight && "bg-[rgba(255,122,47,.06)]",
                    )}
                  >
                    <td className="border-b border-line/55 px-3 py-[5px] text-right font-mono text-[10px] text-mute">
                      {r.request}
                    </td>
                    <td className="max-w-[220px] border-b border-line/55 px-3 py-[5px] font-mono text-[10px] text-[#cdd5df]">
                      <span className="block truncate" title={r.payload}>{r.payload}</span>
                    </td>
                    <td className="border-b border-line/55 px-3 py-[5px] font-mono text-[10px] text-dim">
                      {r.position}
                    </td>
                    <td
                      className={cn(
                        "border-b border-line/55 px-3 py-[5px] text-right font-mono text-[10px] font-bold",
                        r.status >= 500 ? "text-red" : r.status >= 400 ? "text-amber" : "text-green",
                      )}
                    >
                      {r.status}
                    </td>
                    <td className="border-b border-line/55 px-3 py-[5px] text-right font-mono text-[10px] text-mute">
                      {r.length} B
                    </td>
                    <td className="border-b border-line/55 px-3 py-[5px] text-right font-mono text-[10px] text-mute">
                      {r.time}
                    </td>
                    <td className="border-b border-line/55 px-3 py-[5px] text-[10px] text-dim">
                      {r.comment || ""}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[11px] text-mute">
                    Configure an attack and press{" "}
                    <span className="font-semibold text-accent-2">Start attack</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function SetPicker({
  index,
  selected,
  count,
  onSelect,
}: {
  index: number;
  selected: number;
  count: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="rounded-md border border-line bg-panel-2 p-2">
      <div className="mb-1 flex items-center justify-between text-[9.5px] font-bold tracking-[.06em] text-mute uppercase">
        <span>
          Position {index + 1}/{count}
        </span>
      </div>
      <select
        value={selected}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="h-[26px] w-full appearance-none rounded-md border border-line-2 bg-panel-3 px-2 text-[10.5px] text-text outline-none"
      >
        {payloadSets.map((ps, i) => (
          <option key={ps.id} value={i}>
            {ps.name} · {ps.entries.length} entries
          </option>
        ))}
      </select>
      <p className="mt-1 truncate font-mono text-[9px] text-mute">
        {payloadSets[selected]?.entries.slice(0, 3).join("  ·  ")}
        <span className="text-accent-2"> …</span>
      </p>
    </div>
  );
}
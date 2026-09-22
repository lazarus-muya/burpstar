"use client";

import { useCallback, useEffect, useState } from "react";
import type { Issue, ScanRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api, post } from "@/lib/client/api";
import { Button, CountPill, Panel, PanelHead, ProgressBar, SeverityDot, SectionLabel } from "@/components/ui";

const CHECKS = [
  { id: "sqli", label: "SQL injection" },
  { id: "xss", label: "Cross-site scripting" },
  { id: "ssrf", label: "Server-side request forgery" },
  { id: "idor", label: "Object reference (IDOR)" },
  { id: "authen", label: "Broken authentication" },
  { id: "jwt", label: "JWT / token handling" },
  { id: "headers", label: "Security headers" },
  { id: "disclosure", label: "Information disclosure" },
] as const;

export default function ScannerModule() {
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(CHECKS.map((c) => c.id)),
  );
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [starting, setStarting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const refreshIssues = useCallback(async () => {
    try {
      const { issues } = await api<{ issues: Issue[] }>("/api/issues");
      setIssues(issues);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { scans } = await api<{ scans: ScanRecord[] }>("/api/scans");
        if (!alive) return;
        setScans(scans);
        const live = scans.find((s) => s.status === "queued" || s.status === "running");
        if (!live) void refreshIssues();
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = setInterval(load, 800);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshIssues]);

  const toggleCheck = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async () => {
    setStarting(true);
    setScanError(null);
    try {
      await post<{ scan: ScanRecord }>("/api/scans", {
        target,
        checks: Array.from(selected),
      });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to queue scan — API unreachable.");
    } finally {
      setStarting(false);
    }
  };

  const running = scans.filter((s) => s.status === "queued" || s.status === "running");

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-3 p-3 max-[1100px]:grid-cols-1">
      {/* New scan */}
      <div className="flex min-h-0 flex-col gap-3">
        <Panel>
          <PanelHead title="New scan" />
          <div className="p-3">
            <SectionLabel>Target</SectionLabel>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://target.example"
              className="mb-3 h-[28px] w-full rounded-md border border-line bg-panel-2 px-2.5 font-mono text-[11px] text-text outline-none transition-colors focus:border-accent/40"
            />
            <SectionLabel>Checks ({selected.size}/{CHECKS.length})</SectionLabel>
            <div className="space-y-1">
              {CHECKS.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-panel-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleCheck(c.id)}
                    className="accent-[#ff7a2f]"
                  />
                  <span className="text-[11.5px] text-dim">{c.label}</span>
                </label>
              ))}
            </div>
            <Button
              variant="primary"
              className="mt-3 w-full"
              icon="bolt"
              disabled={starting || running.length > 0}
              onClick={() => void start()}
            >
              {starting ? "Queuing…" : running.length > 0 ? "Scan running…" : "Start scan"}
            </Button>
            <p className="mt-2 text-[10px] text-mute">
              Scans run in the background with live progress. Findings are written to the issue database.
            </p>
            {scanError && (
              <p className="mt-2 rounded-md border border-red/30 bg-[rgba(255,95,86,.1)] px-2.5 py-1.5 text-[10.5px] text-red">
                ⚠ {scanError}
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Scan queue" count={<CountPill>{scans.length}</CountPill>} />
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {scans.length === 0 && (
              <p className="px-3 py-4 text-center text-[11px] text-mute">No scans queued yet.</p>
            )}
            {scans.map((s) => (
              <div key={s.id} className="mb-2 rounded-md border border-line bg-panel-2 p-2.5 last:mb-0">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-mono text-[11px] text-text">
                    #{s.id} · {s.target.replace(/^https?:\/\//, "")}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      s.status === "running" || s.status === "queued"
                        ? "text-accent-2"
                        : s.status === "done"
                          ? "text-green"
                          : "text-red",
                    )}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <ProgressBar value={s.progress} />
                  <span className="font-mono text-[10px] text-mute">{s.progress}%</span>
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-mute">
                  phase: <span className="text-dim">{s.phase}</span>
                  {s.message && <span className="ml-2 text-green">{s.message}</span>}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Results */}
      <Panel>
        <PanelHead
          title="Scan results"
          count={<CountPill>{issues.length} in database</CountPill>}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Severity
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Issue
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Endpoint
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Confidence
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  State
                </th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id} className="transition-colors hover:bg-panel-2">
                  <td className="border-b border-line/55 px-3 py-[6px]">
                    <ScoreTone sev={i.severity} />
                  </td>
                  <td className="border-b border-line/55 px-3 py-[6px] font-medium text-text">
                    {i.title}
                  </td>
                  <td className="border-b border-line/55 px-3 py-[6px] font-mono text-[10px] text-dim">
                    {i.path}
                  </td>
                  <td className="border-b border-line/55 px-3 py-[6px] text-[10px] text-dim">
                    {i.confidence}
                  </td>
                  <td className="border-b border-line/55 px-3 py-[6px]">
                    <span className="rounded-full border border-[rgba(61,220,151,.3)] px-2 py-0.5 text-[9px] font-bold text-green">
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[11px] text-mute">
                    No findings yet. Start a scan to hunt for vulnerabilities.
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

function ScoreTone({ sev }: { sev: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <SeverityDot severity={sev as "high" | "medium" | "low" | "info"} />
      <span className="font-mono text-[10px] capitalize text-dim">{sev}</span>
    </span>
  );
}
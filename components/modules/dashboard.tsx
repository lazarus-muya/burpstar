import Link from "next/link";
import { getActivity, getHistory, getIssues, getScans, getTargets } from "@/lib/server/store";
import { cn } from "@/lib/utils";
import { Panel, PanelHead, CountPill, SeverityDot, ProgressBar } from "@/components/ui";

const SEV_BAR: Record<string, string> = {
  high: "bg-red",
  medium: "bg-amber",
  low: "bg-blue",
  info: "bg-[#5c6470]",
};

const TONE_TEXT: Record<string, string> = {
  green: "text-green",
  red: "text-red",
  blue: "text-blue",
  amber: "text-amber",
  mute: "text-mute",
};

const SEV_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

const TASK_STATE: Record<string, { dot: string; label: string }> = {
  queued: { dot: "bg-blue", label: "queued" },
  running: { dot: "bg-accent", label: "running" },
  done: { dot: "bg-green", label: "done" },
  error: { dot: "bg-red", label: "error" },
};

export default async function DashboardModule() {
  const history = getHistory();
  const issues = getIssues();
  const scans = getScans();
  const targets = getTargets();
  const activity = getActivity(14);

  const running = scans.filter((s) => s.status === "running" || s.status === "queued");
  const highCount = issues.filter((i) => i.severity === "high").length;
  const liveToday = history.filter((e) => e.servedBy !== "demo").length;

  const severityBreakdown = (["high", "medium", "low", "info"] as const).map((sev) => ({
    severity: sev,
    label: SEV_LABEL[sev],
    count: issues.filter((i) => i.severity === sev).length,
  }));
  const total = Math.max(1, severityBreakdown.reduce((n, s) => n + s.count, 0));

  const dashboardStats = [
    { label: "Requests", value: String(history.length), delta: liveToday > 0 ? `+${liveToday} new` : "working set", tone: liveToday > 0 ? "green" : "mute" },
    { label: "Open issues", value: String(issues.length), delta: `${highCount} high`, tone: highCount > 0 ? "red" : "mute" },
    { label: "In scope", value: String(targets.filter((t) => t.inScope).length), delta: `${targets.length} hosts`, tone: "blue" },
    { label: "Scan sessions", value: String(scans.length), delta: running.length > 0 ? `${running.length} running` : "idle", tone: running.length > 0 ? "amber" : "mute" },
  ];

  const dashboardTasks = [
    ...scans
      .filter((s) => s.status === "queued" || s.status === "running")
      .map((s) => ({
        id: s.id,
        label: `Scan #${s.id} · ${s.target.replace(/^https?:\/\//, "")}`,
        progress: s.progress,
        state: s.status,
      })),
    ...scans
      .filter((s) => s.status === "done" || s.status === "error")
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        label: `Scan #${s.id} · ${s.target.replace(/^https?:\/\//, "")}`,
        progress: 100,
        state: s.status,
      })),
  ].slice(0, 5);

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {dashboardStats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-line bg-panel p-3.5"
          >
            <div className="text-[10px] font-bold tracking-[.06em] text-mute uppercase">
              {s.label}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold tracking-tight text-text">{s.value}</span>
              {s.delta && (
                <span className={cn("font-mono text-[11px]", TONE_TEXT[s.tone ?? "mute"])}>
                  {s.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid min-h-[420px] grid-cols-1 gap-3 xl:grid-cols-[1fr_320px]">
        {/* left column */}
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
          <Panel className="h-full">
            <PanelHead title="Open issues by severity" count={<CountPill>{issues.length}</CountPill>} />
            <div className="p-3.5">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-panel-4">
                {severityBreakdown.map((s) => (
                  <div
                    key={s.severity}
                    className={cn("h-full", SEV_BAR[s.severity])}
                    style={{ width: `${(s.count / total) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {severityBreakdown.map((s) => (
                  <div key={s.severity} className="flex items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 py-2">
                    <SeverityDot severity={s.severity} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-text">{s.label}</div>
                      <div className="font-mono text-[10px] text-mute">
                        {s.count} · {s.count === 0 ? 0 : Math.round((s.count / total) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="h-full">
            <PanelHead title="Recent findings" count={<CountPill>{issues.length}</CountPill>} />
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[11.5px]">
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.id} className="cursor-pointer transition-colors hover:bg-panel-2">
                      <td className="border-b border-line/55 px-3 py-2">
                        <span className="flex items-center gap-2">
                          <SeverityDot severity={i.severity} />
                          <span className="font-medium text-text">{i.title}</span>
                        </span>
                      </td>
                      <td className="border-b border-line/55 px-3 py-2 font-mono text-[10px] text-mute">
                        {i.host}
                      </td>
                      <td className="border-b border-line/55 px-3 py-2 text-right">
                        <Link
                          href="/proxy"
                          className="inline-flex items-center gap-1 rounded border border-line-2 bg-panel-3 px-2 py-1 text-[10px] text-dim transition-colors hover:bg-panel-4 hover:text-text"
                        >
                          View ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-[11px] text-mute">
                        No findings yet — run a scan to start building the issue database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* right column */}
        <div className="grid min-h-0 grid-rows-[auto_auto] gap-3">
          <Panel>
            <PanelHead
              title="Tasks"
              count={
                <span className="text-[9.5px] font-bold text-dim">
                  {running.length} running
                </span>
              }
            />
            <div className="p-3">
              {dashboardTasks.length === 0 && (
                <p className="text-[11px] leading-[1.6] text-mute">
                  No scan tasks yet. Start a scan from the{" "}
                  <Link href="/scanner" className="text-accent-2 underline-offset-2 hover:underline">
                    Scanner
                  </Link>{" "}
                  tab and live progress will appear here.
                </p>
              )}
              {dashboardTasks.map((t) => {
                const state = TASK_STATE[t.state] ?? TASK_STATE.done;
                return (
                  <div key={t.id} className="mb-3 last:mb-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-text">
                        <span className={cn("h-[6px] w-[6px] flex-none rounded-full", state.dot)} />
                        <span className="truncate">{t.label}</span>
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9.5px] font-bold uppercase",
                          t.state === "error"
                            ? "text-red"
                            : t.state === "done"
                              ? "text-green"
                              : "text-accent-2",
                        )}
                      >
                        {state.label}
                      </span>
                    </div>
                    <ProgressBar value={t.progress} />
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHead title="Recent activity" />
            <div className="min-h-0 flex-1 overflow-auto p-1">
              {activity.map((a, idx) => (
                <div key={idx} className="flex items-start gap-2.5 px-2 py-1.5">
                  <span className="mt-px flex-none font-mono text-[9.5px] text-mute">{a.at}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] text-dim">{a.text}</p>
                    <span className="font-mono text-[9px] text-mute">{a.module}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteStats, TargetHost } from "@/lib/types";
import { cn, normalizeHost } from "@/lib/utils";
import { api, del, patch, post } from "@/lib/client/api";
import { Button, Panel, PanelHead, CountPill } from "@/components/ui";
import { Icon } from "@/components/icons";

export default function TargetModule() {
  const [scope, setScope] = useState<TargetHost[]>([]);
  const [sites, setSites] = useState<SiteStats[]>([]);
  const [url, setUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [t, s] = await Promise.all([
          api<{ targets: TargetHost[] }>("/api/targets"),
          api<{ sites: SiteStats[] }>("/api/sitemap"),
        ]);
        if (!alive) return;
        setScope(t.targets);
        setSites(s.sites);
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const hostTraffic = useMemo(() => {
    const counts = new Map<string, { total: number; errors: number }>();
    for (const s of sites) counts.set(s.host, { total: s.total, errors: s.errors });
    return counts;
  }, [sites]);

  const toggleScope = async (host: string) => {
    const hostObj = scope.find((s) => s.host === host);
    if (!hostObj) return;
    setScope((prev) => prev.map((h) => (h.host === host ? { ...h, inScope: !h.inScope } : h)));
    try {
      const { targets } = await patch<{ targets: TargetHost[] }>(
        `/api/targets/${encodeURIComponent(host)}`,
        { inScope: !hostObj.inScope },
      );
      setScope(targets);
    } catch {
      setScope((prev) => prev.map((h) => (h.host === host ? { ...h, inScope: hostObj.inScope } : h)));
    }
  };

  const removeHost = async (host: string) => {
    try {
      const { targets } = await del<{ targets: TargetHost[] }>(`/api/targets/${encodeURIComponent(host)}`);
      setScope(targets);
    } catch {
      /* ignore */
    }
  };

  const addHost = async () => {
    const clean = normalizeHost(url);
    if (!clean) {
      setAddError(`Enter a valid hostname, e.g. "api.example.com".`);
      return;
    }
    setAddError(null);
    try {
      const res = await post<{ targets: TargetHost[]; created: boolean }>("/api/targets", {
        host: clean,
        protocol: "https",
        inScope: true,
      });
      setScope(res.targets);
      if (!res.created) {
        setAddError(`"${clean}" is already in scope.`);
        return;
      }
      setUrl("");
      requestAnimationFrame(() => {
        document.getElementById(`scope-${clean}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      setAddError(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add target — API unreachable.");
    }
  };

  const inScope = scope.filter((s) => s.inScope).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3 max-[1100px]:grid-cols-1">
      <Panel>
        <PanelHead
          title="Scope"
          count={
            <CountPill>
              {inScope}/{scope.length} in scope
            </CountPill>
          }
        />
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[11.5px]">
            <thead>
              <tr>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Host
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Protocol
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-left text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  In scope
                </th>
                <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-3 py-2 text-right text-[10px] font-bold tracking-[.06em] text-mute uppercase">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody>
              {scope.map((h) => (
                <tr key={h.host} id={`scope-${h.host}`} className="transition-colors hover:bg-panel-2">
                  <td className="border-b border-line/55 px-3 py-2 font-mono text-[11px] text-text">
                    {h.host}
                  </td>
                  <td className="border-b border-line/55 px-3 py-2 font-mono text-[10px] text-dim">
                    {h.protocol}
                  </td>
                  <td className="border-b border-line/55 px-3 py-2">
                    <button
                      onClick={() => void toggleScope(h.host)}
                      className={cn(
                        "relative h-[16px] w-[28px] rounded-full border transition-colors",
                        h.inScope
                          ? "border-[rgba(61,220,151,.4)] bg-[rgba(61,220,151,.25)]"
                          : "border-line-2 bg-panel-4",
                      )}
                      aria-pressed={h.inScope}
                    >
                      <span
                        className={cn(
                          "absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all",
                          h.inScope ? "left-[14px] bg-green" : "left-[2px] bg-mute",
                        )}
                      />
                    </button>
                  </td>
                  <td className="border-b border-line/55 px-3 py-2 text-right font-mono text-[10.5px] text-mute">
                    {hostTraffic.get(h.host)?.total ?? 0}
                  </td>
                </tr>
              ))}
              {scope.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[11px] text-mute">
                    No targets defined. Add one below to bring it into scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-none items-center gap-2 border-t border-line bg-panel-2 p-2.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addHost()}
            placeholder="https://new-target.example.com"
            className="h-[28px] min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-2.5 font-mono text-[11.5px] text-text outline-none transition-colors placeholder:font-sans placeholder:text-mute focus:border-accent/40"
          />
          <Button variant="primary" onClick={() => void addHost()}>
            Add
          </Button>
        </div>
        {addError && (
          <p className="flex-none border-t border-line bg-panel-2 px-3 py-1.5 text-[10.5px] text-red">
            ⚠ {addError}
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHead title="Site map" count={<CountPill>{sites.length} hosts</CountPill>} />
        <div className="min-h-0 flex-1 overflow-auto p-2.5">
          {sites.map((s) => {
            const c = hostTraffic.get(s.host);
            return (
              <div
                key={s.host}
                className="mb-2 rounded-lg border border-line bg-panel-2 p-3 last:mb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="truncate font-mono text-[11.5px] text-text">{s.host}</span>
                    {s.methods.slice(0, 3).map((m) => (
                      <span key={m} className="rounded border border-line px-1 py-px font-mono text-[8.5px] text-dim">
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold",
                        s.inScope
                          ? "border border-[rgba(61,220,151,.3)] text-green"
                          : "border border-line-2 text-mute",
                      )}
                    >
                      {s.inScope ? "IN SCOPE" : "OUT OF SCOPE"}
                    </span>
                    <button
                      onClick={() => void removeHost(s.host)}
                      className="grid h-[20px] w-[20px] place-items-center rounded-md text-mute transition-colors hover:bg-panel-4 hover:text-red"
                      title={`Remove ${s.host} from scope`}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-4 font-mono text-[10.5px] text-mute">
                  <span>
                    requests <b className="text-dim">{c?.total ?? 0}</b>
                  </span>
                  <span>
                    errors <b className="text-[#ff9a92]">{c?.errors ?? 0}</b>
                  </span>
                  <span>
                    endpoints <b className="text-dim">{s.folders.reduce((n, f) => n + f.paths.length, 0)}</b>
                  </span>
                </div>

                {s.folders.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-line/60 pt-2">
                    {s.folders.map((f) => (
                      <div key={f.name}>
                        <div className="font-mono text-[10px] font-semibold text-dim">{f.name}</div>
                        <div className="mt-0.5 space-y-[3px] pl-3">
                          {f.paths.map((p) => (
                            <div key={`${p.method} ${p.path}`} className="flex items-center gap-2 font-mono text-[10px]">
                              <span
                                className={cn(
                                  "w-9 flex-none font-bold",
                                  p.lastStatus >= 500
                                    ? "text-red"
                                    : p.lastStatus >= 400
                                      ? "text-amber"
                                      : "text-green",
                                )}
                              >
                                {p.lastStatus}
                              </span>
                              <span className="text-amber">{p.method}</span>
                              <span className="min-w-0 flex-1 truncate text-dim">{p.path}</span>
                              <span className="flex-none text-mute">×{p.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {s.folders.length === 0 && (
                  <p className="mt-2 font-mono text-[9.5px] text-mute">
                    no requests logged yet — relay or scan this host to discover endpoints
                  </p>
                )}
              </div>
            );
          })}
          {sites.length === 0 && (
            <p className="py-10 text-center text-[11px] text-mute">No hosts to show.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
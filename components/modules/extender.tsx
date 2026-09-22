"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtensionCatalogEntry, ExtensionInfo, ExtLogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api, del, patch, post } from "@/lib/client/api";
import { Button, Chip, CountPill, Panel, PanelHead } from "@/components/ui";
import { Icon } from "@/components/icons";

interface ConsoleResponse {
  output?: string;
  error?: string;
  ok?: boolean;
  log?: ExtLogEntry[];
}

export default function ExtenderModule() {
  const [exts, setExts] = useState<ExtensionInfo[]>([]);
  const [catalog, setCatalog] = useState<ExtensionCatalogEntry[]>([]);
  const [log, setLog] = useState<ExtLogEntry[]>([]);
  const [expr, setExpr] = useState("");
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const refreshLog = useCallback(() => {
    api<{ log: ExtLogEntry[] }>("/api/extensions/console")
      .then((r) => setLog(r.log))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    const loadExts = () =>
      api<{ extensions: ExtensionInfo[] }>("/api/extensions")
        .then(({ extensions }) => {
          if (alive) setExts(extensions);
        })
        .catch(() => undefined);
    void loadExts();
    void refreshLog();
    const t = setInterval(loadExts, 3000);
    const l = setInterval(refreshLog, 2500);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(l);
    };
  }, [refreshLog]);

  const openStore = () => {
    setStoreOpen(true);
    api<{ catalog: ExtensionCatalogEntry[] }>("/api/extensions/store")
      .then((r) => setCatalog(r.catalog))
      .catch(() => undefined);
  };

  const install = async (id: string) => {
    setInstalling(id);
    try {
      const r = await post<{ extensions: ExtensionInfo[]; catalog: ExtensionCatalogEntry[]; log: ExtLogEntry[] }>(
        `/api/extensions/store/${encodeURIComponent(id)}`,
        {},
      );
      setExts(r.extensions);
      setCatalog(r.catalog);
      setLog(r.log);
    } catch {
      /* ignore */
    } finally {
      setInstalling(null);
    }
  };

  const toggle = async (id: string) => {
    const cur = exts.find((e) => e.id === id);
    setExts((prev) => prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
    try {
      const { extensions } = await patch<{ extensions: ExtensionInfo[] }>(
        `/api/extensions/${encodeURIComponent(id)}`,
        { enabled: !cur?.enabled },
      );
      setExts(extensions);
    } catch {
      /* ignore */
    }
  };

  const runExpr = async () => {
    if (!expr.trim()) return;
    setOutput(null);
    const r = await post<ConsoleResponse>("/api/extensions/console", { expression: expr });
    setLog(r.log ?? []);
    setLastOutput(expr);
    setOutput({ ok: !!r.ok, text: r.error ?? r.output ?? "" });
  };

  const clearConsole = async () => {
    const r = await del<{ log: ExtLogEntry[] }>("/api/extensions/console");
    setLog(r.log ?? []);
    setOutput(null);
    setLastOutput(null);
  };

  const enabledCount = exts.filter((e) => e.enabled).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px] gap-3 p-3 max-[1100px]:grid-cols-1">
      <Panel>
        <PanelHead
          title="Installed extensions"
          count={
            <CountPill>
              {enabledCount}/{exts.length} active
            </CountPill>
          }
          actions={
            <Button size="sm" icon="puzzle" className="mr-1" onClick={openStore}>
              BApp Store
            </Button>
          }
        />
        <div className="min-h-0 flex-1 overflow-auto p-2.5">
          {exts.map((e) => (
            <div
              key={e.id}
              className="mb-2.5 rounded-lg border border-line-2 bg-panel-2 p-3 last:mb-0"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-md border border-line-2 bg-panel-3 text-accent-2">
                  <Icon name="puzzle" size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-text">{e.name}</span>
                    <Chip>{e.type}</Chip>
                    <span className="font-mono text-[9.5px] text-mute">v{e.version}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-[1.5] text-dim">{e.description}</p>
                  <div className="mt-1.5 flex items-center gap-3 font-mono text-[9.5px] text-mute">
                    <span>by {e.author}</span>
                    <span>★ {e.rating.toFixed(1)}</span>
                    <span>{e.installs.toLocaleString()} installs</span>
                  </div>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <button
                    onClick={() => toggle(e.id)}
                    className={cn(
                      "relative h-[18px] w-[32px] rounded-full border transition-colors",
                      e.enabled
                        ? "border-[rgba(61,220,151,.4)] bg-[rgba(61,220,151,.25)]"
                        : "border-line-2 bg-panel-4",
                    )}
                    aria-pressed={e.enabled}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] h-[12px] w-[12px] rounded-full transition-all",
                        e.enabled ? "left-[16px] bg-green" : "left-[2px] bg-mute",
                      )}
                    />
                  </button>
                  <span
                    className={cn(
                      "font-mono text-[9px] font-bold",
                      e.enabled ? "text-green" : "text-mute",
                    )}
                  >
                    {e.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {exts.length === 0 && (
            <p className="py-10 text-center text-[11px] text-mute">Loading extensions…</p>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHead
          title="Extension console"
          actions={
            <button
              onClick={() => void clearConsole()}
              className="font-mono text-[9.5px] text-mute transition-colors hover:text-red"
            >
              clear
            </button>
          }
        />
        <div className="min-h-0 flex-1 overflow-auto bg-[#0d1014] p-2.5 font-mono text-[10.5px] leading-[1.7]">
          {output && (
            <div
              className={cn(
                "mb-2 rounded-md border border-line-2 px-2.5 py-2",
                output.ok ? "bg-[rgba(61,220,151,.08)]" : "bg-[rgba(255,95,86,.09)]",
              )}
            >
              <div className={cn("mb-1 text-[9.5px] font-bold uppercase", output.ok ? "text-green" : "text-red")}>
                {output.ok ? "result" : "error"}
              </div>
              <pre className="whitespace-pre-wrap break-words text-[10.5px] leading-[1.5] text-text">
                {output.text}
              </pre>
            </div>
          )}
          {log.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="flex-none text-mute">{l.time}</span>
              <span
                className={cn(
                  "flex-none font-bold uppercase",
                  l.level === "warn" ? "text-amber" : l.level === "error" ? "text-red" : "text-blue",
                )}
              >
                {l.level}
              </span>
              <span className="min-w-0 break-words text-dim">{l.message}</span>
            </div>
          ))}
          {log.length === 0 && (
            <p className="py-6 text-center text-[10.5px] text-mute">
              No console output. Try: helpers.sha256(&quot;burpstar&quot;)
            </p>
          )}
        </div>
        <div className="flex flex-none items-center gap-2 border-t border-line bg-panel-2 p-2.5">
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runExpr()}
            placeholder="e.g. helpers.base64Encode(helpers.sha256('admin'))"
            className="h-[28px] min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-2.5 font-mono text-[11px] text-text outline-none focus:border-accent/40"
          />
          <Button size="sm" variant="primary" onClick={() => void runExpr()}>
            Run
          </Button>
        </div>
        {lastOutput && (
          <div className="flex-none border-t border-line bg-[#0d1014] px-2.5 py-1.5 font-mono text-[9.5px] text-mute">
            last: {lastOutput.length > 60 ? lastOutput.slice(0, 60) + "…" : lastOutput}
          </div>
        )}
      </Panel>

      {storeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setStoreOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-line-2 bg-panel-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-none items-center justify-between border-b border-line bg-panel-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon name="puzzle" size={15} className="text-accent-2" />
                <span className="text-[13px] font-semibold text-text">BApp Store</span>
                <span className="font-mono text-[9.5px] text-mute">ext-burpstar-store v1</span>
              </div>
              <button
                onClick={() => setStoreOpen(false)}
                className="grid h-[24px] w-[24px] place-items-center rounded-md text-mute transition-colors hover:bg-panel-4 hover:text-text"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {catalog.map((c) => (
                <div
                  key={c.id}
                  className="mb-2.5 flex items-start gap-3 rounded-lg border border-line-2 bg-panel-2 p-3 last:mb-0"
                >
                  <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-md border border-line-2 bg-panel-3 text-accent-2">
                    <Icon name="layers" size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-text">{c.name}</span>
                      <Chip>{c.type}</Chip>
                      <span className="font-mono text-[9.5px] text-mute">v{c.version}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-[1.5] text-dim">{c.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 font-mono text-[9.5px] text-mute">
                      <span>by {c.author}</span>
                      <span>★ {c.rating.toFixed(1)}</span>
                      <span>{c.installs.toLocaleString()} installs</span>
                    </div>
                  </div>
                  <div className="flex-none">
                    {c.installed ? (
                      <span className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-green/30 bg-[rgba(61,220,151,.15)] px-2.5 text-[10.5px] font-semibold text-green">
                        <Icon name="check" size={11} />
                        Installed
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={installing === c.id ? undefined : "plus"}
                        disabled={installing === c.id}
                        onClick={() => void install(c.id)}
                      >
                        {installing === c.id ? "Installing…" : "Install"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {catalog.length === 0 && (
                <p className="py-10 text-center text-[11px] text-mute">Loading store catalogue…</p>
              )}
            </div>
            <div className="flex-none border-t border-line bg-panel-2 px-4 py-2 font-mono text-[9.5px] text-mute">
              {catalog.filter((c) => c.installed).length}/{catalog.length} installed · {exts.length} extensions in workspace
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
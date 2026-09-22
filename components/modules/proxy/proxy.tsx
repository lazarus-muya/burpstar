"use client";

import { useEffect, useMemo, useState } from "react";
import type { Issue, ScanRecord, SiteNode, SiteStats, TrafficEntry } from "@/lib/types";
import { statusText } from "@/lib/utils";
import { api, del } from "@/lib/client/api";
import { Panel, PanelHead, CountPill, IconButton } from "@/components/ui";
import ProxyToolbar from "@/components/modules/proxy/toolbar";
import Navigator from "@/components/modules/proxy/navigator";
import HistoryTable from "@/components/modules/proxy/history";
import MessageViewer from "@/components/modules/proxy/viewer";
import IssueInspector from "@/components/modules/proxy/inspector";

function matches(entry: TrafficEntry, search: string): boolean {
  const q = search.trim();
  if (!q) return true;
  const pict =
    `${entry.method} ${entry.host} ${entry.path} ${entry.status} ${entry.size} ${entry.mime} ${entry.time}`.toLowerCase();
  const tokens = q.split(/\s+and\s+/i).map((t) => t.trim()).filter(Boolean);
  return tokens.every((token) => {
    const m = token.match(/^([a-z]+):(.*)$/i);
    if (m) {
      const [, key, val] = m;
      const field =
        key.toLowerCase() === "size"
          ? entry.size
          : key.toLowerCase() === "time"
            ? entry.time.toUpperCase()
            : entry[key.toLowerCase() as keyof TrafficEntry];
      return String(field ?? "").toLowerCase().includes(val.trim().toLowerCase());
    }
    return pict.includes(token.toLowerCase());
  });
}

function applyScope(entries: TrafficEntry[], node: SiteNode | null): TrafficEntry[] {
  if (!node) return entries;
  const host = node.host;
  if (node.path) {
    const path = node.path;
    return entries.filter((e) => e.host === host && e.path.startsWith(path));
  }
  return entries.filter((e) => e.host === host);
}

const HOST_COLORS: SiteNode["color"][] = ["blue", "purple", "amber"];

function buildSiteTree(stats: SiteStats[]): SiteNode[] {
  return stats.map((s, i) => {
    const host: SiteNode = {
      id: `h-${s.host}`,
      label: `${s.protocol}://${s.host}`,
      kind: "host",
      host: s.host,
      color: HOST_COLORS[i % HOST_COLORS.length],
      children: [],
    };
    for (const f of s.folders) {
      const folder: SiteNode = {
        id: `f-${s.host}::${f.name}`,
        label: f.name,
        kind: "folder",
        host: s.host,
        path: f.name,
        children: f.paths.map((p) => ({
          id: `p-${s.host}::${p.method}::${p.path}`,
          label: p.path.split("/").filter(Boolean).pop() || p.path,
          kind: "leaf" as const,
          host: s.host,
          path: p.path,
        })),
      };
      host.children!.push(folder);
    }
    return host;
  });
}

export default function ProxyModule() {
  const [intercept, setIntercept] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<SiteNode | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<TrafficEntry[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [tree, setTree] = useState<SiteNode[]>([]);
  const [issueId, setIssueId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [h, i, s, m] = await Promise.all([
          api<{ entries: TrafficEntry[] }>("/api/history"),
          api<{ issues: Issue[] }>("/api/issues"),
          api<{ scans: ScanRecord[] }>("/api/scans"),
          api<{ sites: SiteStats[] }>("/api/sitemap"),
        ]);
        if (!alive) return;
        setEntries(h.entries);
        setIssues(i.issues);
        setScans(s.scans);
        setTree(buildSiteTree(m.sites));
        setIssueId((prev) => prev ?? i.issues?.[0]?.id ?? null);
      } catch {
        /* backend unavailable — keep existing state */
      }
    };
    void load();
    const timer = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const clearHistory = async () => {
    await del<{ ok: boolean }>("/api/history").catch(() => undefined);
    setEntries([]);
    setSelectedId(null);
  };

  const dropSelected = async () => {
    if (!selected) return;
    await del<{ ok: boolean }>(`/api/history/${selected.id}`).catch(() => undefined);
    setEntries((prev) => prev.filter((e) => e.id !== selected.id));
    setSelectedId(null);
  };

  const scoped = useMemo(() => applyScope(entries, scope), [entries, scope]);
  const visible = useMemo(
    () => scoped.filter((e) => matches(e, search)),
    [scoped, search],
  );

  const selected =
    entries.find((e) => e.id === selectedId) ?? visible[0] ?? scoped[0];
  const activeScan = scans.find((s) => s.status === "running" || s.status === "queued");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ProxyToolbar
        intercept={intercept}
        onToggleIntercept={() => setIntercept((v) => !v)}
        search={search}
        onSearch={setSearch}
        total={scoped.length}
        visible={visible.length}
        onClear={() => void clearHistory()}
        onDrop={() => void dropSelected()}
      />

      <main className="grid min-h-0 flex-1 grid-cols-[270px_minmax(0,1fr)_330px] gap-2 p-2 max-[1300px]:grid-cols-[240px_minmax(0,1fr)_300px] max-[1120px]:grid-cols-[220px_minmax(0,1fr)]">
        {/* Navigator */}
        <Panel>
          <PanelHead
            title="Navigator"
            actions={<IconButton icon="collapse" size={13} title="Collapse all" />}
          />
          <Navigator tree={tree} activeId={scope?.id ?? null} onSelect={setScope} />
        </Panel>

        {/* Center */}
        <section className="grid min-h-0 grid-rows-[minmax(170px,42%)_minmax(0,1fr)] gap-2">
          <Panel>
            <PanelHead
              title={
                <>
                  HTTP history
                  <CountPill>{visible.length}</CountPill>
                </>
              }
              actions={<IconButton icon="sliders" size={13} title="Filter" />}
            />
            <HistoryTable
              entries={visible}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          </Panel>

          {selected ? (
            <div className="viewer grid min-h-0 grid-cols-2 gap-2">
              <MessageViewer
                side="req"
                raw={selected.req}
                url={`${selected.method} ${selected.path}`}
              />
              <MessageViewer
                side="res"
                raw={selected.res}
                url={`${selected.status} ${statusText(selected.status)} · ${selected.size} · ${selected.time}`}
              />
            </div>
          ) : (
            <div className="grid min-h-0 place-items-center rounded-lg border border-line bg-panel text-dim">
              <div className="text-center">
                <p className="text-[13px]">No request selected</p>
                <p className="mt-1 font-mono text-[10.5px] text-mute">
                  select a row in HTTP history to inspect it
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Issue inspector */}
        <Panel className="max-[1120px]:hidden">
          <IssueInspector
            issues={issues}
            activeId={issueId}
            activeScan={activeScan ?? null}
            onSelect={setIssueId}
          />
        </Panel>
      </main>
    </div>
  );
}
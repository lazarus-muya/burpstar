"use client";

import { useEffect, useState } from "react";
import type { RelayResult, SavedRequest } from "@/lib/types";
import { cn, formatBytes, reqLine, splitRaw, statusText } from "@/lib/utils";
import { api, post } from "@/lib/client/api";
import { Button, Panel, PanelHead, CountPill } from "@/components/ui";
import MessageViewer from "@/components/modules/proxy/viewer";
import { Icon } from "@/components/icons";

interface RepeaterTab {
  id: number;
  name: string;
  req: string;
  host: string;
  roundTrip: number | null;
  sentCount: number;
  lastRes: string | null;
  servedBy: "live" | "demo" | "error" | null;
}

function blankReq(): string {
  return `GET / HTTP/1.1
User-Agent: BurpStar/2.4
Accept: */*
Connection: close`;
}

export default function RepeaterModule() {
  const [tabs, setTabs] = useState<RepeaterTab[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { requests } = await api<{ requests: SavedRequest[] }>("/api/savedRequests");
        if (!alive) return;
        const seeded = requests.map((r, i) => ({
          id: i + 1,
          name: r.name,
          req: r.req,
          host: r.host,
          roundTrip: null,
          sentCount: 0,
          lastRes: null,
          servedBy: null,
        }));
        setTabs(seeded);
        setActive(seeded[0]?.id ?? null);
        setNextId(seeded.length + 1);
      } catch {
        if (alive) {
          setTabs([]);
          setActive(null);
          setNextId(1);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tab = tabs.find((t) => t.id === active) ?? tabs[0];

  const send = async () => {
    if (!tab || sending) return;
    setSending(true);
    try {
      const result = await post<RelayResult>("/api/relay", { raw: tab.req, host: tab.host || undefined });
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? {
                ...t,
                roundTrip: result.timeMs,
                sentCount: t.sentCount + 1,
                lastRes: result.rawRes || `HTTP/${result.servedBy === "error" ? "1.1" : "1.1"} ${result.status} ${statusText(result.status)}`,
                servedBy: result.servedBy,
              }
            : t,
        ),
      );
    } catch {
      /* surface via servedBy none */
    } finally {
      setSending(false);
    }
  };

  const addTab = () => {
    const id = nextId;
    setNextId(id + 1);
    setTabs((prev) => [...prev, { id, name: `request-${id}`, req: blankReq(), host: "", roundTrip: null, sentCount: 0, lastRes: null, servedBy: null }]);
    setActive(id);
  };

  const closeTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (active === id && next.length) setActive(next[next.length - 1]?.id ?? null);
      return next;
    });
  };

  const updateReq = (value: string) =>
    setTabs((prev) => prev.map((t) => (t.id === tab?.id ? { ...t, req: value } : t)));

  const updateHost = (value: string) =>
    setTabs((prev) => prev.map((t) => (t.id === tab?.id ? { ...t, host: value } : t)));

  const copy = () => tab && void navigator.clipboard?.writeText(tab.req);

  const headers = tab ? splitRaw(tab.req).headers : [];
  const ctHeader = tab ? headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "" : "";
  const res = tab?.lastRes;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab strip */}
      <div className="flex h-[34px] flex-none items-center gap-0.5 border-b border-line bg-panel-2 px-2">
        <span className="px-2 text-[10px] font-bold tracking-[.07em] text-mute uppercase">
          Repeater
        </span>
        {tabs.map((t) => (
          <span
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "group flex h-full cursor-pointer items-center gap-1.5 border-r border-line px-3 text-[11px] text-dim transition-colors hover:bg-panel-3 hover:text-text",
              active === t.id && "bg-panel bg-gradient-to-b from-panel to-panel text-text shadow-[inset_0_2px_0_var(--color-accent)]",
            )}
          >
            {t.name}
            {t.sentCount > 0 && (
              <span className="rounded bg-panel-4 px-1 font-mono text-[9px] text-mute">
                ×{t.sentCount}
              </span>
            )}
            <button
              onClick={(e) => closeTab(t.id, e)}
              className="hidden shrink-0 text-mute transition-colors group-hover:block hover:text-red"
              title="Close tab"
            >
              <Icon name="trash" size={11} />
            </button>
          </span>
        ))}
        <button
          onClick={addTab}
          className="mx-1 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text"
          title="New tab"
        >
          <Icon name="plus" size={13} />
        </button>
        <div className="flex-1" />
        <span className="font-mono text-[10px] text-mute">
          {tab ? `${tab.req.length} B · HTTP/1.1${ctHeader && ` · ${ctHeader}`}` : ""}
        </span>
      </div>

      {tab ? (
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3 max-[1100px]:grid-cols-1">
        {/* Editor */}
        <Panel>
          <PanelHead
            title="Request"
            count={<CountPill>{tab.sentCount} sent</CountPill>}
            actions={
              <div className="mr-1 flex items-center gap-1.5">
                <Button size="sm" icon="copy" onClick={copy}>
                  Copy
                </Button>
                <Button variant="primary" size="sm" icon="send" onClick={() => void send()} disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            }
          />
          <div className="flex flex-none items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
            <span className="rounded border border-line px-2 py-0.5 font-mono text-[9px] text-green">
              HTTP/1.1
            </span>
            <input
              value={tab.host}
              onChange={(e) => updateHost(e.target.value)}
              className="h-[24px] min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-2 font-mono text-[10.5px] text-dim outline-none focus:border-accent/40"
              placeholder="host[:port] — overrides Host header"
            />
            {tab.roundTrip != null && (
              <span
                className={cn(
                  "font-mono text-[10px]",
                  tab.servedBy === "error" ? "text-red" : "text-green",
                )}
              >
                {tab.roundTrip} ms · {tab.servedBy}
              </span>
            )}
          </div>
          <textarea
            value={tab.req}
            onChange={(e) => updateReq(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-bg p-3 font-mono text-[11.5px] leading-[1.65] whitespace-pre text-[#c9d1d9] outline-none"
          />
        </Panel>

        {/* Response */}
        <div className="flex min-h-0 flex-col">
          <MessageViewer side="res" raw={res ?? ""} url={res ? responseMeta(res) : "— no response yet —"} />
          <div className="flex flex-none items-center justify-between border-t border-line bg-panel-2 px-3 py-1.5">
            <span className="font-mono text-[10px] text-mute">
              {res ? `${splitRaw(res).headers.length} headers · ${res.length} bytes` : "press Send to relay the request"}
            </span>
            <span className="font-mono text-[10px] text-green">
              {tab.roundTrip != null ? `${tab.roundTrip} ms round-trip` : "not sent yet"}
            </span>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center text-mute">
          <div className="text-center">
            <p className="text-[12px] leading-[1.7]">
              No tabs yet.
              <br />
              Use <span className="text-accent-2">+</span> in the tab strip to create a request.
            </p>
            <Button size="sm" icon="plus" className="mt-3" onClick={addTab}>
              New tab
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function responseMeta(res: string): string {
  const line = reqLine(res);
  const m = line.match(/^HTTP\/[\d.]+\s(\d+)/);
  if (!m) return line;
  return `${m[1]} ${statusText(Number(m[1]))} · ${formatBytes(res.length)}`;
}
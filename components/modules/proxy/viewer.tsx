"use client";

import { useState } from "react";
import { cn, hexDump, reqLine, splitRaw } from "@/lib/utils";
import { highlightRaw } from "@/lib/highlight";

interface ViewerProps {
  side: "req" | "res";
  raw: string;
  url: string;
}

const REQ_TABS = ["Raw", "Headers", "Params", "Hex"] as const;
const RES_TABS = ["Raw", "Headers", "Render", "Hex"] as const;

export default function MessageViewer({ side, raw, url }: ViewerProps) {
  const [tab, setTab] = useState<(typeof REQ_TABS)[number] | (typeof RES_TABS)[number]>("Raw");
  const [lastRaw, setLastRaw] = useState(raw);
  if (lastRaw !== raw) {
    setLastRaw(raw);
    setTab("Raw");
  }

  const parseParams = () => {
    const line = reqLine(raw);
    const urlMatch = line.match(/^\S+\s+(\S+)/);
    const full = urlMatch?.[1] ?? "";
    const [path, query] = full.split("?");
    const params: [string, string][] = [];
    if (query) new URLSearchParams(query).forEach((v, k) => params.push([k, v]));
    const { headers, body } = splitRaw(raw);
    const ct =
      headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "application/octet-stream";
    if (body) {
      if (ct.includes("json")) {
        try {
          const obj = JSON.parse(body);
          const flat: [string, string][] = [];
          const walk = (o: unknown, prefix = "") => {
            if (o === null) flat.push([prefix || "root", "null"]);
            else if (Array.isArray(o)) o.forEach((v, i) => walk(v, prefix ? `${prefix}[${i}]` : `[${i}]`));
            else if (typeof o === "object")
              Object.entries(o as Record<string, unknown>).forEach(([k, v]) =>
                walk(v, prefix ? `${prefix}.${k}` : k),
              );
            else flat.push([prefix || "root", String(o)]);
          };
          walk(obj);
          flat.forEach((p) => params.push(p));
        } catch {
          params.push(["$body", body]);
        }
      } else if (ct.includes("urlencoded")) {
        new URLSearchParams(body).forEach((v, k) => params.push([k, v]));
      } else {
        params.push(["$body", body || "(empty)"]);
      }
    }
    return { params, path };
  };

  const renderTab = () => {
    switch (tab) {
      case "Raw":
        return (
          <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11.5px] leading-[1.65] whitespace-pre text-[#c9d1d9] tab-size-2">
            {highlightRaw(raw)}
          </pre>
        );
      case "Headers": {
        const { headers } = splitRaw(raw);
        return (
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {headers.length === 0 && (
              <p className="p-2 font-mono text-[11px] text-mute">— no headers —</p>
            )}
            {headers.map(([k, v], i) => (
              <div key={`${k}-${i}`} className="flex gap-3 px-2 py-[3px] font-mono text-[11px]">
                <span className="flex-none text-blue">{k}</span>
                <span className="min-w-0 break-all text-dim">{v}</span>
              </div>
            ))}
          </div>
        );
      }
      case "Params": {
        const { params, path } = parseParams();
        return (
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <div className="mb-2 px-2 font-mono text-[10.5px] text-mute">{path}</div>
            {params.length === 0 && (
              <p className="p-2 font-mono text-[11px] text-mute">— no parameters —</p>
            )}
            {params.map(([k, v], i) => (
              <div key={`${k}-${i}`} className="flex gap-3 px-2 py-[3px] font-mono text-[11px]">
                <span className="flex-none text-amber">{k}</span>
                <span className="min-w-0 break-all text-dim">{v}</span>
              </div>
            ))}
          </div>
        );
      }
      case "Render": {
        const { headers, body } = splitRaw(raw);
        const ct =
          headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "text/html";
        const isHtml = ct.includes("html") || ct.includes("xml");
        if (!isHtml) return <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11.5px] whitespace-pre text-dim">{body || "(empty body)"}</pre>;
        return (
          <iframe
            title="rendered response"
            srcDoc={body || "<p></p>"}
            sandbox=""
            className="min-h-0 w-full flex-1 rounded-b-lg bg-white"
          />
        );
      }
      case "Hex":
        return (
          <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-[1.6] whitespace-pre text-dim">
            {hexDump(raw)}
          </pre>
        );
    }
  };

  const tabs = side === "req" ? REQ_TABS : RES_TABS;

  return (
    <div className="pane flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel">
      <div className="flex h-[34px] flex-none items-center gap-2.5 border-b border-line bg-panel-2 px-3">
        <span className="flex-none text-[10.5px] font-bold tracking-[.07em] text-dim uppercase">
          {side === "req" ? "Request" : "Response"}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-mute">{url}</span>
        <div className="flex h-full flex-none items-center">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex h-full items-center px-[9px] text-[11px] text-mute transition-colors hover:text-text",
                tab === t && "text-text shadow-[inset_0_-2px_0_var(--color-accent)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{renderTab()}</div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { Button, Divider } from "@/components/ui";

interface ToolbarProps {
  intercept: boolean;
  onToggleIntercept: () => void;
  search: string;
  onSearch: (value: string) => void;
  total: number;
  visible: number;
  onClear: () => void;
  onDrop: () => void;
}

export default function ProxyToolbar({
  intercept,
  onToggleIntercept,
  search,
  onSearch,
  total,
  visible,
  onClear,
  onDrop,
}: ToolbarProps) {
  return (
    <div className="flex h-[42px] flex-none items-center gap-2 border-b border-line bg-panel px-2.5">
      <Button variant="primary" icon="forward">
        Forward
      </Button>
      <Button icon="ban" onClick={onDrop}>Drop</Button>
      <Button variant={intercept ? "toggle" : "default"} onClick={onToggleIntercept}>
        <span className="flex items-center gap-1.5">
          <span
            className={
              intercept
                ? "inline-block h-[6px] w-[6px] rounded-full bg-green shadow-[0_0_6px_rgba(61,220,151,.8)]"
                : "inline-block h-[6px] w-[6px] rounded-full bg-mute"
            }
          />
          {intercept ? "Intercept" : "Intercept"}
        </span>
      </Button>
      <Divider />
      <Button>
        Action <span className="text-dim">▾</span>
      </Button>
      <Divider />
      <div className="flex h-[28px] max-w-[520px] flex-1 items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 text-mute transition-colors focus-within:border-accent/40">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Filter requests — status:500 AND mime:html"
          className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-text outline-none placeholder:font-sans placeholder:normal-case placeholder:text-mute"
        />
        <span className="font-mono text-[10px] text-mute">
          {visible}/{total}
        </span>
      </div>
      <div className="flex-1" />
      <Button onClick={onClear}>Clear history</Button>
      <Link href="/scanner">
        <Button variant="accent" icon="bolt">
          New Scan
        </Button>
      </Link>
    </div>
  );
}
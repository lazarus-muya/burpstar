"use client";

import { useState } from "react";
import type { SiteNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui";

interface NavigatorProps {
  tree: SiteNode[];
  activeId: string | null;
  onSelect: (node: SiteNode | null) => void;
}

const HOST_COLOR: Record<string, string> = {
  blue: "bg-blue shadow-[0_0_6px_rgba(77,159,255,.5)]",
  purple: "bg-purple shadow-[0_0_6px_rgba(178,141,255,.5)]",
  amber: "bg-amber shadow-[0_0_6px_rgba(255,176,32,.5)]",
};

export default function Navigator({ tree, activeId, onSelect }: NavigatorProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(tree.filter((n) => n.defaultClosed).map((n) => n.id)),
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function renderNode(node: SiteNode, depth: number) {
    const isClosed = collapsed.has(node.id);
    const isFolder = node.kind !== "leaf";
    const active = activeId === node.id;

    const row = (
      <button
        key={node.id}
        onClick={() => {
          if (isFolder) toggle(node.id);
          onSelect(node);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 border-l-2 border-transparent py-[4px] pr-3 text-left text-[11.5px] whitespace-nowrap text-dim transition-colors hover:bg-panel-2 hover:text-text",
          node.kind === "folder" && "font-medium text-[#c3cbd6]",
          active && "border-l-accent bg-[rgba(255,122,47,.09)] text-accent-2",
          "",
        )}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {isFolder ? (
          <span className="w-[9px] flex-none text-center text-[8px] text-mute">
            {isClosed ? "▸" : "▾"}
          </span>
        ) : (
          <span className="h-[5px] w-[5px] flex-none rounded-full border border-[#3a424e] bg-panel-4" />
        )}
        {node.kind === "host" && (
          <span
            className={cn("h-[6px] w-[6px] flex-none rounded-[2px]", HOST_COLOR[node.color ?? "blue"])}
          />
        )}
        <span className="truncate">{node.label}</span>
      </button>
    );

    let childrenRows: React.ReactNode[] = [];
    if (isFolder && !isClosed && node.children) {
      childrenRows = node.children.map((c) => renderNode(c, depth + 1));
    }

    return [row, ...childrenRows];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-line bg-panel-2 px-[10px] py-1">
        <span className="text-[10.5px] font-bold tracking-[.07em] text-dim uppercase">
          Navigator
        </span>
      </div>
      <div className="flex-1 overflow-auto pb-2.5 pt-1.5">
        {tree.map((n) => renderNode(n, 0))}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "mt-1 flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-1 text-left text-[10.5px] text-mute transition-colors hover:bg-panel-2 hover:text-dim",
            activeId === null && "border-l-accent bg-[rgba(255,122,47,.09)] text-accent-2",
          )}
        >
          <span className="h-[5px] w-[5px] flex-none rounded-full border border-[#3a424e] bg-panel-4" />
          All hosts
        </button>
      </div>
    </div>
  );
}

export function NavigatorHeader() {
  return (
    <div className="flex h-[33px] flex-none items-center justify-between border-b border-line bg-panel-2 px-[10px]">
      <span className="text-[10.5px] font-bold tracking-[.07em] text-dim uppercase">
        Navigator
      </span>
      <IconButton icon="collapse" size={13} title="Collapse all" />
    </div>
  );
}
"use client";

import type { TrafficEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MethodBadge, StatusBadge } from "@/components/ui";

interface HistoryProps {
  entries: TrafficEntry[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function HistoryTable({ entries, selectedId, onSelect }: HistoryProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {entries.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-dim">
          <span className="text-[36px] opacity-30">◎</span>
          <p className="text-[11.5px]">No requests match the current scope or filter.</p>
          <p className="font-mono text-[10px] text-mute">
            try clearing the filter or expanding the navigator
          </p>
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-0 text-[11.5px]">
          <thead>
            <tr>
              <th style={{ width: 34 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                #
              </th>
              <th style={{ width: 74 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Method
              </th>
              <th style={{ width: 190 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Host
              </th>
              <th className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Path
              </th>
              <th style={{ width: 64 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Status
              </th>
              <th style={{ width: 70 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-right text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Size
              </th>
              <th style={{ width: 64 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-left text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                MIME
              </th>
              <th style={{ width: 74 }} className="sticky top-0 z-3 border-b border-line bg-panel-2 px-[10px] py-[7px] text-right text-[10px] font-bold tracking-[.06em] whitespace-nowrap text-mute uppercase">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r) => (
              <tr
                key={`${r.id}-${r.method}-${r.path}`}
                onClick={() => onSelect(r.id)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-panel-2",
                  selectedId === r.id &&
                    "bg-[rgba(255,122,47,.08)] shadow-[inset_2px_0_0_var(--color-accent)]",
                )}
              >
                <td className="border-b border-line/55 px-[10px] py-[6px] font-mono text-[10.5px] whitespace-nowrap text-mute">
                  {r.id}
                </td>
                <td className="border-b border-line/55 px-[10px] py-[6px] whitespace-nowrap">
                  <MethodBadge method={r.method} />
                </td>
                <td className="overflow-hidden border-b border-line/55 px-[10px] py-[6px] text-[11px] whitespace-nowrap text-dim">
                  {r.host}
                </td>
                <td
                  className="max-w-[340px] overflow-hidden border-b border-line/55 px-[10px] py-[6px] font-mono text-[11px] whitespace-nowrap text-[#cdd5df]"
                  title={r.path}
                >
                  <span className="block truncate">{r.path}</span>
                </td>
                <td className="border-b border-line/55 px-[10px] py-[6px] whitespace-nowrap">
                  <StatusBadge status={r.status} />
                </td>
                <td className="border-b border-line/55 px-[10px] py-[6px] font-mono text-[10.5px] whitespace-nowrap text-right text-mute">
                  {r.size}
                </td>
                <td className="border-b border-line/55 px-[10px] py-[6px] text-[10.5px] whitespace-nowrap text-mute">
                  {r.mime}
                </td>
                <td className="border-b border-line/55 px-[10px] py-[6px] font-mono text-[10.5px] whitespace-nowrap text-right text-mute">
                  {r.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
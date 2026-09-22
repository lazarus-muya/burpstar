"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Chip, LiveDot } from "@/components/ui";

const NAV = [
  { label: "Dashboard", href: "/" },
  { label: "Target", href: "/target" },
  { label: "Proxy", href: "/proxy" },
  { label: "Intruder", href: "/intruder" },
  { label: "Repeater", href: "/repeater" },
  { label: "Scanner", href: "/scanner" },
  { label: "Decoder", href: "/decoder" },
  { label: "Comparer", href: "/comparer" },
  { label: "Extender", href: "/extender" },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 flex h-[46px] flex-none items-center gap-5 border-b border-line bg-gradient-to-b from-[#161a20] to-[#101317] px-3">
      <div className="brand flex items-center gap-[9px] pr-1.5">
        <div className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-gradient-to-br from-[#ff9a5c] to-[#ff5f2e] text-[13px] font-extrabold text-[#1a0d04] shadow-[0_2px_10px_rgba(255,122,47,.35)]">
          S
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-semibold tracking-[.01em]">BurpStar</span>
          <span className="rounded border border-[rgba(255,122,47,.4)] bg-[rgba(255,122,47,.1)] px-[5px] py-[2px] text-[8.5px] font-extrabold tracking-[.1em] text-accent-2">
            PRO
          </span>
        </div>
      </div>

      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-[11px] py-[6px] text-[12.5px] text-dim transition-colors hover:bg-panel-3 hover:text-text",
                active &&
                  "bg-[rgba(255,122,47,.12)] text-accent-2 shadow-[inset_0_0_0_1px_rgba(255,122,47,.22)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-none items-center gap-2">
        <Chip tone="live">
          <LiveDot /> Intercept on
        </Chip>
        <Chip>Scope · 3 hosts</Chip>
        <button
          className="grid h-[28px] w-[28px] place-items-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text"
          title="Notifications"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>
        <button
          className="grid h-[28px] w-[28px] place-items-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text"
          title="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.6.66 1.03 1.28 1.03H21a2 2 0 1 1 0 4h-.09c-.62 0-1.14.43-1.28 1.03z" />
          </svg>
        </button>
        <div className="grid h-[27px] w-[27px] place-items-center rounded-full bg-gradient-to-br from-blue to-purple text-[10px] font-bold tracking-[.02em] text-white">
          AK
        </div>
      </div>
    </header>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Chip, LiveDot } from "@/components/ui";
import { Icon } from "@/components/icons";
import { api } from "@/lib/client/api";
import type { ActivityEvent, Issue, ScanRecord } from "@/lib/types";

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

interface UISettings {
  intercept: boolean;
  alerts: boolean;
  activityInFeed: boolean;
  pollInterval: number;
}

const DEFAULT_SETTINGS: UISettings = {
  intercept: true,
  alerts: true,
  activityInFeed: true,
  pollInterval: 6,
};

const SETTINGS_KEY = "burpstar:settings";

function loadSettings(): UISettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UISettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type NotifTone = "red" | "amber" | "blue" | "green" | "dim";

interface NotifItem {
  id: string;
  kind: "issue" | "scan" | "activity";
  title: string;
  detail: string;
  at?: string;
  tone: NotifTone;
}

const TONE_DOT: Record<NotifTone, string> = {
  red: "bg-red shadow-[0_0_6px_rgba(255,95,86,.7)]",
  amber: "bg-amber",
  blue: "bg-blue shadow-[0_0_6px_rgba(77,159,255,.5)]",
  green: "bg-green shadow-[0_0_6px_rgba(61,220,151,.8)]",
  dim: "bg-[#5c6470]",
};

const TONE_TEXT: Record<NotifTone, string> = {
  red: "text-red",
  amber: "text-amber",
  blue: "text-blue",
  green: "text-green",
  dim: "text-dim",
};

const SEVERITY_TONE: Record<Issue["severity"], NotifTone> = {
  high: "red",
  medium: "amber",
  low: "blue",
  info: "dim",
};

const SCAN_LABEL: Record<ScanRecord["status"], string> = {
  queued: "Scan queued",
  running: "Scan running",
  done: "Scan complete",
  error: "Scan failed",
};

const SCAN_TONE: Record<ScanRecord["status"], NotifTone> = {
  queued: "blue",
  running: "amber",
  done: "green",
  error: "red",
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-[16px] w-[30px] flex-none rounded-full border transition-colors",
        on
          ? "border-[rgba(61,220,151,.5)] bg-[rgba(61,220,151,.25)]"
          : "border-line-2 bg-panel-4",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full transition-all",
          on ? "left-[17px] bg-green" : "left-[3px] bg-mute",
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
      <div className="min-w-0">
        <div className="text-[11.5px] font-medium text-text">{label}</div>
        {desc && <div className="text-[10px] leading-[1.35] text-mute">{desc}</div>}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<"notif" | "settings" | null>(null);
  const [settings, setSettings] = useState<UISettings>(loadSettings);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const settingsRef = useRef(settings);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    openRef.current = open === "notif";
  }, [open]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!settingsRef.current.alerts) return;
      try {
        const [issues, scans, sitemap] = await Promise.all([
          api<{ issues: Issue[] }>("/api/issues"),
          api<{ scans: ScanRecord[] }>("/api/scans"),
          api<{ activity: ActivityEvent[] }>("/api/sitemap"),
        ]);
        if (!alive) return;

        const items: NotifItem[] = [];
        itemize(issues.issues, scans.scans, sitemap.activity, settingsRef.current, items);

        const next = items.filter((n) => !dismissedRef.current.has(n.id)).slice(0, 40);
        setNotifs((prev) => {
          const prevIds = new Set(prev.map((n) => n.id));
          const fresh = next.filter((n) => !prevIds.has(n.id));
          if (!openRef.current && fresh.length) setUnread((u) => u + fresh.length);
          return next;
        });
      } catch {
        /* ignore */
      }
    };
    void tick();
    const ms = Math.max(2, settings.pollInterval) * 1000;
    const timer = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [settings.alerts, settings.pollInterval, settings.activityInFeed]);

  const updateSettings = (patch: Partial<UISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const togglePanel = (which: "notif" | "settings") => {
    setOpen((cur) => (cur === which ? null : which));
    if (which === "notif") setUnread(0);
  };

  const dismiss = (id: string) => {
    dismissedRef.current.add(id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    dismissedRef.current = new Set();
    setNotifs([]);
    setUnread(0);
  };

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
        <Chip tone={settings.intercept ? "live" : "default"}>
          <LiveDot color={settings.intercept ? "green" : "red"} />
          Intercept {settings.intercept ? "on" : "off"}
        </Chip>
        <Chip>Scope · 3 hosts</Chip>

        <div ref={rootRef} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className={cn(
                  "grid h-[28px] w-[28px] place-items-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text",
                  open === "notif" && "bg-panel-3 text-text",
                )}
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={open === "notif"}
                onClick={() => togglePanel("notif")}
              >
                <Icon name="bell" size={15} />
              </button>
              {settings.alerts && unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[13px] min-w-[13px] place-items-center rounded-full bg-red px-[3px] text-[8.5px] font-bold leading-none text-[#1a0d04] shadow-[0_2px_6px_rgba(255,95,86,.6)]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            <button
              className={cn(
                "grid h-[28px] w-[28px] place-items-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text",
                open === "settings" && "bg-panel-3 text-text",
              )}
              aria-label="Settings"
              aria-haspopup="true"
              aria-expanded={open === "settings"}
              onClick={() => togglePanel("settings")}
            >
              <Icon name="gear" size={15} />
            </button>
          </div>

          {open === "notif" && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-lg border border-line-2 bg-panel shadow-[0_18px_50px_rgba(0,0,0,.55)]">
              <div className="flex h-[36px] flex-none items-center justify-between border-b border-line bg-panel-2 px-3">
                <span className="text-[10.5px] font-bold tracking-[.08em] text-dim uppercase">
                  Notifications
                </span>
                {unread > 0 && (
                  <button
                    onClick={() => setUnread(0)}
                    className="text-[10px] font-medium text-mute transition-colors hover:text-text"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[400px] min-h-[100px] overflow-auto p-1">
                {notifs.length === 0 ? (
                  <div className="flex min-h-[100px] flex-col items-center justify-center gap-1 px-4 text-center">
                    <p className="text-[11.5px] text-dim">No notifications yet</p>
                    <p className="max-w-[230px] text-[10.5px] leading-[1.45] text-mute">
                      Issues, scan events and activity will show up here as you work.
                    </p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-start gap-2.5 rounded-md px-2 py-[7px] transition-colors hover:bg-panel-2"
                    >
                      <span
                        className={cn(
                          "mt-[5px] h-[7px] w-[7px] flex-none rounded-full",
                          TONE_DOT[n.tone],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-[11.5px] font-medium",
                            TONE_TEXT[n.tone],
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="truncate font-mono text-[9.5px] text-mute">
                          {n.detail}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-1">
                        {n.at && (
                          <span className="font-mono text-[9px] text-mute">{n.at}</span>
                        )}
                        <button
                          aria-label="Dismiss notification"
                          onClick={() => dismiss(n.id)}
                          className="grid h-[16px] w-[16px] place-items-center rounded text-mute opacity-0 transition-opacity hover:bg-panel-4 hover:text-text group-hover:opacity-100"
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={clearAll}
                className="block h-[30px] w-full flex-none border-t border-line bg-panel-2 text-[10px] font-semibold text-mute transition-colors hover:bg-panel-3 hover:text-text"
              >
                Clear all
              </button>
            </div>
          )}

          {open === "settings" && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] overflow-hidden rounded-lg border border-line-2 bg-panel shadow-[0_18px_50px_rgba(0,0,0,.55)]">
              <div className="flex h-[36px] flex-none items-center justify-between border-b border-line bg-panel-2 px-3">
                <span className="text-[10.5px] font-bold tracking-[.08em] text-dim uppercase">
                  Settings
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-mute">
                  <span
                    className={cn(
                      "h-[6px] w-[6px] rounded-full",
                      settings.alerts ? "bg-green" : "bg-mute",
                    )}
                  />
                  {settings.alerts ? "live" : "paused"}
                </span>
              </div>
              <div className="p-1.5">
                <SettingRow
                  label="Intercept"
                  desc="Show intercept state in the top bar"
                >
                  <Toggle
                    on={settings.intercept}
                    onChange={(v) => updateSettings({ intercept: v })}
                  />
                </SettingRow>
                <SettingRow
                  label="Live alerts"
                  desc="Poll for new issues, scan events and activity"
                >
                  <Toggle
                    on={settings.alerts}
                    onChange={(v) => updateSettings({ alerts: v })}
                  />
                </SettingRow>
                <SettingRow
                  label="Activity in feed"
                  desc="Include activity log entries in notifications"
                >
                  <Toggle
                    on={settings.activityInFeed}
                    onChange={(v) => updateSettings({ activityInFeed: v })}
                  />
                </SettingRow>
                <SettingRow
                  label="Poll interval"
                  desc="How often the notification feed refreshes"
                >
                  <select
                    aria-label="Notification poll interval"
                    value={settings.pollInterval}
                    onChange={(e) => updateSettings({ pollInterval: Number(e.target.value) })}
                    className="h-[22px] rounded border border-line-2 bg-panel-3 px-1 text-[10.5px] text-dim outline-none transition-colors hover:border-[#3a424e]"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                  </select>
                </SettingRow>
              </div>
              <button
                onClick={() => updateSettings(DEFAULT_SETTINGS)}
                className="block h-[30px] w-full flex-none border-t border-line bg-panel-2 text-[10px] font-semibold text-mute transition-colors hover:bg-panel-3 hover:text-text"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function itemize(
  issues: Issue[],
  scans: ScanRecord[],
  activity: ActivityEvent[],
  settings: UISettings,
  items: NotifItem[],
) {
  for (const i of issues) {
    items.push({
      id: `issue:${i.id}`,
      kind: "issue",
      title: i.title,
      detail: `${i.host}${i.path}${i.parameter ? `?${i.parameter}` : ""}`,
      at: i.discovered,
      tone: SEVERITY_TONE[i.severity],
    });
  }
  for (const s of scans.slice(0, 4)) {
    items.push({
      id: `scan:${s.id}`,
      kind: "scan",
      title: `${SCAN_LABEL[s.status]} — #${s.id}`,
      detail: s.target,
      at: s.createdAt,
      tone: SCAN_TONE[s.status],
    });
  }
  if (settings.activityInFeed) {
    for (const a of activity) {
      items.push({
        id: `act:${a.at}:${a.module}:${a.text}`,
        kind: "activity",
        title: a.text,
        detail: a.module,
        at: a.at,
        tone: "dim",
      });
    }
  }
}
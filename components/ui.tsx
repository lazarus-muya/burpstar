import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { HttpMethod, Severity } from "@/lib/types";
import { Icon } from "@/components/icons";

/* ---------------- Buttons ---------------- */

type BtnVariant = "default" | "primary" | "accent" | "toggle";

const BTN_STYLES: Record<BtnVariant, string> = {
  default:
    "border border-line-2 bg-panel-3 text-text hover:bg-panel-4 hover:border-[#3a424e]",
  primary:
    "border-accent bg-gradient-to-b from-[#ff8b45] to-[#f26a1e] text-[#1a0d04] font-semibold shadow-[0_1px_8px_rgba(255,122,47,.28)] hover:from-[#ff9a5c] hover:to-[#ff7a2f]",
  accent:
    "border-[rgba(255,122,47,.35)] bg-[rgba(255,122,47,.08)] text-accent-2 hover:bg-[rgba(255,122,47,.16)]",
  toggle:
    "border-[rgba(61,220,151,.35)] bg-[rgba(61,220,151,.08)] text-green hover:bg-[rgba(61,220,151,.16)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md";
  icon?: string;
}

export function Button({
  variant = "default",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 rounded-md transition-colors",
        size === "md" && "h-[27px] px-[11px] text-[11.5px]",
        size === "sm" && "h-[26px] px-[9px] text-[11px]",
        BTN_STYLES[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 11 : 12} />}
      {children}
    </button>
  );
}

export function IconButton({
  className,
  icon,
  size = 15,
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  size?: number;
}) {
  return (
    <button
      className={cn(
        "grid h-[28px] w-[28px] place-items-center rounded-md text-dim transition-colors hover:bg-panel-3 hover:text-text",
        className,
      )}
      title={title}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Divider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-line-2" />;
}

/* ---------------- Chips ---------------- */

export function Chip({ children, tone }: { children: ReactNode; tone?: "default" | "live" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-panel-2 px-[9px] py-[4px] text-[10.5px] font-semibold text-dim",
        tone === "live" &&
          "border-[rgba(61,220,151,.28)] bg-[rgba(61,220,151,.07)] text-green",
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ color = "green" }: { color?: "green" | "red" | "amber" | "blue" }) {
  const cls = {
    green: "bg-green shadow-[0_0_6px_rgba(61,220,151,.8)]",
    red: "bg-red shadow-[0_0_6px_rgba(255,95,86,.7)]",
    amber: "bg-amber",
    blue: "bg-blue shadow-[0_0_6px_rgba(77,159,255,.5)]",
  }[color];
  return <span className={cn("inline-block h-[6px] w-[6px] rounded-full", cls)} />;
}

/* ---------------- Panel ---------------- */

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  count,
  actions,
  className,
}: {
  title: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[33px] flex-none items-center justify-between border-b border-line bg-panel-2 px-[10px]",
        className,
      )}
    >
      <div className="flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.07em] text-dim uppercase">
        {title}
        {count}
      </div>
      <div className="flex items-center gap-0.5">{actions}</div>
    </div>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-panel-4 px-[6px] py-px text-[9.5px] font-bold tracking-normal text-dim normal-case">
      {children}
    </span>
  );
}

/* ---------------- HTTP badges ---------------- */

const METHOD_TONES: Record<HttpMethod, string> = {
  GET: "text-green bg-[rgba(61,220,151,.11)]",
  POST: "text-amber bg-[rgba(255,176,32,.11)]",
  PUT: "text-blue bg-[rgba(77,159,255,.11)]",
  DELETE: "text-red bg-[rgba(255,95,86,.11)]",
  PATCH: "text-purple bg-[rgba(178,141,255,.11)]",
  HEAD: "text-green bg-[rgba(61,220,151,.11)]",
  OPTIONS: "text-purple bg-[rgba(178,141,255,.11)]",
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-block min-w-[48px] rounded px-[6px] py-[2px] text-center font-mono text-[9.5px] font-extrabold tracking-[.04em]",
        METHOD_TONES[method],
      )}
    >
      {method}
    </span>
  );
}

export function StatusBadge({ status }: { status: number }) {
  const prefix = String(status)[0];
  const cls =
    prefix === "2"
      ? "text-green"
      : prefix === "3"
        ? "text-blue"
        : prefix === "4"
          ? "text-amber"
          : prefix === "5"
            ? "text-red"
            : "text-dim";
  return <span className={cn("font-mono text-[11px] font-bold", cls)}>{status}</span>;
}

/* ---------------- Severity ---------------- */

const SEV_BADGE: Record<Severity, string> = {
  high: "text-[#ff9a92] bg-[rgba(255,95,86,.13)] border-[rgba(255,95,86,.32)]",
  medium: "text-[#ffc760] bg-[rgba(255,176,32,.12)] border-[rgba(255,176,32,.3)]",
  low: "text-[#7fd4ff] bg-[rgba(77,159,255,.12)] border-[rgba(77,159,255,.3)]",
  info: "text-[#a7b0bd] bg-[rgba(152,162,176,.1)] border-[rgba(152,162,176,.25)]",
};

const SEV_DOT: Record<Severity, string> = {
  high: "bg-red shadow-[0_0_7px_rgba(255,95,86,.6)]",
  medium: "bg-amber",
  low: "bg-blue",
  info: "bg-[#5c6470]",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "rounded border px-[7px] py-[2.5px] text-[9.5px] font-extrabold tracking-[.07em] uppercase",
        SEV_BADGE[severity],
      )}
    >
      {severity}
    </span>
  );
}

export function SeverityDot({ severity, className }: { severity: Severity; className?: string }) {
  return <span className={cn("inline-block h-[7px] w-[7px] flex-none rounded-full", SEV_DOT[severity], className)} />;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between text-[9.5px] font-bold tracking-[.08em] text-mute uppercase">
      {children}
      {right}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 overflow-hidden rounded-full bg-panel-4", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-amber shadow-[0_0_10px_rgba(255,122,47,.5)] transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
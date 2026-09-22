"use client";

import { useState } from "react";
import type { Issue, ScanRecord, TrafficEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api, post } from "@/lib/client/api";
import { Button, SeverityBadge, SeverityDot, ProgressBar } from "@/components/ui";

interface InspectorProps {
  issues: Issue[];
  activeId: string | null;
  activeScan: ScanRecord | null;
  onSelect: (id: string) => void;
}

export default function IssueInspector({ issues, activeId, activeScan, onSelect }: InspectorProps) {
  const [sentToRepeater, setSentToRepeater] = useState(false);
  const issue = issues.find((i) => i.id === activeId) ?? issues[0];

  const sendToRepeater = async () => {
    if (!issue) return;
    let raw = `GET ${issue.path} HTTP/1.1\nHost: ${issue.host}\n\n`;
    if (issue.relatedRequestId != null) {
      try {
        const entry = await api<TrafficEntry>(`/api/history/${issue.relatedRequestId}`);
        if (entry?.req) raw = entry.req;
      } catch {
        /* fall back to a minimal request */
      }
    }
    await post("/api/savedRequests", {
      name: `issue-${issue.id}`,
      req: raw,
      host: issue.host,
    }).catch(() => undefined);
    setSentToRepeater(true);
    setTimeout(() => setSentToRepeater(false), 1400);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-line bg-panel-2 px-[10px] py-[7px]">
        <div className="text-[10.5px] font-bold tracking-[.07em] text-dim uppercase">
          Issue inspector <span className="ml-1.5 rounded-full bg-panel-4 px-[6px] py-px text-[9.5px] font-bold text-dim normal-case">{issues.length}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2.5">
        {issue ? (
          <IssueCard
            issue={issue}
            sent={sentToRepeater}
            onRepeater={() => void sendToRepeater()}
          />
        ) : (
          <p className="py-10 text-center text-[11.5px] text-mute">
            No issues in the database yet.
            <br />
            <span className="font-mono text-[10px]">run a scan from the Scanner tab</span>
          </p>
        )}

        {issues.length > 0 && (
          <>
            <div className="mb-2 mt-4 flex items-center justify-between text-[9.5px] font-bold tracking-[.08em] text-mute uppercase">
              <span>All issues</span>
              <span>{issues.length} findings</span>
            </div>

            {issues.map((i) => (
              <button
                key={i.id}
                onClick={() => onSelect(i.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-[9px] py-[7px] text-left transition-colors hover:bg-panel-2",
                  activeId === i.id && "bg-[rgba(255,122,47,.08)]",
                )}
              >
                <SeverityDot severity={i.severity} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[11.5px] font-medium text-text">{i.title}</b>
                  <small className="block truncate font-mono text-[9.5px] text-mute">{i.host}</small>
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="flex-none border-t border-line bg-panel-2 p-3">
        <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
          <b className="font-semibold text-text">
            {activeScan
              ? `Active scan · ${activeScan.target.replace(/^https?:\/\//, "")}`
              : "No active scan"}
          </b>
          <span className={cn("font-mono", activeScan ? "text-accent-2" : "text-mute")}>
            {activeScan ? `${activeScan.progress}%` : "idle"}
          </span>
        </div>
        <ProgressBar value={activeScan?.progress ?? 0} />
        {activeScan && (
          <p className="mt-1.5 font-mono text-[9.5px] text-mute">
            phase: <span className="text-dim">{activeScan.phase}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  sent,
  onRepeater,
}: {
  issue: Issue;
  sent: boolean;
  onRepeater: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-panel-2">
      <div className="border-b border-line p-3">
        <div className="mb-2 flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="text-[13px] font-semibold tracking-[-.01em] text-text">
            {issue.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-mute">
          <span>{issue.host}</span>
          <span className="text-[#3a424e]">/</span>
          <span>{issue.path}</span>
          {issue.parameter && (
            <>
              <span className="text-[#3a424e]">·</span>
              <span>param: {issue.parameter}</span>
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" style={{ marginTop: 7 }}>
          <span className="rounded border border-line-2 px-[7px] py-[2.5px] text-[9.5px] text-mute">
            Confidence: {issue.confidence}
          </span>
          {issue.cvss && (
            <span className="rounded border border-line-2 px-[7px] py-[2.5px] text-[9.5px] text-mute">
              CVSS {issue.cvss}
            </span>
          )}
          {issue.cwe && (
            <span className="rounded border border-line-2 px-[7px] py-[2.5px] text-[9.5px] text-mute">
              {issue.cwe}
            </span>
          )}
        </div>
      </div>

      <Section label="Description">
        <p
          className="text-[11.5px] leading-[1.6] text-[#b9c2ce]"
          dangerouslySetInnerHTML={{ __html: issue.description }}
        />
      </Section>

      <Section label="Evidence">
        <pre className="max-h-[110px] overflow-auto rounded-md border border-line bg-[#0d1014] p-2.5 font-mono text-[10.5px] leading-[1.6] whitespace-pre-wrap break-words text-[#ff9a92]">
          {issue.evidence}
        </pre>
      </Section>

      <Section label="Remediation">
        <p
          className="text-[11.5px] leading-[1.6] text-[#b9c2ce]"
          dangerouslySetInnerHTML={{ __html: issue.remediation }}
        />
      </Section>

      <Section label="Details">
        {issue.details.map((d) => (
          <div key={d.label} className="flex justify-between py-[3px] text-[11px]">
            <span className="text-mute">{d.label}</span>
            <span className="font-mono text-text">{d.value}</span>
          </div>
        ))}
      </Section>

      <div className="flex gap-1.5 border-t border-line bg-panel p-2.5">
        <Button size="sm" className="flex-1" onClick={onRepeater}>
          {sent ? "✓ Copied to Repeater" : "Send to Repeater"}
        </Button>
        <Button size="sm" variant="accent" className="flex-1">
          Add to report
        </Button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line p-3 last:border-b-0">
      <div className="mb-1.5 text-[9.5px] font-bold tracking-[.08em] text-mute uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}
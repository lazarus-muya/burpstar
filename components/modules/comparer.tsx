"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, CountPill, Panel, PanelHead } from "@/components/ui";

const SAMPLE_A = `HTTP/1.1 200 OK
Server: nginx/1.24.0
Content-Type: application/json
X-Request-Id: 7f3c9a12b4

{"id":1,"role":"administrator","mfa_enabled":true}`;

const SAMPLE_B = `HTTP/1.1 200 OK
Server: nginx/1.24.0
Content-Type: application/json
X-Request-Id: 91be02ac77
X-Cache: HIT

{"id":1,"role":"user","mfa_enabled":false}`;

type DiffRow = { type: "same" | "add" | "del"; text: string };

function diffLines(a: string[], b: string[]): DiffRow[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", text: a[i] });
      i++;
    } else {
      rows.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: "del", text: a[i++] });
  while (j < m) rows.push({ type: "add", text: b[j++] });
  return rows;
}

export default function ComparerModule() {
  const [left, setLeft] = useState(SAMPLE_A);
  const [right, setRight] = useState(SAMPLE_B);
  const [compared, setCompared] = useState(false);

  const rows = useMemo(
    () => (compared ? diffLines(left.split("\n"), right.split("\n")) : []),
    [compared, left, right],
  );

  const stats = useMemo(() => {
    const add = rows.filter((r) => r.type === "add").length;
    const del = rows.filter((r) => r.type === "del").length;
    return { add, del, same: rows.length - add - del };
  }, [rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <Panel>
          <PanelHead title="Item 1" count={<CountPill>{left.split("\n").length} lines</CountPill>} />
          <textarea
            value={left}
            onChange={(e) => {
              setLeft(e.target.value);
              setCompared(false);
            }}
            spellCheck={false}
            className="h-[190px] resize-none bg-bg p-3 font-mono text-[11px] leading-[1.6] text-[#c9d1d9] outline-none"
          />
        </Panel>
        <Panel>
          <PanelHead title="Item 2" count={<CountPill>{right.split("\n").length} lines</CountPill>} />
          <textarea
            value={right}
            onChange={(e) => {
              setRight(e.target.value);
              setCompared(false);
            }}
            spellCheck={false}
            className="h-[190px] resize-none bg-bg p-3 font-mono text-[11px] leading-[1.6] text-[#c9d1d9] outline-none"
          />
        </Panel>
      </div>

      <Panel className="min-h-0 flex-1">
        <PanelHead
          title="Differences"
          count={
            compared ? (
              <CountPill>
                <span className="text-green">+{stats.add}</span>{" "}
                <span className="text-red">−{stats.del}</span> · {stats.same} unchanged
              </CountPill>
            ) : undefined
          }
          actions={
            <Button variant="primary" size="sm" icon="diff" className="mr-1" onClick={() => setCompared(true)}>
              Compare
            </Button>
          }
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {!compared ? (
            <div className="grid h-full place-items-center text-[11.5px] text-mute">
              Paste two messages and press Compare.
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 font-mono text-[11px]">
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="align-top">
                    <td
                      className={cn(
                        "w-[34px] border-b border-line/40 px-2 py-[2px] text-right text-[10px]",
                        r.type === "add" && "text-green",
                        r.type === "del" && "text-red",
                        r.type === "same" && "text-mute",
                      )}
                    >
                      {r.type === "add" ? "+" : r.type === "del" ? "−" : " "}
                    </td>
                    <td
                      className={cn(
                        "whitespace-pre-wrap break-words border-b border-line/40 px-2 py-[2px]",
                        r.type === "add" && "bg-[rgba(61,220,151,.08)] text-[#a7f0c9]",
                        r.type === "del" && "bg-[rgba(255,95,86,.08)] text-[#ffb0aa]",
                        r.type === "same" && "text-dim",
                      )}
                    >
                      {r.text || " "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
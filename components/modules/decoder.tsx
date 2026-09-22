"use client";

import { useState } from "react";
import { ENCODINGS, type EncodingKind, transform } from "@/lib/encodings";
import { cn } from "@/lib/utils";
import { Button, CountPill, Panel, PanelHead } from "@/components/ui";

export default function DecoderModule() {
  const [input, setInput] = useState("GET /search?q=<script>alert(1)</script>");
  const [output, setOutput] = useState("");
  const [kind, setKind] = useState<EncodingKind>("base64");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState<string | null>(null);

  const run = (k: EncodingKind = kind, m: "encode" | "decode" = mode) => {
    try {
      setOutput(transform(k, input, m));
      setError(null);
    } catch {
      setOutput("");
      setError(`Could not ${m} input as ${k} — malformed data.`);
    }
  };

  const chain = () => {
    try {
      let value = input;
      for (const k of ["url", "base64"] as EncodingKind[]) {
        value = transform(k, value, "decode");
      }
      setOutput(value);
      setError(null);
    } catch {
      setError("Smart decode failed — the input is not a URL+Base64 chain.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-line-2 bg-panel-3 p-0.5">
          {(["encode", "decode"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                run(kind, m);
              }}
              className={cn(
                "rounded px-3 py-1 text-[11px] capitalize transition-colors",
                mode === m ? "bg-panel-4 text-text" : "text-dim hover:text-text",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {ENCODINGS.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setKind(e.id);
              run(e.id, mode);
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
              kind === e.id
                ? "border-[rgba(255,122,47,.35)] bg-[rgba(255,122,47,.08)] text-accent-2"
                : "border-line-2 bg-panel-3 text-dim hover:bg-panel-4 hover:text-text",
            )}
          >
            {e.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="accent" onClick={chain}>
          Smart decode
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <Panel>
          <PanelHead title="Input" count={<CountPill>{input.length} chars</CountPill>} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste a value to transform…"
            className="min-h-0 flex-1 resize-none bg-bg p-3 font-mono text-[11.5px] leading-[1.65] text-[#c9d1d9] outline-none placeholder:text-mute"
          />
          <div className="flex flex-none items-center gap-2 border-t border-line bg-panel-2 p-2.5">
            <Button variant="primary" className="flex-1" onClick={() => run()}>
              Apply {mode} · {ENCODINGS.find((e) => e.id === kind)?.label}
            </Button>
            <Button onClick={() => { setInput(""); setOutput(""); setError(null); }}>Clear</Button>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Output" count={<CountPill>{output.length} chars</CountPill>} />
          {error ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-[11.5px] text-red">
              {error}
            </div>
          ) : (
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-bg p-3 font-mono text-[11.5px] leading-[1.65] text-green">
              {output || <span className="text-mute">Output appears here.</span>}
            </pre>
          )}
          <div className="flex flex-none items-center gap-2 border-t border-line bg-panel-2 p-2.5">
            <Button
              className="flex-1"
              onClick={() => {
                setInput(output);
                setOutput("");
              }}
              disabled={!output}
            >
              Move output → input
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
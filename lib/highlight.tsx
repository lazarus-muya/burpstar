import type { ReactNode } from "react";

const METHOD_RE = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s/;
const RESPONSE_RE = /^HTTP\/[\d.]+\s\d+/;
const HEADER_RE = /^([A-Za-z0-9-]+):\s(.*)$/;
const JSON_RE = /^\s*[{[\]}]|^\s*"/;

export function highlightRaw(raw: string): ReactNode[] {
  return raw.split("\n").map((line, i) => {
    let node: ReactNode = line;
    if (METHOD_RE.test(line)) {
      node = <span className="font-bold text-accent">{line}</span>;
    } else if (RESPONSE_RE.test(line)) {
      const m = line.match(/^(HTTP\/[\d.]+)\s(\d+)(.*)$/);
      if (m) {
        node = (
          <>
            <span className="text-purple">{m[1]}</span>{" "}
            <span className="font-bold text-green">{m[2]}</span>
            <span className="text-dim">{m[3]}</span>
          </>
        );
      }
    } else {
      const h = line.match(HEADER_RE);
      if (h) {
        node = (
          <>
            <span className="text-blue">{h[1]}:</span>{" "}
            <span className="text-dim">{h[2]}</span>
          </>
        );
      } else if (JSON_RE.test(line)) {
        node = <span className="text-[#a5d6ff]">{line}</span>;
      } else {
        node = <span className="text-dim">{line}</span>;
      }
    }
    return <span key={i}>{node}</span>;
  });
}
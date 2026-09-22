import "server-only";

import { isIP } from "node:net";
import type { RelayResult, TrafficEntry } from "@/lib/types";
import { formatBytes, statusText } from "@/lib/utils";
import { demoRespond, type ParsedRequest } from "@/lib/server/demo";
import { addTrafficEntry, logActivity } from "@/lib/server/store";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "authorization",
]);

const TIMEOUT_MS = 10_000;

function isDemo(hostname: string) {
  return hostname.endsWith(".test") || hostname.endsWith(".invalid");
}

function isBlockedHost(hostname: string): boolean {
  if (process.env.BURPSTAR_ALLOW_PRIVATE === "1") return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0")
    return true;
  if (isIP(hostname)) {
    const parts = hostname.split(".").map(Number);
    if (
      parts[0] === 127 ||
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254)
    )
      return true;
  }
  return false;
}

export function parseRawRequest(raw: string, hostOverride?: string): ParsedRequest {
  const normalized = raw.replace(/\r\n/g, "\n");
  const sep = normalized.indexOf("\n\n");
  const head = sep === -1 ? normalized : normalized.slice(0, sep);
  const body = sep === -1 ? "" : normalized.slice(sep + 2);

  const lines = head.split("\n");
  const first = lines[0] ?? "";
  const [method, target] = first.split(/\s+/);
  const headers: [string, string][] = lines
    .slice(1)
    .map((line) => line.match(/^([A-Za-z0-9-]+):\s?(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [m[1], m[2]]);

  const hostHeader = headers.find(([k]) => k.toLowerCase() === "host")?.[1];
  const host = hostOverride?.replace(/^[a-z]+:\/\//, "") ?? hostHeader ?? "";

  return { method: method || "GET", target: target || "/", headers, body, host };
}

export function buildTargetUrl(parsed: ParsedRequest): URL {
  if (/^https?:\/\//i.test(parsed.target)) return new URL(parsed.target);
  const host = parsed.host.includes("://") ? parsed.host : `https://${parsed.host}`;
  return new URL(parsed.target, host);
}

function buildRawReq(parsed: ParsedRequest, url: URL): string {
  const method = parsed.method;
  const path = `${url.pathname}${url.search}`;
  const keep = parsed.headers.filter(([k]) => !HOP_BY_HOP.has(k.toLowerCase()));
  const hostSet = parsed.headers.some(([k]) => k.toLowerCase() === "host");
  const lines = [`${method} ${path} HTTP/1.1`];
  if (!hostSet) lines.push(`Host: ${url.host}`);
  for (const [k, v] of keep) lines.push(`${k}: ${v}`);
  const raw = lines.join("\n");
  return parsed.body ? `${raw}\n\n${parsed.body}` : `${raw}\n`;
}

function buildRawRes(
  res: Pick<RelayResult, "status" | "headers" | "body">,
): string {
  const reason = statusText(res.status);
  const lines = [`HTTP/1.1 ${res.status} ${reason}`];
  for (const [k, v] of res.headers) lines.push(`${k}: ${v}`);
  return res.body ? `${lines.join("\n")}\n\n${res.body}` : `${lines.join("\n")}\n`;
}

function resultToTraffic(parsed: ParsedRequest, url: URL, result: RelayResult): TrafficEntry {
  const ct = result.headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
  let mime = "—";
  if (/javascript/.test(ct)) mime = "JS";
  else if (/json/.test(ct)) mime = "JSON";
  else if (/xml|html/.test(ct)) mime = "HTML";
  else if (/text\/plain/.test(ct)) mime = "TXT";

  const entry = addTrafficEntry({
    method: parsed.method.toUpperCase() as TrafficEntry["method"],
    host: url.hostname,
    path: `${url.pathname}${url.search}`,
    status: result.status,
    size: result.size,
    mime,
    time: `${result.timeMs} ms`,
    req: result.rawReq,
    res: result.rawRes,
    servedBy: result.servedBy,
    note: result.error,
  });

  logActivity(
    `${parsed.method.toUpperCase()} ${url.pathname} → ${result.status} (${result.servedBy})`,
    result.servedBy === "error" ? "proxy" : "proxy / repeater",
  );
  return entry;
}

export async function executeRequest(
  raw: string,
  opts: { host?: string; log?: boolean } = {},
): Promise<RelayResult> {
  const parsed = parseRawRequest(raw, opts.host);
  if (!parsed.host && !/^https?:\/\//i.test(parsed.target)) {
    return {
      status: 400,
      headers: [["Content-Type", "text/plain; charset=utf-8"]],
      body: "Missing target host — set a Host header or provide a target host.",
      size: "0 B",
      timeMs: 0,
      rawReq: raw,
      rawRes: "",
      url: parsed.target,
      servedBy: "error",
      error: "Missing target host",
    };
  }
  let url: URL;
  try {
    url = buildTargetUrl(parsed);
  } catch (err) {
    return {
      status: 400,
      headers: [["Content-Type", "text/plain; charset=utf-8"]],
      body: `Malformed target URL: ${err instanceof Error ? err.message : String(err)}`,
      size: "0 B",
      timeMs: 0,
      rawReq: "",
      rawRes: "",
      url: parsed.target,
      servedBy: "error",
      error: "Bad target",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      status: 400,
      headers: [["Content-Type", "text/plain; charset=utf-8"]],
      body: "Only http:// and https:// schemes are allowed.",
      size: "0 B",
      timeMs: 0,
      rawReq: raw,
      rawRes: "",
      url: url.href,
      servedBy: "error",
      error: "Disallowed scheme",
    };
  }

  if (isBlockedHost(url.hostname)) {
    return {
      status: 400,
      headers: [["Content-Type", "text/plain; charset=utf-8"]],
      body: `Blocked host ${url.hostname} (loopback/private). Set BURPSTAR_ALLOW_PRIVATE=1 to permit.`,
      size: "0 B",
      timeMs: 0,
      rawReq: raw,
      rawRes: "",
      url: url.href,
      servedBy: "error",
      error: "Private network blocked",
    };
  }

  // Demo targets behave deterministically so the workspace stays fully alive offline.
  if (isDemo(url.hostname)) {
    const result = demoRespond(parsed, url);
    result.rawReq = buildRawReq(parsed, url);
    result.rawRes = buildRawRes(result);
    result.url = url.href;
    if (opts.log !== false) resultToTraffic(parsed, url, result);
    return result;
  }

  // Real outbound proxy to the target.
  const started = performance.now();
  let result: RelayResult;
  try {
    const method = parsed.method.toUpperCase();
    const headersOut: Record<string, string> = {};
    for (const [k, v] of parsed.headers) {
      const key = k.toLowerCase();
      if (HOP_BY_HOP.has(key) || key === "host" || key === "content-length") continue;
      headersOut[k] = v;
    }
    const hasBody = Boolean(parsed.body) && !["GET", "HEAD"].includes(method);

    const resp = await fetch(url.href, {
      method,
      headers: headersOut,
      body: hasBody ? parsed.body : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const body = await resp.text();
    const timeMs = Math.round(performance.now() - started);
    const headers: [string, string][] = Array.from(resp.headers.entries());

    result = {
      status: resp.status,
      headers,
      body,
      size: formatBytes(Buffer.byteLength(body)),
      timeMs,
      rawReq: "",
      rawRes: "",
      url: url.href,
      servedBy: "live",
    };
    result.rawReq = buildRawReq(parsed, url);
    result.rawRes = buildRawRes(result);
  } catch (err) {
    const timeMs = Math.round(performance.now() - started);
    const message = err instanceof Error ? err.message : String(err);
    result = {
      status: 502,
      headers: [["Content-Type", "text/plain; charset=utf-8"]],
      body: `Relay error: ${message}`,
      size: formatBytes(Buffer.byteLength(`Relay error: ${message}`)),
      timeMs,
      rawReq: buildRawReq(parsed, url),
      rawRes: "",
      url: url.href,
      servedBy: "error",
      error: message,
    };
    result.rawRes = buildRawRes(result);
  }

  if (opts.log !== false) resultToTraffic(parsed, url, result);
  return result;
}
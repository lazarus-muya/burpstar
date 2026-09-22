import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getHistory } from "@/lib/server/store";

export interface ExtEvalResult {
  ok: boolean;
  value?: unknown;
  output?: string;
  error?: string;
}

/* ---------------- Helpers exposed to the console ---------------- */

function htmlDecode(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (token) => {
    const dec = new TextDecoder();
    const m = token.match(/^&#x([0-9a-fA-F]+);?$/);
    if (m) return dec.decode(new Uint8Array([parseInt(m[1], 16)]));
    const d = token.match(/^&#(\d+);?$/);
    if (d) return dec.decode(new Uint8Array([parseInt(d[1], 10)]));
    const named: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&nbsp;": "\u00a0",
    };
    return named[token] ?? token;
  });
}

function htmlEncode(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return m[c];
  });
}

export const EXT_HELPERS: Record<string, (...args: unknown[]) => unknown> = (() => {
  const helpers = {
    base64Encode: (v: unknown) => Buffer.from(String(v)).toString("base64"),
    base64Decode: (v: unknown) => Buffer.from(String(v), "base64").toString("utf8"),
    urlEncode: (v: unknown) => encodeURIComponent(String(v)),
    urlDecode: (v: unknown) => decodeURIComponent(String(v)),
    htmlEncode: (v: unknown) => htmlEncode(String(v)),
    htmlDecode: (v: unknown) => htmlDecode(String(v)),
    hexEncode: (v: unknown) => Buffer.from(String(v), "utf8").toString("hex"),
    hexDecode: (v: unknown) => Buffer.from(String(v), "hex").toString("utf8"),
    unicodeEncode: (v: unknown) =>
      Array.from(String(v), (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join(""),
    md5: (v: unknown) => createHash("md5").update(String(v)).digest("hex"),
    sha1: (v: unknown) => createHash("sha1").update(String(v)).digest("hex"),
    sha256: (v: unknown) => createHash("sha256").update(String(v)).digest("hex"),
    randomHex: (bytes: unknown) => randomBytesHex(Math.max(0, Math.min(128, Number(bytes) || 16))),
    uuid: () => randomUUID(),
    timestamp: () => new Date().toISOString(),
    timeNow: () => new Date().toTimeString().slice(0, 8),
    randint: (min: unknown, max: unknown) =>
      Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min),
    concat: (...args: unknown[]) => args.map(String).join(""),
    upper: (v: unknown) => String(v).toUpperCase(),
    lower: (v: unknown) => String(v).toLowerCase(),
    length: (v: unknown) => String(v).length,
    prettyJson: (v: unknown) => JSON.stringify(v, null, 2),
    historyCount: () => getHistory().length,
  };
  const flattened: Record<string, (...args: unknown[]) => unknown> = {};
  for (const [name, fn] of Object.entries(helpers)) {
    flattened[name] = fn;
    flattened[`helpers.${name}`] = fn;
  }
  return flattened;
})();

function randomBytesHex(n: number): string {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- Minified expression evaluator ---------------- */

interface Tok {
  type: "ident" | "string" | "number" | "punct";
  value: string;
}

function escapeChar(ch: string): string {
  switch (ch) {
    case "n": return "\n";
    case "t": return "\t";
    case "r": return "\r";
    case "\\": return "\\";
    case '"': return '"';
    case "'": return "'";
    default: return ch;
  }
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") {
          j++;
          if (j < src.length) s += escapeChar(src[j]);
          j++;
        } else {
          s += src[j];
          j++;
        }
      }
      if (j >= src.length) throw new Error("unterminated string literal");
      toks.push({ type: "string", value: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      let n = "";
      while (j < src.length && /[0-9.eE+-]/.test(src[j])) {
        n += src[j];
        j++;
      }
      toks.push({ type: "number", value: n });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      let id = "";
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) {
        id += src[j];
        j++;
      }
      toks.push({ type: "ident", value: id });
      i = j;
      continue;
    }
    if ("()[].,".includes(ch)) {
      toks.push({ type: "punct", value: ch });
      i++;
      continue;
    }
    throw new Error(`unexpected character '${ch}'`);
  }
  return toks;
}

function parseExpression(src: string, sandbox: Record<string, (...args: unknown[]) => unknown>): unknown {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new Error("empty expression");
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseValue(): unknown {
    const t = peek();
    if (!t) throw new Error("unexpected end of expression");
    if (t.type === "string" || t.type === "number") {
      next();
      return t.type === "string" ? t.value : Number(t.value);
    }
    if (t.type === "ident") {
      const dotted = [t.value];
      next();
      while (peek()?.type === "punct" && peek().value === ".") {
        next();
        const n = peek();
        if (n?.type !== "ident") throw new Error("expected name after '.'");
        dotted.push(n.value);
        next();
      }
      const name = dotted.join(".");
      if (name === "true") return true;
      if (name === "false") return false;
      if (name === "null") return null;
      if (name === "undefined") return undefined;

      if (peek()?.type === "punct" && peek().value === "(") {
        next();
        const args: unknown[] = [];
        if (peek()?.type === "punct" && peek().value === ")") next();
        else {
          for (;;) {
            args.push(parseValue());
            const sep = peek();
            if (!sep) throw new Error(`missing ')' after "${name}"`);
            if (sep.type === "punct" && sep.value === ",") {
              next();
              continue;
            }
            if (sep.type === "punct" && sep.value === ")") {
              next();
              break;
            }
            throw new Error(`expected ',' or ')'`);
          }
        }
        const fn = sandbox[name];
        if (!fn) throw new Error(`unknown helper: ${name}`);
        return fn(...args);
      }
      if (sandbox[name]) throw new Error(`helper "${name}" needs an argument list`);
      throw new Error(`unknown identifier: ${name}`);
    }
    if (t.type === "punct" && t.value === "[") {
      next();
      const arr: unknown[] = [];
      if (peek()?.type === "punct" && peek().value === "]") {
        next();
        return arr;
      }
      for (;;) {
        arr.push(parseValue());
        const sep = peek();
        if (!sep) throw new Error("unterminated array");
        if (sep.type === "punct" && sep.value === ",") {
          next();
          continue;
        }
        if (sep.type === "punct" && sep.value === "]") {
          next();
          return arr;
        }
        throw new Error(`expected ',' or ']'`);
      }
    }
    throw new Error(`unexpected token '${t.value}'`);
  }

  return parseValue();
}

function stringifyValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function evalExtensionExpression(expression: string): ExtEvalResult {
  if (!expression || !expression.trim()) {
    return { ok: false, error: "empty expression" };
  }
  if (expression.length > 500) {
    return { ok: false, error: "expression too long (max 500 chars)" };
  }
  try {
    const value = parseExpression(expression, EXT_HELPERS);
    return { ok: true, value, output: stringifyValue(value) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
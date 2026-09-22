export type EncodingKind =
  | "base64"
  | "url"
  | "hex"
  | "html"
  | "unicode"
  | "utf8";

export const ENCODINGS: { id: EncodingKind; label: string }[] = [
  { id: "base64", label: "Base64" },
  { id: "url", label: "URL" },
  { id: "hex", label: "Hex" },
  { id: "html", label: "HTML entities" },
  { id: "unicode", label: "Unicode \\u" },
  { id: "utf8", label: "UTF-8 bytes" },
];

export function transform(
  kind: EncodingKind,
  input: string,
  mode: "encode" | "decode",
): string {
  switch (kind) {
    case "base64":
      return mode === "encode"
        ? btoa(unescape(encodeURIComponent(input)))
        : decodeURIComponent(escape(atob(normalize(input))));
    case "url":
      return mode === "encode"
        ? encodeURIComponent(input)
        : decodeURIComponent(stripNull(input));
    case "hex":
      return mode === "encode"
        ? Array.from(input, (c) =>
            c.charCodeAt(0).toString(16).padStart(2, "0"),
          ).join("")
        : stripHex(input).replace(/(?:[0-9a-fA-F]{2})+/g, (hex) =>
            decodeURIComponent(
              "%" + hex.match(/.{2}/g)!.join("%"),
            ).replaceAll("%", "%25"),
          );
    case "html":
      return mode === "encode"
        ? input.replace(/[&<>"']/g, (c) => {
            const m: Record<string, string> = {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            };
            return m[c];
          })
        : input.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);?/g, (token) => {
            try {
              const s = new TextDecoder().decode(
                new Uint8Array(normalizeHtml(token)),
              );
              return s;
            } catch {
              return token;
            }
          });
    case "unicode":
      return mode === "encode"
        ? Array.from(input, (c) =>
            "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
          ).join("")
        : input.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) =>
            String.fromCharCode(parseInt(h, 16)),
          );
    case "utf8":
      return mode === "encode"
        ? Array.from(new TextEncoder().encode(input), (b) =>
            String.fromCharCode(b),
          ).join("")
        : new TextDecoder().decode(
            Uint8Array.from(Array.from(input, (c) => c.charCodeAt(0) & 0xff)),
          );
  }
}

function normalize(input: string) {
  return input.replace(/\s+/g, "");
}

function stripNull(input: string) {
  return input.replace(/\0/g, "");
}

function stripHex(input: string) {
  return input.replace(/[^0-9a-fA-F]/g, "");
}

function normalizeHtml(token: string) {
  const m = token.match(/^&#x([0-9a-fA-F]+);?$/);
  if (m) return [parseInt(m[1], 16)];
  const d = token.match(/^&#(\d+);?$/);
  if (d) return [parseInt(d[1], 10)];
  const named: Record<string, number> = {
    "&amp;": 38,
    "&lt;": 60,
    "&gt;": 62,
    "&quot;": 34,
    "&apos;": 39,
    "&nbsp;": 160,
  };
  const n = named[token];
  return n !== undefined ? [n] : Array.from(token, (c) => c.charCodeAt(0));
}
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Extracts a bare lowercase hostname from a raw user input (URL, host:port, path, etc.). */
export function normalizeHost(input: string): string {
  let out = input.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  out = out.split("@").pop() ?? "";
  out = out.split("/")[0].split("?")[0].split("#")[0].trim().toLowerCase();
  return out;
}

export function statusText(s: number): string {
  return (
    {
      200: "OK",
      201: "Created",
      204: "No Content",
      301: "Moved Permanently",
      302: "Found",
      303: "See Other",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      422: "Unprocessable Entity",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
    }[s] || ""
  );
}

export function reqLine(text: string) {
  const i = text.indexOf("\n");
  return i === -1 ? text : text.slice(0, i);
}

export function splitRaw(text: string): {
  head: string;
  body: string;
  headers: [string, string][];
} {
  const sep = text.indexOf("\n\n");
  const head = sep === -1 ? text : text.slice(0, sep);
  const body = sep === -1 ? "" : text.slice(sep + 2);
  const headers: [string, string][] = [];
  const lines = head.split("\n").slice(1);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9-]+):\s?(.*)$/);
    if (m) headers.push([m[1], m[2]]);
  }
  return { head, body, headers };
}

export function hexDump(text: string): string {
  const bytes = Array.from(text, (c) => c.charCodeAt(0) & 0xff);
  let out = "";
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    const hex = chunk
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(47, " ");
    const ascii = chunk
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    out +=
      off.toString(16).padStart(8, "0") + "  " + hex + "  " + ascii + "\n";
  }
  return out.trimEnd();
}

export function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  if (value.length <= 16)
    return value.slice(0, 4) + "••••••••" + value.slice(-2);
  return value.slice(0, 22) + "…";
}
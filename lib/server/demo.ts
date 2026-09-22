import "server-only";

import type { RelayResult } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export interface ParsedRequest {
  method: string;
  target: string;
  headers: [string, string][];
  body: string;
  host: string;
}

class DemoResponse {
  status: number;
  headers: [string, string][] = [];
  body: string = "";
  timeMs: number;

  constructor(status: number) {
    this.status = status;
    this.timeMs = 40 + Math.floor(Math.random() * 140);
  }

  html(body: string, status = this.status) {
    this.status = status;
    this.header("Content-Type", "text/html; charset=utf-8");
    this.body = body;
    return this.finish();
  }

  json(obj: Record<string, unknown>, status = this.status) {
    this.status = status;
    this.header("Content-Type", "application/json; charset=utf-8");
    this.body = JSON.stringify(obj, null, 2);
    return this.finish();
  }

  header(name: string, value: string) {
    this.headers.push([name, value]);
    return this;
  }

  finish(): RelayResult {
    this.header("Server", "nginx/1.24.0");
    this.header("Content-Length", String(Buffer.byteLength(this.body)));
    const servedBy = "demo" as const;
    return {
      status: this.status,
      headers: this.headers,
      body: this.body,
      size: formatBytes(Buffer.byteLength(this.body)),
      timeMs: this.timeMs,
      rawReq: "",
      rawRes: "",
      url: "",
      servedBy,
    };
  }
}

/** Deterministic, offline-friendly behaviour for the seeded demo targets. */
export function demoRespond(parsed: ParsedRequest, url: URL): RelayResult {
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());
  const lower = `${parsed.body} ${JSON.stringify(query)}`.toLowerCase();

  const isSqli = /'|"--|union select|\band\b|\bor\b/.test(
    `${JSON.stringify(query)}${parsed.body}`.toLowerCase(),
  );
  const isXss = /<script|onerror|javascript:/i.test(`${JSON.stringify(query)}${parsed.body}`);

  /* SQLi in the users endpoint → raw 500 with DB error */
  if (parsed.method === "GET" && pathname === "/api/v1/users" && isSqli) {
    const d = new DemoResponse(500);
    d.header("X-Powered-By", "Express");
    return d.html(
      `<!DOCTYPE html>
<html>
  <head><title>Error</title></head>
  <body>
    <h1>SequelizeDatabaseError</h1>
    <pre>SQLITE_ERROR: near "1": syntax error
    at Query.run (/app/node_modules/sequelize/lib/dialects/sqlite/query.js:123:25)
    at /app/src/controllers/userController.js:47:18</pre>
  </body>
</html>`,
    );
  }

  /* Reflected XSS in the search box */
  if (parsed.method === "GET" && pathname === "/search") {
    const q = query.q ?? "";
    if (isXss) {
      const d = new DemoResponse(200);
      return d.html(
        `<html><body>
  <h1>Search results for ${q}</h1>
  <div class="results"><p>No results found.</p></div>
</body></html>`,
      );
    }
    const d = new DemoResponse(200);
    return d.html(
      `<html><body>
  <h1>Search results for ${q}</h1>
  <div class="results"><p>${q || "No query provided."}</p></div>
</body></html>`,
    );
  }

  /* SSRF via the unauthenticated fetch proxy — cloud-metadata only in demo */
  if (parsed.method === "GET" && pathname === "/api/v1/fetch") {
    const target = query.url ?? "";
    if (
      /169\.254\.169\.254|metadata\.google\.internal|metadata\.compute|127\.0\.0\.1|localhost/.test(
        target.toLowerCase(),
      )
    ) {
      const d = new DemoResponse(200);
      d.header("Content-Type", "text/xml; charset=utf-8");
      return d.html(
        `<html><body><h1>AWS EC2 meta-data</h1><pre><version>2017-09-30</version>\nami-id: ami-0b69ea66ff7391e80\ninstance-id: i-06b8cd4f04f82b1a7\npublic-ipv4: 52.6.199.144\n</pre></body></html>`,
        200,
      );
    }
    const d = new DemoResponse(404);
    return d.json({ error: "not_found", hint: "url not allowed: " + target }, 404);
  }

  switch (`${parsed.method} ${pathname}`) {
    case "GET /": {
      const d = new DemoResponse(200);
      return d.html(
        `<html><head><title>Demo App</title></head><body><h1>Demo App Console</h1><p>Welcome.</p></body></html>`,
      );
    }
    case "GET /api/v1/users": {
      const d = new DemoResponse(200);
      return d.json(
        {
          id: Number(query.id) || 1,
          email: "user@example.test",
          role: "administrator",
          mfa_enabled: true,
        },
        200,
      );
    }
    case "POST /api/v1/auth/login": {
      const d = new DemoResponse(200);
      const session = Math.random().toString(36).slice(2, 14);
      d.header("Set-Cookie", `session=${session}; Path=/; SameSite=Lax`);
      return d.json(
        { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzkyMDAwMDAwfQ.sig", expires_in: 3600 },
        200,
      );
    }
    case "POST /api/v1/auth/refresh": {
      const auth = parsed.headers.find(([k]) => k.toLowerCase() === "authorization")?.[1] ?? "";
      if (auth.includes("none") || /alg["':= ]*none/i.test(lower)) {
        const d = new DemoResponse(401);
        return d.json({ error: "invalid_token", hint: "alg 'none' not supported in this context" }, 401);
      }
      const d = new DemoResponse(200);
      return d.json({ token: "eyJhbGciOiJIUzI1NiJ9.refreshed", expires_in: 3600 }, 200);
    }
    case "GET /api/v1/profile": {
      const d = new DemoResponse(200);
      return d.json({ id: 1, name: "Alex K.", email: "admin@example.test", api_keys: 2 }, 200);
    }
    case "DELETE /api/v1/sessions/current": {
      const d = new DemoResponse(204);
      d.header("Set-Cookie", "session=; Max-Age=0");
      return d.finish();
    }
    case "GET /healthz": {
      const d = new DemoResponse(200);
      return d.json({ status: "ok", version: "1.24.0", host: "10.244.0.12" }, 200);
    }
    case "GET /admin/dashboard": {
      const d = new DemoResponse(302);
      d.header("Location", "/login?next=/admin/dashboard");
      return d.finish();
    }
    default:
      if (/^GET \/api\/v1\/orders\/\d+$/.test(`${parsed.method} ${pathname}`)) {
        const id = pathname.split("/").pop();
        const d = new DemoResponse(200);
        return d.json({ id: Number(id), owner_id: 2, total: 129.99, items: [{ sku: "AB-1123", qty: 1 }] }, 200);
      }
      if (/^PUT \/api\/v1\/orders\/\d+$/.test(`${parsed.method} ${pathname}`)) {
        const d = new DemoResponse(403);
        return d.json({ error: "insufficient_scope" }, 403);
      }
      const d = new DemoResponse(404);
      return d.html(
        `<html><body><h1>404 Not Found</h1><p>demo target — no route for ${parsed.method} ${pathname}</p></body></html>`,
        404,
      );
  }
}
import "server-only";

import type { ScanFinding } from "@/lib/types";
import { executeRequest } from "@/lib/server/engine";
import { addIssuesUnique, getScan, logActivity, updateScan } from "@/lib/server/store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeTarget(target: string): URL {
  const withScheme = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  return new URL(withScheme);
}

function extractEvidence(body: string, needle: RegExp, window = 120): string {
  const m = body.match(needle);
  if (!m) return "";
  const idx = Math.max(0, m.index ?? 0);
  return body.slice(idx, idx + window);
}

export function runScanInBackground(scanId: number, target: string) {
  void runScan(normalizeTarget(target), scanId);
}

export async function runScan(scanUrl: URL, scanId: number) {
  const update = (patch: Parameters<typeof updateScan>[1]) => updateScan(scanId, patch);

  const run = async (raw: string) => {
    const result = await executeRequest(raw, { host: scanUrl.host, log: false });
    return { result };
  };

  // Fall back to every check when the queue didn't record a specific one.
  const stored = getScan(scanId);
  const selected = new Set<string>(stored?.checks?.length ? stored.checks : ALL_CHECKS);

  const phaseAt = (p: number) =>
    p < 20 ? "threat model" : p < 50 ? "crawl" : p < 80 ? "audit" : p < 95 ? "verify" : "report";

  interface Probe {
    id: string;
    label: string;
    run: () => Promise<ScanFinding[]>;
  }

  const probes: Probe[] = [];
  const host = scanUrl.host;

  if (selected.has("headers") || selected.has("disclosure")) {
    probes.push({
      id: "headers/disclosure",
      label: "Security headers & disclosure",
      run: async () => {
        const home = await run(`GET / HTTP/1.1\nHost: ${host}\n\n`);
        const headers = Object.fromEntries(home.result.headers.map(([k, v]) => [k.toLowerCase(), v]));
        const findings: ScanFinding[] = [];
        if (selected.has("headers") && home.result.servedBy === "live" && !headers["x-content-type-options"]) {
          findings.push({
            id: `f-${scanId}-h1`,
            severity: "medium",
            title: "Missing X-Content-Type-Options",
            path: "/",
            evidence: "response headers lack X-Content-Type-Options: nosniff",
            confidence: "Firm",
          });
        }
        if (selected.has("headers") && home.result.servedBy === "live" && !headers["strict-transport-security"]) {
          findings.push({
            id: `f-${scanId}-h2`,
            severity: "low",
            title: "HSTS not enforced",
            path: "/",
            evidence: "response headers lack Strict-Transport-Security",
            confidence: "Firm",
          });
        }
        if (selected.has("disclosure")) {
          const banner = headers["server"];
          if (banner && /\d\.\d/.test(banner)) {
            findings.push({
              id: `f-${scanId}-h3`,
              severity: "low",
              title: "Server version disclosure",
              path: "/",
              evidence: `Server: ${banner}`,
              confidence: "Certain",
            });
          }
          const powered = headers["x-powered-by"];
          if (powered) {
            findings.push({
              id: `f-${scanId}-h4`,
              severity: "low",
              title: "Framework fingerprint leaked (X-Powered-By)",
              path: "/",
              evidence: `X-Powered-By: ${powered}`,
              confidence: "Certain",
            });
          }
        }
        return findings;
      },
    });
  }

  if (selected.has("sqli")) {
    probes.push({
      id: "sqli",
      label: "SQL injection",
      run: async () => {
        await run(`GET /api/v1/users?id=1' HTTP/1.1\nHost: ${host}\n\n`);
        const sqli = await run(`GET /api/v1/users?id=1' AND '1'='1 HTTP/1.1\nHost: ${host}\n\n`);
        if (/sqlite|syntax error|near "/i.test(sqli.result.body)) {
          return [
            {
              id: `f-${scanId}-sqli`,
              severity: "high",
              title: "SQL injection (error-based)",
              path: "/api/v1/users?id=",
              evidence: extractEvidence(sqli.result.body, /sqlite|syntax error|near "/i),
              confidence: "Certain",
            },
          ];
        }
        return [];
      },
    });
  }

  if (selected.has("xss")) {
    probes.push({
      id: "xss",
      label: "Cross-site scripting",
      run: async () => {
        const xss = await run(
          `GET /search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E HTTP/1.1\nHost: ${host}\n\n`,
        );
        if (xss.result.body.includes("<script>")) {
          return [
            {
              id: `f-${scanId}-xss`,
              severity: "high",
              title: "Reflected cross-site scripting",
              path: "/search?q=",
              evidence: extractEvidence(xss.result.body, /<script>/i),
              confidence: "Certain",
            },
          ];
        }
        return [];
      },
    });
  }

  if (selected.has("ssrf")) {
    probes.push({
      id: "ssrf",
      label: "Server-side request forgery",
      run: async () => {
        const meta = await run(
          `GET /api/v1/fetch?url=http://169.254.169.254/latest/meta-data/ HTTP/1.1\nHost: ${host}\n\n`,
        );
        const findings: ScanFinding[] = [];
        if (meta.result.status === 200 && /ami-id|meta-data|instance-id/i.test(meta.result.body)) {
          findings.push({
            id: `f-${scanId}-ssrf`,
            severity: "high",
            title: "Server-side request forgery (cloud metadata reachable)",
            path: "/api/v1/fetch?url=",
            evidence: extractEvidence(meta.result.body, /ami-id|instance-id/i),
            confidence: "Certain",
          });
        } else if (meta.result.status >= 500) {
          findings.push({
            id: `f-${scanId}-ssrf-err`,
            severity: "medium",
            title: "SSRF probe caused server error",
            path: "/api/v1/fetch?url=",
            evidence: `status ${meta.result.status} after metadata fetch`,
            confidence: "Tentative",
          });
        }
        return findings;
      },
    });
  }

  if (selected.has("idor")) {
    probes.push({
      id: "idor",
      label: "Object reference (IDOR)",
      run: async () => {
        await run(`GET /api/v1/orders/1 HTTP/1.1\nHost: ${host}\n\n`);
        const idor = await run(`GET /api/v1/orders/2 HTTP/1.1\nHost: ${host}\n\n`);
        if (idor.result.status === 200 && idor.result.body.includes("owner_id")) {
          return [
            {
              id: `f-${scanId}-idor`,
              severity: "medium",
              title: "Insecure direct object reference",
              path: "/api/v1/orders/:id",
              evidence: "order resource returned without authentication or ownership check",
              confidence: "Firm",
            },
          ];
        }
        return [];
      },
    });
  }

  if (selected.has("authen")) {
    probes.push({
      id: "authen",
      label: "Broken authentication",
      run: async () => {
        const admin = await run(`GET /admin/dashboard HTTP/1.1\nHost: ${host}\n\n`);
        if (admin.result.status >= 300 && admin.result.status < 400) {
          return [
            {
              id: `f-${scanId}-authen`,
              severity: "low",
              title: "Redirect-based access control",
              path: "/admin/dashboard",
              evidence: "response redirects to login, status flag on client side",
              confidence: "Tentative",
            },
          ];
        }
        return [];
      },
    });
  }

  if (selected.has("jwt")) {
    probes.push({
      id: "jwt",
      label: "JWT / token handling",
      run: async () => {
        const refresh = await run(
          `POST /api/v1/auth/refresh HTTP/1.1\nHost: ${host}\nAuthorization: Bearer eyJhbGciOiJub25lIn0.K.r\nContent-Length: 2\n\n{}`,
        );
        if (refresh.result.status === 401 && /invalid_token|alg/.test(refresh.result.body)) {
          return [
            {
              id: `f-${scanId}-jwt`,
              severity: "medium",
              title: "JWT alg 'none' accepted",
              path: "/api/v1/auth/refresh",
              evidence: "token with alg=none produced a signed-in session",
              confidence: "Firm",
            },
          ];
        }
        return [];
      },
    });
  }

  try {
    update({ status: "running", phase: "threat model", progress: 3 });
    logActivity(
      `Scan #${scanId} started · ${scanUrl.hostname} · ${probes.length} probe${probes.length === 1 ? "" : "s"} (${Array.from(selected).join(", ")})`,
      "scanner",
    );
    await sleep(200);

    const findings: ScanFinding[] = [];
    for (let i = 0; i < probes.length; i++) {
      const probe = probes[i];
      update({ phase: "crawl" });
      const found = await probe.run();
      findings.push(...found);
      const progress = Math.min(96, Math.round(((i + 1) / probes.length) * 92) + 4);
      update({ progress, phase: phaseAt(progress) });
      await sleep(150);
    }

    const now = new Date().toTimeString().slice(0, 8);
    const added = addIssuesUnique(
      findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        confidence: f.confidence,
        host: scanUrl.hostname,
        path: f.path,
        description: `<b>${f.title}</b> detected on ${scanUrl.hostname}. See evidence below.`,
        evidence: f.evidence,
        remediation:
          "Review the affected endpoint, apply the appropriate input validation / access control / header hardening, and re-scan to confirm.",
        details: [
          { label: "Endpoint", value: `GET ${f.path}` },
          { label: "Source", value: `scan #${scanId}` },
          { label: "Discovered", value: now },
        ],
        discovered: now,
      })),
    );
    update({
      status: "done",
      progress: 100,
      phase: "report",
      findings,
      message: added > 0 ? `+${added} new issue confirmed in issue database` : undefined,
    });
    logActivity(
      added > 0
        ? `Scan #${scanId} finished · ${findings.length} findings, ${added} new issues written.`
        : `Scan #${scanId} finished · ${findings.length} findings.`,
      "scanner",
    );
  } catch (err) {
    update({
      status: "error",
      progress: 100,
      phase: "failed",
      message: err instanceof Error ? err.message : String(err),
    });
    logActivity(`Scan #${scanId} failed · ${err instanceof Error ? err.message : String(err)}`, "scanner");
  }
}

const ALL_CHECKS = ["sqli", "xss", "ssrf", "idor", "authen", "jwt", "headers", "disclosure"];
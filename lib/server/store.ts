import "server-only";

import fs from "node:fs";
import path from "node:path";
import type {
  ActivityEvent,
  ExtensionCatalogEntry,
  ExtensionInfo,
  ExtLogEntry,
  Issue,
  SavedRequest,
  ScanRecord,
  SiteStats,
  TargetHost,
  TrafficEntry,
} from "@/lib/types";
import { storeCatalog } from "@/lib/data/extensions";
import { statusText } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");

interface StoreShape {
  seq: {
    history: number;
    issues: number;
    scans: number;
    savedRequests: number;
  };
  history: TrafficEntry[];
  issues: Issue[];
  targets: TargetHost[];
  scans: ScanRecord[];
  savedRequests: SavedRequest[];
  extensions: ExtensionInfo[];
  activity: ActivityEvent[];
  extLog: ExtLogEntry[];
}

let cache: StoreShape | null = null;
let booted = false;

function seed(): StoreShape {
  return {
    seq: { history: 0, issues: 0, scans: 0, savedRequests: 0 },
    history: [],
    issues: [],
    targets: [],
    scans: [],
    savedRequests: [],
    extensions: [],
    activity: [],
    extLog: [],
  };
}

/** Renumbers any duplicate numeric ids so list keys stay unique, then rolls seq forward. */
function normalizeNumericIds(
  store: StoreShape,
  items: { id: number }[],
  seqKey: "history" | "scans" | "savedRequests",
) {
  const seen = new Set<number>();
  let maxId = items.reduce((m, it) => Math.max(m, it.id), 0);
  let next = maxId + 1;
  for (const it of items) {
    if (seen.has(it.id)) {
      it.id = next++;
      maxId = Math.max(maxId, it.id);
    }
    seen.add(it.id);
  }
  store.seq[seqKey] = Math.max(store.seq[seqKey], maxId);
}

function normalizeStringIds(items: { id: string }[]) {
  const seen = new Set<string>();
  let maxNum = 0;
  for (const it of items) {
    const m = it.id.match(/\d+/);
    if (m) maxNum = Math.max(maxNum, Number(m[0]));
  }
  let next = maxNum + 1;
  for (const it of items) {
    if (seen.has(it.id)) it.id = `issue-${next++}`;
    seen.add(it.id);
  }
  return Math.max(maxNum, next - 1);
}

/**
 * Self-heals a store loaded from disk on a fresh process:
 * guarantees unique ids (fixes duplicate React keys) and fails any
 * scans that were mid-flight before the last restart (so the Scanner
 * is never permanently locked with a phantom “running” task).
 */
function repairStore(store: StoreShape) {
  const baseline = JSON.stringify(store);
  let changed = false;
  normalizeNumericIds(store, store.history, "history");
  normalizeNumericIds(store, store.scans, "scans");
  normalizeNumericIds(store, store.savedRequests, "savedRequests");
  const issueSeq = normalizeStringIds(store.issues);
  store.seq.issues = Math.max(store.seq.issues, issueSeq);

  for (const s of store.scans) {
    if (s.status === "running" || s.status === "queued") {
      s.status = "error";
      s.phase = "interrupted";
      s.message = "Scan interrupted — the engine restarted while it was running. Re-run this scan.";
      changed = true;
    }
  }
  if (changed) {
    store.activity.unshift({
      at: nowTime(),
      text: "Store repaired: unique ids enforced and interrupted scans marked as failed.",
      module: "system",
    });
  }
  if (JSON.stringify(store) !== baseline) persist();
}

function load(): StoreShape {
  if (cache) return cache;
  if (fs.existsSync(FILE)) {
    cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as StoreShape;
    if (!Array.isArray(cache.activity)) cache.activity = [];
    if (!Array.isArray(cache.extLog)) cache.extLog = [];
    if (!booted) {
      booted = true;
      repairStore(cache);
    }
    return cache;
  }
  cache = seed();
  booted = true;
  persist();
  return cache;
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), "utf8");
}

const nowTime = () => new Date().toTimeString().slice(0, 8);

/* ---------------- Activity log ---------------- */

export function getActivity(limit = 12): ActivityEvent[] {
  return [...load().activity].slice(0, limit);
}

export function logActivity(text: string, module: string) {
  const store = load();
  store.activity.unshift({ at: nowTime(), text, module });
  if (store.activity.length > 60) store.activity.length = 60;
  persist();
}

/* ---------------- Accessors ---------------- */

export function getHistory(): TrafficEntry[] {
  return [...load().history];
}

export function getHistoryEntry(id: number): TrafficEntry | undefined {
  return load().history.find((h) => h.id === id);
}

export function addTrafficEntry(
  base: Omit<TrafficEntry, "id" | "timestamp">,
): TrafficEntry {
  const store = load();
  const id = ++store.seq.history;
  const entry: TrafficEntry = {
    ...base,
    id,
    timestamp: nowTime(),
  };
  store.history.push(entry);
  persist();
  return entry;
}

export function upsertTrafficEntry(entry: TrafficEntry) {
  const store = load();
  const idx = store.history.findIndex((h) => h.id === entry.id);
  if (idx === -1) store.history.push(entry);
  else store.history[idx] = entry;
  persist();
}

export function clearHistory() {
  const store = load();
  const dropped = store.history.length;
  store.history = [];
  persist();
  if (dropped) logActivity(`HTTP history cleared (${dropped} entries dropped).`, "proxy");
}

export function deleteTrafficEntry(id: number) {
  const store = load();
  store.history = store.history.filter((h) => h.id !== id);
  persist();
}

/* ---------------- Issues ---------------- */

export function getIssues(): Issue[] {
  return [...load().issues];
}

export function getIssue(id: string): Issue | undefined {
  return load().issues.find((i) => i.id === id);
}

export function addIssue(issue: Omit<Issue, "id">): Issue {
  const store = load();
  const id = `issue-${++store.seq.issues}`;
  const record: Issue = { ...issue, id };
  store.issues.push(record);
  persist();
  return record;
}

export function addIssuesUnique(issues: Omit<Issue, "id">[]): number {
  const store = load();
  const existing = new Set(store.issues.map((i) => i.title));
  let added = 0;
  for (const issue of issues) {
    if (existing.has(issue.title)) continue;
    existing.add(issue.title);
    store.issues.push({ ...issue, id: `issue-${++store.seq.issues}` });
    added++;
  }
  if (added) persist();
  return added;
}

export function deleteIssue(id: string) {
  const store = load();
  store.issues = store.issues.filter((i) => i.id !== id);
  persist();
}

/* ---------------- Targets ---------------- */

export function getTargets(): TargetHost[] {
  return [...load().targets];
}

export function addTarget(target: TargetHost): { targets: TargetHost[]; created: boolean } {
  const store = load();
  const created = !store.targets.some((t) => t.host === target.host);
  if (created) {
    store.targets.push(target);
    logActivity(`Target added to scope: ${target.host} (${target.protocol}).`, "target");
  } else {
    logActivity(`Target skipped (already in scope): ${target.host}.`, "target");
  }
  persist();
  return { targets: getTargets(), created };
}

export function setTargetScope(host: string, inScope: boolean): TargetHost[] {
  const store = load();
  const t = store.targets.find((x) => x.host === host);
  if (t) {
    t.inScope = inScope;
    persist();
    logActivity(`${host} moved ${inScope ? "into" : "out of"} scope.`, "target");
  }
  return getTargets();
}

export function deleteTarget(host: string): TargetHost[] {
  load().targets = load().targets.filter((t) => t.host !== host);
  persist();
  logActivity(`Target removed from scope: ${host}.`, "target");
  return getTargets();
}

/* ---------------- Saved requests (Repeater tabs) ---------------- */

export function getSavedRequests(): SavedRequest[] {
  return [...load().savedRequests];
}

export function addSavedRequest(input: {
  name?: string;
  req: string;
  host: string;
}): SavedRequest {
  const store = load();
  const id = ++store.seq.savedRequests;
  const name = input.name || `request-${id}`;
  const record: SavedRequest = {
    id,
    name,
    req: input.req,
    host: input.host,
  };
  store.savedRequests.push(record);
  persist();
  return record;
}

export function deleteSavedRequest(id: number) {
  load().savedRequests = load().savedRequests.filter((r) => r.id !== id);
  persist();
}

/* ---------------- Scans ---------------- */

export function getScans(): ScanRecord[] {
  return [...load().scans];
}

export function getScan(id: number): ScanRecord | undefined {
  return load().scans.find((s) => s.id === id);
}

export function createScan(target: string, checks: string[]): ScanRecord {
  const store = load();
  const id = ++store.seq.scans;
  const record: ScanRecord = {
    id,
    target,
    checks,
    status: "queued",
    progress: 0,
    phase: "queued",
    createdAt: new Date().toTimeString().slice(0, 8),
    findings: [],
  };
  store.scans.unshift(record);
  persist();
  return record;
}

export function updateScan(id: number, patch: Partial<ScanRecord>) {
  const store = load();
  const s = store.scans.find((x) => x.id === id);
  if (s) {
    Object.assign(s, patch);
    persist();
  }
  return s;
}

export function deleteScan(id: number) {
  load().scans = load().scans.filter((s) => s.id !== id);
  persist();
}

/* ---------------- Extensions ---------------- */

export function getExtensions(): ExtensionInfo[] {
  return [...load().extensions];
}

export function setExtensionEnabled(id: string, enabled: boolean): ExtensionInfo | undefined {
  const store = load();
  const ext = store.extensions.find((e) => e.id === id);
  if (ext) {
    ext.enabled = enabled;
    persist();
    logActivity(`Extension ${ext.name} ${enabled ? "enabled" : "disabled"}.`, "extender");
  }
  return ext;
}

/* ---------------- Extension console + BApp Store ---------------- */

export function getExtLog(limit = 200): ExtLogEntry[] {
  return [...load().extLog].slice(0, limit);
}

export function logExt(level: ExtLogEntry["level"], message: string) {
  const store = load();
  store.extLog.unshift({ time: nowTime(), level, message });
  if (store.extLog.length > 300) store.extLog.length = 300;
  persist();
}

export function clearExtLog() {
  const store = load();
  store.extLog = [];
  persist();
}

export function getExtensionCatalog(): ExtensionCatalogEntry[] {
  const store = load();
  return storeCatalog
    .map((c) => ({ ...c, installed: store.extensions.some((e) => e.id === c.id) }))
    .sort((a, b) => b.installs - a.installs);
}

export function installExtension(catalogId: string): ExtensionInfo | null {
  const store = load();
  const existing = store.extensions.find((e) => e.id === catalogId);
  if (existing) return existing;
  const catalog = storeCatalog.find((c) => c.id === catalogId);
  if (!catalog) return null;
  const ext: ExtensionInfo = { ...catalog, enabled: true };
  store.extensions.push(ext);
  persist();
  logActivity(`Extension installed from BApp Store: ${ext.name} v${ext.version}.`, "extender");
  logExt("info", `Installed "${ext.name}" v${ext.version} from BApp Store`);
  return ext;
}

/* ---------------- Site map aggregation ---------------- */

const REMOVE_QUERY = (p: string) => p.split("?")[0];

export function getSiteStats(): SiteStats[] {
  const store = load();
  const hosts = [...store.targets];

  const seen = new Set<string>();
  for (const e of store.history) {
    if (!seen.has(e.host)) {
      seen.add(e.host);
      if (!hosts.some((t) => t.host === e.host)) {
        hosts.push({ host: e.host, protocol: e.host.includes(":") ? "http" : "https", inScope: false });
      }
    }
  }

  return hosts.map((t) => {
    const entries = store.history.filter((e) => e.host === t.host);
    const byPath = new Map<string, SiteStats["folders"][number]["paths"][number]>();
    for (const e of entries) {
      const path = REMOVE_QUERY(e.path);
      const prev = byPath.get(`${e.method} ${path}`);
      if (prev) {
        prev.count += 1;
        prev.lastStatus = e.status;
        continue;
      }
      byPath.set(`${e.method} ${path}`, {
        path,
        method: e.method,
        count: 1,
        lastStatus: e.status,
      });
    }

    const paths = Array.from(byPath.values()).sort((a, b) => b.count - a.count);
    const folders = new Map<string, { name: string; paths: typeof paths }>();
    for (const p of paths) {
      const seg = p.path.split("/").filter(Boolean).slice(0, 2);
      const name = seg.length ? `/${seg.join("/")}` : "/";
      const folder = folders.get(name) ?? { name, paths: [] };
      folder.paths.push(p);
      if (folder.paths.length === 1) folders.set(name, folder);
    }

    return {
      host: t.host,
      protocol: t.protocol,
      inScope: t.inScope,
      total: entries.length,
      errors: entries.filter((e) => e.status >= 400).length,
      methods: Array.from(new Set(entries.map((e) => e.method))).slice(0, 5),
      folders: Array.from(folders.values())
        .sort((a, b) => b.paths.reduce((s, p) => s + p.count, 0) - a.paths.reduce((s, p) => s + p.count, 0))
        .slice(0, 10),
    };
  });
}

/* ---------------- Derived helpers ---------------- */

export function statusPhrase(code: number): string {
  return statusText(code);
}

export function resetStore() {
  cache = null;
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  load();
}
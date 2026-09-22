export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

export interface TrafficEntry {
  id: number;
  method: HttpMethod;
  host: string;
  path: string;
  status: number;
  size: string;
  mime: string;
  time: string;
  timestamp: string;
  req: string;
  res: string;
  servedBy?: "live" | "demo" | "error";
  note?: string;
}

export type Severity = "high" | "medium" | "low" | "info";

export interface IssueDetail {
  label: string;
  value: string;
}

export interface Issue {
  id: string;
  title: string;
  severity: Severity;
  confidence: string;
  cvss?: string;
  cwe?: string;
  host: string;
  path: string;
  parameter?: string;
  description: string;
  evidence: string;
  remediation: string;
  details: IssueDetail[];
  discovered: string;
  relatedRequestId?: number;
}

export interface SiteNode {
  id: string;
  label: string;
  kind: "host" | "folder" | "leaf";
  host: string;
  path?: string;
  color?: "blue" | "purple" | "amber";
  defaultClosed?: boolean;
  children?: SiteNode[];
}

export interface StatCard {
  label: string;
  value: string;
  delta?: string;
  tone?: "green" | "red" | "amber" | "blue" | "mute";
}

export interface ScanCheck {
  id: string;
  label: string;
  description: string;
}

export interface IntruderResult {
  request: number;
  payload: string;
  position: string;
  status: number;
  length: number;
  time: string;
  comment: string;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  author: string;
  version: string;
  type: "BApp" | "Reporter" | "Utility";
  description: string;
  installs: number;
  rating: number;
  enabled: boolean;
}

export interface ExtLogEntry {
  time: string;
  level: "info" | "warn" | "error";
  message: string;
}

export type ExtensionCatalogEntry = ExtensionInfo & { installed: boolean };

/* ---------------- Backend records ---------------- */

export interface TargetHost {
  host: string;
  protocol: "http" | "https";
  inScope: boolean;
}

export interface SavedRequest {
  id: number;
  name: string;
  req: string;
  host: string;
}

export interface ScanFinding {
  id: string;
  severity: Severity;
  title: string;
  path: string;
  evidence: string;
  confidence: string;
}

export type ScanStatus = "queued" | "running" | "done" | "error";

export interface ScanRecord {
  id: number;
  target: string;
  checks: string[];
  status: ScanStatus;
  progress: number;
  phase: string;
  createdAt: string;
  findings: ScanFinding[];
  message?: string;
}

export interface RelayResult {
  status: number;
  headers: [string, string][];
  body: string;
  size: string;
  timeMs: number;
  rawReq: string;
  rawRes: string;
  url: string;
  servedBy: "live" | "demo" | "error";
  error?: string;
}

export interface IntruderPayloadRun {
  request: number;
  payload: string;
  position: string;
  status: number;
  length: number;
  time: string;
  comment: string;
  servedBy: "live" | "demo" | "error";
}

export type IntruderAttackType =
  | "sniper"
  | "battering-ram"
  | "pitchfork"
  | "cluster-bomb";

export interface IntruderPosition {
  marker: string;
  values: string[];
}

export interface IntruderAttackInput {
  rawReq: string;
  host?: string;
  attackType: IntruderAttackType;
  positions: IntruderPosition[];
}

/* ---------------- Derived / log records ---------------- */

export interface ActivityEvent {
  at: string;
  text: string;
  module: string;
}

export interface SitePath {
  path: string;
  method: string;
  count: number;
  lastStatus: number;
}

export interface SiteFolder {
  name: string;
  paths: SitePath[];
}

export interface SiteStats {
  host: string;
  protocol: "http" | "https";
  inScope: boolean;
  total: number;
  errors: number;
  methods: string[];
  folders: SiteFolder[];
}
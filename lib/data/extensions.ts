import type { ExtensionInfo } from "@/lib/types";

/** BApp Store catalogue — anything not yet installed can be added to the workspace. */
export const storeCatalog: ExtensionInfo[] = [
  {
    id: "logger-pp",
    name: "Logger++",
    author: "PortSwigger",
    version: "2.2.0",
    type: "BApp",
    description:
      "Enables logging of all HTTP traffic to the file system with configurable scope and custom filters.",
    installs: 135720,
    rating: 4.8,
    enabled: false,
  },
  {
    id: "active-scan-pp",
    name: "Active Scan++",
    author: "sld",
    version: "1.0.7",
    type: "BApp",
    description:
      "Adds more extension checks to the active scanner — CSP bypasses, polyglot payloads and DOM sinks.",
    installs: 84012,
    rating: 4.5,
    enabled: false,
  },
  {
    id: "request-timer",
    name: "Request Timer",
    author: "clifton",
    version: "2.1",
    type: "BApp",
    description:
      "Records precise response timings for every request, sorting by response time to expose slow endpoints.",
    installs: 22610,
    rating: 4.3,
    enabled: false,
  },
  {
    id: "html5-auditor",
    name: "HTML5 Auditor",
    author: "byteweaver",
    version: "0.3.6",
    type: "BApp",
    description:
      "Checks HTML5 features used across the site map and flags client-side sinks reachable from the DOM.",
    installs: 7812,
    rating: 4.0,
    enabled: false,
  },
];
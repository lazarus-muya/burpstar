# BurpStar Suite Pro

A Burp Suite Pro–style web security testing workbench built with **Next.js (App Router)**, **TypeScript** and **Tailwind CSS v4**. It provides an interactive dark "security workbench" UI for editing and relaying raw HTTP requests, scanning targets, fuzzing, decoding, diffing, and more.

It works in two modes:

- **Live relay** — requests you send from Repeater / Intruder / Scanner are actually executed against the target host by the Next.js server (`lib/server/engine.ts`).
- **Offline demo** — hosts that resolve to the reserved `.test` / `.invalid` TLDs are served by a built-in demo responder (`lib/server/demo.ts`) so you can experiment without network access.

All captured traffic, issues and scan results are persisted to a single JSON store (`data/store.json`).

**Free & open source.** BurpStar is completely **free to use** — for personal, educational and commercial projects alike. It is released under the [MIT License](./LICENSE). Please use it **at your own risk**: it is a security testing tool, so only ever point it at systems you own or are authorized to test. See [Disclaimer](#disclaimer).

## Requirements

- **Node.js 20.9+** (Next.js 16 requirement)
- npm (bundled with Node)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Open http://localhost:3000 — the Dashboard is the entry point. The Proxy tab is a good first stop: it generates demo traffic on load so you can explore the request/response viewers.

## Scripts

| Command                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `npm run dev`                 | Start the dev server with hot reload          |
| `npm run build`               | Production build (type-checks + lints)        |
| `npm run start`               | Serve the production build (run after build)  |
| `npm run lint`                | Run ESLint over the codebase                  |
| `npx tsc --noEmit`            | Type-check without emitting (no TS build step)|

Production run:

```bash
npm run build
npm run start       # http://localhost:3000
```

## Modules

| Route       | Module          | Description                                                                 |
| ----------- | --------------- | --------------------------------------------------------------------------- |
| `/`         | Dashboard       | Overview: target stats, issue feed, scan activity                            |
| `/target`   | Scope + map     | Manage targets, add paths, view the site map / activity                      |
| `/proxy`    | Proxy           | HTTP history, message viewer (Raw/Headers/Params/Render/Hex), issue inspector |
| `/intruder` | Intruder        | Attack sequence with position markers (`§`), live fuzzing against a target   |
| `/repeater` | Repeater        | Multi-tab raw HTTP editor; Send relays the request to its target host        |
| `/scanner`  | Scanner         | Scan queue, active scan configuration, reported issues                       |
| `/decoder`  | Decoder         | Base64 / URL / Hex / HTML / Unicode transforms                               |
| `/comparer` | Comparer        | Line-level diff of two messages                                              |
| `/extender` | Extender        | Extension store, installed extensions, JS console output                     |

## Architecture

```
app/            App Router pages (one per route), layout, and /api routes
components/     UI primitives (ui.tsx, icons.tsx), top/status bars,
                and one module component per tool (components/modules/…)
lib/            types.ts, utils.ts (raw HTTP parsing, hex dump, diff),
                encodings.ts, highlight.tsx
  client/api.ts Client-side fetch wrapper for the API routes
  data/         static catalogs (extensions list, intruder wordlists)
  server/       engine.ts (HTTP relay), demo.ts (offline responder),
                store.ts (persistence), scanner.ts, intruder.ts, extender.ts
data/store.json Runtime data store (all traffic, issues, scans, settings) — git-ignored
```

### Data persistence

- Everything is a plain JSON snapshot written to `data/store.json` after each mutation (`lib/server/store.ts`).
- The store is **seeded empty** — no demo traffic is preloaded. The Proxy module generates a small amount of demo traffic in the browser on first load so you can explore the UI.
- To reset the app from scratch: stop the dev server, delete `data/store.json`, restart. (An empty store re-initializes automatically.)
- `data/` is excluded via `/data` in `.gitignore` — the store never enters the repo.

### Live relay & safety

- Requests from Repeater/Intruder/Scanner are sent by `lib/server/engine.ts` (redirects are **not** followed, so responses show the real chain).
- By default connecting to **private/loopback** ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`) is blocked, and non-http(s) URLs are rejected.
- To allow private/loopback targets (e.g. testing your local apps), set the env var when starting:

```bash
# PowerShell
$env:BURPSTAR_ALLOW_PRIVATE="1"; npm run dev
```

### Offline demo responder

Any host ending in the reserved TLDs `.test` or `.invalid` is served locally by `lib/server/demo.ts` — no real network needed. It responds with plausible bodies (login pages, JSON APIs, 301/302 redirects, 401s) and can be made to "fail" by appending malformed paths. Example:

```
Host: shop.test         # fictional storefront with /cart, /orders, /api
Host: vault.test        # fictional admin panel behind /login
```

## API

All endpoints live under `/api` and read/write the shared store. Auth-less and JSON-based.

| Endpoint                              | Methods | Purpose                                    |
| ------------------------------------ | ------- | ------------------------------------------ |
| `/api/relay`                          | POST    | Send a raw HTTP request (Repeater)         |
| `/api/history`                        | GET, POST    | HTTP history entries                  |
| `/api/history/[id]`                   | GET     | Single history entry                       |
| `/api/sitemap`                        | GET     | Site map tree + activity                   |
| `/api/targets`                        | GET, POST    | List / add targets                    |
| `/api/targets/[host]`                 | DELETE  | Remove a target                            |
| `/api/issues`                        | GET, POST    | List / add security issues            |
| `/api/issues/[id]`                    | GET, DELETE | Single issue / remove                |
| `/api/scans`                          | GET, POST    | List scans / start a new scan         |
| `/api/scans/[id]`                     | GET, PATCH   | Read / update a scan                  |
| `/api/scanner`                        | POST    | Run a single check against a URL           |
| `/api/intruder`                       | POST    | Run a fuzzing campaign                     |
| `/api/savedRequests`                  | GET, POST    | Saved request templates               |
| `/api/savedRequests/[id]`             | PUT, DELETE | Update / delete a saved request      |
| `/api/extensions`                     | GET, POST    | Installed extensions                  |
| `/api/extensions/[id]`                | DELETE  | Uninstall an extension                     |
| `/api/extensions/store`               | GET     | Extension store catalog                    |
| `/api/extensions/store/[id]`          | POST    | Install from catalog                       |
| `/api/extensions/console`             | GET, POST    | Extension console output              |

Example — send a request with Repeater:

```http
POST /login HTTP/1.1
Host: shop.test
Content-Type: application/x-www-form-urlencoded

user=admin&pass=test
```

Paste the above into the Repeater request editor, set the host override to `shop.test`, and press **Send**. The demo responder returns a response, an entry is appended to `HTTP history`, and a redirect (if any) is shown untraversed.

Example — Intruder fuzzing:

```
GET /search?q=§admin§ HTTP/1.1
Host: shop.test
```

Positions between `§` markers are replaced with each payload from the wordlist (e.g. SQLi / XSS payloads), and every request/response pair is recorded.

Example — Scanner:

1. Go to **Scanner**, enter a target like `https://example.com` (or `http://shop.test` for offline demo).
2. Pick checks — SQLi, XSS, SSRF, IDOR, auth, JWT, headers, info disclosure.
3. Run the scan; results land in the scan's **Report** and flagged issues appear under `/api/issues`.

## Design tokens

Colors and fonts mirror a dark "security workbench" aesthetic and are declared as **Tailwind v4 theme tokens** in `app/globals.css` (`@theme`), usable as utility classes out of the box. Notable tokens:

| Token          | Value    | Usage                       |
| -------------- | -------- | --------------------------- |
| `--color-base` | `#0b0d10`| page background (`bg-base`) |
| `--color-panel`| `#121519`| panels / cards (`bg-panel`) |
| `--color-line` | `#232830`| borders (`border-line`)     |
| `--color-text` | `#e8ebef`| primary text (`text-text`)  |
| `--color-dim` / `--color-mute` | `#98a2b0` / `#69727f` | secondary text |
| `--color-accent` | `#ff7a2f` | accent orange (`text-accent`) |
| `--color-green` / `--color-red` / `--color-blue` / `--color-amber` | status + syntax colors |

Fonts: `--font-sans` (system/Segoe UI/Inter) and `--font-mono` (JetBrains Mono/Cascadia/Consolas).

## Layout

- `app/` — one page per module plus the root layout (top bar, main shell, status bar); the layout is `force-dynamic`.
- `components/modules/` — a self-contained component per tool; the Proxy module is split into history, navigator, inspector, toolbar and the message viewer.
- `lib/server/` — all routing/relay/scoring logic runs server-side in the API routes; the browser only renders and calls `/api`.

## Security notes

- This is a **development / lab tool**, not an authorized testing product. Only point it at targets you own or are authorized to test.
- Raw request relay trusts the URL you enter — always double-check the `Host` / target before sending.
- Loopback and private-address targets are refused unless `BURPSTAR_ALLOW_PRIVATE=1` is set.
- The demo responder and store are intentionally local-only; no data leaves the machine.

## Disclaimer

BurpStar is a **web security testing tool** provided **free of charge** and distributed **"AS IS", without warranty of any kind** (see the LICENSE). By using it, you acknowledge and accept that:

- **You use it entirely at your own risk.** The authors and contributors are not liable for any damage, data loss, downtime, or legal consequences arising from its use — direct or indirect.
- It is your responsibility to only use it against systems you **own** or have **explicit written authorization** to test. Unauthorized scanning or attacking of systems is illegal in many jurisdictions and is solely your responsibility.
- Requests are relayed **exactly as you configure them** — a mistyped URL, `Host` header, or scan target is sent to whatever destination you specify. Always double-check your targets before sending.
- This is a **development / lab tool**, not a substitute for professional penetration testing, and results should be independently verified.
- The software carries **no warranty, no guarantee of accuracy or fitness for a particular purpose**, and no support obligation whatsoever.

If you do not agree with these terms, do not use this software.

## License

This project is released under the **MIT License** — see [LICENSE](./LICENSE).

Copyright (c) 2026 lazarus-muya. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the conditions of the MIT License.
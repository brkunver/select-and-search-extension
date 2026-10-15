# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. Read this before changing code.

## 1. What this project is

**Select and Search** is a cross-browser (Chrome MV3 first, Firefox build available) browser extension built with
[WXT](https://wxt.dev). The user selects text on any page, a small "Search on <engine>" button appears, and clicking it
opens the configured search engine in a new tab. The popup lets the user pick the engine, place the button, and switch
the extension off for an entire domain.

- Published on the Chrome Web Store: `mgjfilenmbeoagpdflbcchgnglchnplk`
- Repo name / package name: `select-and-search`, version lives in `package.json`
- License: MIT, author: Burakhan Unver

## 2. Stack and commands

| Concern        | Choice                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Framework      | WXT `0.20.x` (Vite 6 under the hood)                                       |
| Language       | TypeScript, ESM only (`"type": "module"`), strict mode via `.wxt/tsconfig` |
| Package runner | **Bun** (`bun@1.4.4-canary.1` in `package.json`), lockfile is `bun.lock`   |
| Formatting     | Prettier, `.prettierrc.json`                                               |
| Styling        | Plain CSS files (no Tailwind, no CSS framework)                            |
| Tests          | None in the repo yet                                                       |

```bash
bun install          # runs `wxt prepare` via postinstall, regenerates .wxt/
bun run dev          # wxt dev (does NOT open a browser: webExt.disabled = true)
bun run dev:firefox  # wxt dev -b firefox
bun run build        # production build -> .output/chrome-mv3
bun run build:firefox
bun run zip          # packaging for the stores
bun check            # type check: the gate to run after every change
bun run compile      # `bun check && bun run build`
bun run format       # `bun fmt`: Bun's formatter, reads .prettierrc.json (prettier itself is not installed)
```

Always run `bun check` after a change and `bun run build` before claiming a feature works. `.output/` and `.wxt/`
are git-ignored build artifacts — never hand-edit them.

**Type checking is `bun check` — do not use `tsc`.** It is Bun's built-in checker: it reads the nearest
`tsconfig.json` (the root one extends the generated `.wxt/tsconfig.json`), so `@/` and `#imports` resolve exactly as
they do for the bundler, it reports the same `TS####` errors as `tsc`, it checks in parallel, and it exits with code 1
on the first failing file. Two things to remember when you filter its output: the summary and error list go to
**stderr**, and the exit status must survive the pipe (e.g. capture `${PIPESTATUS[0]}`).

## 3. Repository layout

```
entrypoints/
  background.ts        # service worker: seeds default storage values on first install
  content.ts           # the search button injected into every page (the actual feature)
  search-btn.css       # styles for the injected button (bundled into content.css)
  popup/
    index.html         # popup markup (structure only, no inline handlers)
    index.css          # popup design system (CSS variables, light + dark)
    main.ts            # popup logic: engine select, position picker, per-site toggle
storage.ts             # every persisted value as a typed WXT storage item
domain.ts              # pure host/domain helpers used by the popup and the content script
wxt.config.ts          # manifest config (name, permissions, dev-server behaviour)
public/icon/*.png      # 16/48/128 px icons
```

`@/` (and `~/`) alias to the repository root, so `@/storage` and `@/domain` work from anywhere. The alias comes from the
generated `.wxt/tsconfig.json`, which the root `tsconfig.json` extends.

## 4. Storage model (`storage.ts`)

All state is declared once as `storage.defineItem` so keys and types are shared across entrypoints. Everything uses the
`local:` area (this project chose `local` over `sync` for consistency; do not migrate keys without a WXT migration).

| Key                     | Type             | Fallback                           | Meaning                                               |
| ----------------------- | ---------------- | ---------------------------------- | ----------------------------------------------------- |
| `local:engine`          | `string`         | `"Google"`                         | Engine **name**, only used for the button label       |
| `local:url`             | `string`         | `https://www.google.com/search?q=` | Query prefix the button concatenates the selection to |
| `local:buttonLocation`  | `ButtonLocation` | `"tooltip"`                        | Where the button is placed                            |
| `local:disabledDomains` | `string[]`       | `[]`                               | Domains where the extension is switched off           |

`local:engine` and `local:url` must stay in sync: the popup writes both together (see `initEngineSelect`), and
`background.ts` seeds both on install. The content script reads `engine` for the label and `url` for navigation.

`ButtonLocation = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tooltip"`.

## 5. Per-site disable feature

**Behaviour.** The popup's first card shows the active tab's domain and a switch. Turning it off stores that domain in
`local:disabledDomains` and the extension stops reacting to text selections there — on the whole domain, not just the
current URL. `https://notepad.js.org/` → switch off → stored entry `notepad.js.org` → equivalent of the match pattern
`*notepad.js.org/*`, i.e. `www.notepad.js.org` and `blog.notepad.js.org` are switched off too.

**Matching rules (`domain.ts`).**

- Only `http:`/`https:` URLs are addressable; `chrome://`, `about:`, `file://` and extension pages report no domain and
  the popup shows a "Not available here" state.
- Hostnames are normalized: lowercased, trailing dot removed, leading `www.` stripped, so `www.notepad.js.org` and
  `notepad.js.org` are one site. IPv4/IPv6 hosts are kept verbatim.
- `findDisabledRule(host, list)` returns the exact entry, otherwise the shortest ancestor entry that the host is a
  subdomain of, otherwise `null`. `isDomainDisabled` is just `findDisabledRule(...) !== null`.
- `addDisabledDomain` refuses redundant entries, `removeDisabledDomain` removes one rule by name.

**UI consequence.** When a site is disabled by a parent rule (user is on `blog.notepad.js.org` while `notepad.js.org` is
in the list) the switch reads "Disabled" and the hint names the broader rule; flipping the switch removes that rule,
because a subdomain cannot be re-enabled while its parent rule exists. The "Disabled sites" list shows every stored rule
with a per-rule remove button plus "Re-enable all sites".

**How the content script honours it.** `entrypoints/content.ts` is still statically registered on `<all_urls>` (there is
no dynamic registration), so it always loads, but it holds a `siteDisabled` flag that is initialised from
`disabledDomains.getValue()` and kept current with `disabledDomains.watch(...)`. While `siteDisabled` is true the
`mouseup` handler bails out and the button is hidden, so toggling in the popup takes effect immediately on already-open
pages without a reload. If you add new entry points of interaction, gate them on the same flag.

**Permission note.** Reading the active tab's URL needs `activeTab`, which Chrome grants when the user clicks the
extension action to open the popup. Do not add the broad `tabs` permission; do keep a graceful "Not available here"
branch because `tab.url` can still be `undefined` (e.g. `chrome://` pages).

## 6. Content script behaviour and gotchas

- The button is a single `div.search-btn` appended to `document.documentElement`, not `document.body`: page CSS with
  `transform`/`filter` on `body` breaks `position: fixed`, which used to scatter the button across the viewport.
- `lockPosition()` writes `position/margin/transform/z-index` with `!important` **inline** so hostile page CSS cannot
  move the button; per-placement offsets are also set inline with `!important`.
- Tooltip mode measures the selection's `getBoundingClientRect()`; it flips below the selection when there is no room
  above, clamps horizontally, and hides itself when a site returns empty rects (invisible nodes, custom editors).
- The button hides on `mousedown` outside itself, on `scroll` (capture phase) and on `resize`.
- Storage is read with `.getValue()` **and** watched, so popup changes apply to open tabs instantly.
- Content scripts run in the top frame only (`allFrames` is not set) and at the default `document_idle`.
- `entrypoints/content.ts` is imported by the build in Node during bundling: keep runtime code inside `main()`.

## 7. Popup UI conventions

- `index.html` owns the structure and the static icon markup; `main.ts` fills in dynamic values (engine `<option>`s,
  disabled-sites list) and owns all event listeners. Do not reintroduce inline `on*` handlers or a
  `<link rel="stylesheet">` tag — the stylesheet is imported from `main.ts` and Vite injects it into the built HTML.
- `index.css` is a small design system: light/dark palettes as CSS variables under `:root`, dark values inside
  `@media (prefers-color-scheme: dark)`. Reuse the variables (`--surface`, `--accent`, `--warn`, `--muted`, …) instead
  of hard-coding colors. The popup is a fixed 332 px wide.
- The "Button position" picker buttons must keep their `data-location` attribute equal to a value of `ButtonLocation`;
  `main.ts` logs a console error when a location has no button or an unknown value shows up. `aria-pressed` reflects the
  active choice, the switch uses `role="switch"` + `aria-checked`.
- Never inject untrusted values (domains from storage, tab URLs) with `innerHTML` — use `textContent`. The only
  `innerHTML` use is the static inline SVG for the remove icon.

## 8. Coding conventions

Project `typescript-rules` apply: Prettier with `semi: false`, double quotes, `printWidth: 120`, `tabWidth: 2`, no
semicolons, kebab-case file names, `lowerCamelCase` variables, `PascalCase` types, `type` over `interface`, string union
types over `enum`, `async/await` over `.then()`, prefer function declarations over arrow functions (arrows only for
callbacks), always braces, avoid `any` and type assertions.

WXT specifics: use the `browser` global/`#imports` instead of `chrome.*`, import `storage` from `#imports` only inside
`storage.ts` so every other file consumes the typed items, and keep `defineBackground`/`defineContentScript` as the
default export of their entrypoint.

Tooling: `bun check` is the type checker (`tsc` is out) and `bun fmt` the formatter. Run both before you call a change
done.

## 9. Verification checklist

1. `bun check` — must be clean (exit 0; it prints its report on stderr). `bun run compile` runs this plus the build.
2. `bun run build` — then inspect `.output/chrome-mv3/manifest.json` (permissions, `action.default_popup`,
   `content_scripts.matches`) and confirm the popup HTML links its hashed JS/CSS assets.
3. Load `.output/chrome-mv3` via `chrome://extensions` → "Load unpacked" for manual testing.
4. Manual QA: select text on a normal page → button appears in the configured location and searches with the chosen
   engine; change the engine/position in the popup and confirm open tabs react without a reload; switch a site off in the
   popup and confirm the button stops appearing in that tab _and_ after a reload, on a subdomain too; re-enable from the
   list; check a `chrome://` page shows the "Not available here" state.
5. Check the popup in both light and dark OS themes.

## 10. Known issues / constraints

- `webExt.disabled = true` means `bun run dev` never launches a browser for you.
- The Firefox build (`bun run build:firefox`) is not covered by any automated check; `activeTab` and the storage API work
  there, but `browser` API differences are untested.
- There is no test suite; consider Vitest + `wxt/testing` (`fakeBrowser`) before growing `domain.ts`, which is pure and
  the easiest place to start.

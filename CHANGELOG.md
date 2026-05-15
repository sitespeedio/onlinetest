# Onlinetest changelog

This changelog combines the server and testrunner changes. The changelog do [semantic versioning](https://semver.org).

## 3.8.0 - 2026-05-15

Picks up sitespeed.io 41 as the default test engine, plus a `/admin` accuracy fix and a vendored compare-bundle refresh.

### Changed
* Default sitespeed.io Docker image bumped from 40 to 41 in `.env.example`. The README "Update sitespeed.io version" snippets now reference 41 / 42 as the current and next-major tags.
* Vendored compare bundle rolled to pagexray 5.0.0 (HTTP/3 detection, case-insensitive `Cache-Control` directives, `missingCompression` over-count fix). The bundle shrinks from ~28 KB to ~17 KB thanks to pagexray's switch from uglify-es to terser [#262](https://github.com/sitespeedio/onlinetest/pull/262).

### Fixed
* `/admin` "failed" pill is now a real health signal: it counts failed test runs in the last 24 h from Postgres instead of Bull's `getJobCounts()`, which was capped by `removeOnFail` and only decayed on a successful retry — so the pill accumulated weeks of stale failures and shouted "13 failed" next to activity cards that correctly showed 0 in 24 h [#261](https://github.com/sitespeedio/onlinetest/pull/261).
* Compare cookie list no longer renders domains like `.example.com\nUIDR=...` when a HAR concatenates multiple `Set-Cookie` response headers into one newline-joined value — the next cookie's name was leaking into the previous cookie's `Domain=` attribute. Picked up via the pagexray bump [#262](https://github.com/sitespeedio/onlinetest/pull/262).

## 3.7.0 - 2026-05-13

More `/admin` polish — per-queue trend lines, small motion cues, and a couple of testrunner re-registration fixes.

### Added
* Per-queue 24 h sparkline on each `/admin` queue row, independently scaled so low- and high-traffic queues both show shape [#256](https://github.com/sitespeedio/onlinetest/pull/256).
* Subtle motion on `/admin`: one-time staggered bar-chart entrance, refresh-indicator pulse, and tweened number rollups when totals change. All honour `prefers-reduced-motion` [#256](https://github.com/sitespeedio/onlinetest/pull/256).

### Fixed
* Queue defaults bumped to `removeOnComplete: 50 / removeOnFail: 100 / attempts: 2`; code-level fallbacks aligned with the yaml [#255](https://github.com/sitespeedio/onlinetest/pull/255).
* Internal queues (`testrunners`, `result`) no longer listed on `/admin` — they had no failures, no sparkline, and an inert Empty button [#258](https://github.com/sitespeedio/onlinetest/pull/258).
* Refresh indicator on `/admin` now sits in a fixed-width column so the version pill can't shift sideways each tick [#258](https://github.com/sitespeedio/onlinetest/pull/258).
* Testrunner setup duplicated on restart — registration was concatenating old + new instead of deduping [#257](https://github.com/sitespeedio/onlinetest/pull/257).
* Multi-type setups on one location (e.g. desktop + emulatedMobile) collapsed into the last entry after a restart; dedupe now keys on full setup identity, not just queue name [#259](https://github.com/sitespeedio/onlinetest/pull/259).

## 3.6.0 - 2026-05-13

More `/admin` polish: activity stats from the database and a chart of recent test volume.

### Added
* Activity stats on `/admin`: totals for the last 24 hours and 7 days plus a stacked bar chart of tests per hour over the last 24 h (completed / failed / other). Pure server-rendered SVG, cached for 60 s so the auto-refresh doesn't beat on Postgres [#252](https://github.com/sitespeedio/onlinetest/pull/252).

### Fixed
* Hide the Failed count for the internal `testrunners` and `result` queues — the number was unactionable because the queues don't appear in Recent failures [#251](https://github.com/sitespeedio/onlinetest/pull/251).
* Age labels in Recent failures now graduate to `d`/`mo` past 48 h instead of shouting `12608h ago` [#251](https://github.com/sitespeedio/onlinetest/pull/251).
* Long URLs no longer push the `/search/` results table past its container and shove the page off-centre. URL cells now wrap at any character; the form has `overflow-x: auto` as a safety net [#253](https://github.com/sitespeedio/onlinetest/pull/253).

## 3.5.0 - 2026-05-13

The `/admin` page becomes a real operator dashboard, and `/search/` gets opt-in auto-refresh.

### Added
* Health banner on `/admin`: Redis up/down, Postgres up/down, connected testrunners, totals for pending/running/failed jobs [#247](https://github.com/sitespeedio/onlinetest/pull/247).
* "Currently running" table on `/admin` — every active job with URL/script, queue, runner, and elapsed time. Runs over 10 minutes are highlighted [#247](https://github.com/sitespeedio/onlinetest/pull/247).
* "Recent failures" table on `/admin` with the error message and a one-click Retry button [#248](https://github.com/sitespeedio/onlinetest/pull/248).
* Active and Failed counts on the queue table, plus a red "no worker" badge when a queue has pending jobs but no testrunner serving it [#246](https://github.com/sitespeedio/onlinetest/pull/246).
* `/admin` auto-refreshes every 15 seconds. Pauses in background tabs [#249](https://github.com/sitespeedio/onlinetest/pull/249).
* Opt-in auto-refresh toggle on `/search/`, 60 seconds. Off by default. Pauses while any test is ticked, so Compare selections aren't lost. State remembered in `localStorage` [#250](https://github.com/sitespeedio/onlinetest/pull/250).
* `/admin` mobile layout reworked for the new tables — rows stack into name → counts → action on narrow screens [#246](https://github.com/sitespeedio/onlinetest/pull/246) [#247](https://github.com/sitespeedio/onlinetest/pull/247) [#248](https://github.com/sitespeedio/onlinetest/pull/248).

## 3.4.0 - 2026-05-13

A round of server-side hardening, operator-experience work, and small UI fixes.

### Security
* Stop logging and echoing back invalid API keys. `validateKey` used to write the rejected value to the server log and return it in the 403 response body, so typos and stale secrets piled up in log aggregation. The log line is now `Invalid API key supplied` (no value, no length) and the response carries a single "Invalid API key." message in every locale [#242](https://github.com/sitespeedio/onlinetest/pull/242).
* Close two XSS vectors that the recent UI work uncovered:
  * The error page rendered captured Bull job logs as raw HTML (`!{logs.join('<br>')}`) — a tested URL whose response leaked `<script>` into the logs could land an XSS on whoever opened the error page. Logs now render in a `<pre>` with escaped content.
  * The search results table built `onclick="addToSearch('label:${test.label}')"` and similar per-row handlers via string concatenation. A single apostrophe in a label or URL broke out of the JS string. Every row action now carries `data-add` / `data-rerun-*` attributes and one delegated `click` listener at the top of the page dispatches to the existing helpers. No user value reaches an inline JS string anymore [#242](https://github.com/sitespeedio/onlinetest/pull/242).
* Enforce a defense-in-depth CSP (`default-src 'self'`; `script-src` / `style-src` allow `'unsafe-inline'` transitionally because pug templates still ship inline blocks; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`) and re-enable HSTS. Both were disabled previously [#242](https://github.com/sitespeedio/onlinetest/pull/242).
* Block sensitive sitespeed.io flags from the GUI's "Command line args" tab. The user-supplied extras textarea used to forward arbitrary flags to the testrunner with only `--verbose` filtered. A GUI submission could load plugin / JS code (`--plugins.add`, `--browsertime.preScript`), run any binary as the browser (`--browsertime.chrome.binaryPath`), redirect HARs and metrics to an attacker-controlled destination (whole `--graphite.*` / `--s3.*` / `--gcs.*` / `--scp.*` / `--slack.*` / `--matrix.*` / `--datadog.*` / `--influxdb.*` namespaces), or read arbitrary files via `--config`. A denylist now drops these tokens (and their value arguments) before they reach sitespeed.io, and `/sitespeed-help.json` filters the same set so the CLI picker stops suggesting them (277 → 187 entries). API submissions (which pass a `userConfig` object, not extras) are deliberately untouched [#241](https://github.com/sitespeedio/onlinetest/pull/241).

### Added
* **Connected testrunners** table on `/admin` showing hostname, location, the setup each machine serves, and a fresh / stale "last seen" badge. Each testrunner publishes a heartbeat on the existing `testrunners` Bull queue every 30 s; the server tracks `lastSeenAt` per runner and prunes anything quiet for >120 s, so crashed runners (OOM, host reboot, `docker kill`) drop off the admin page within ~2 minutes instead of haunting the metrics gauge forever. When two runners pick the same `LOCATION_NAME` + `deviceId`, the server logs a clear `Testrunner queue collision: hostA and hostB both claim queue X. Change LOCATION_NAME (or deviceId) on one of them.` — the registration still goes through so existing deployments don't break, but the collision is no longer silent [#244](https://github.com/sitespeedio/onlinetest/pull/244).
* `deploy/PRODUCTION.md` gets an "Adding a third (or Nth) testrunner" section with three concrete troubleshooting cases: not registering, stale row, queue collision [#244](https://github.com/sitespeedio/onlinetest/pull/244).
* **Compare workflow on `/search/`**: the column over the per-row checkbox is now its own `Compare` header (split out from the generic "Actions"), a one-line helper below the table explains the affordance, and each checkbox carries an `aria-label` / `title` of "Select this run to compare with another". The Compare button itself starts disabled, gates submission until exactly two completed runs are ticked (a third tick is refused — the unchecked boxes go disabled when the limit is hit), and shows a transient inline message on a premature click ("Select 1 more test to enable Compare." / "Select 2 completed tests above first.") via `aria-disabled` + a polite `aria-live` region [#240](https://github.com/sitespeedio/onlinetest/pull/240).
* `deploy/update.sh` — a single operator command that pulls the latest images, restarts services with `up -d --remove-orphans`, prints `docker compose ps`, and tails logs for 10 seconds so first-boot errors land in the same terminal. `--mode {all-in-one|server|testrunner}` picks the right production compose file; `--version X.Y.Z` rewrites `SITESPEED_IO_SERVER_VERSION` / `SITESPEED_IO_TESTRUNNER_VERSION` in `.env` atomically before pulling. `PRODUCTION.md` is updated to call the helper in every place it used to spell out the compose invocation by hand.
* `.env.example` is now the single source of truth for every variable any compose file reads (dev or production). New header walks through the three deployment shapes, and the previously-undocumented `DOMAIN` variable (used by the Caddy single-server compose for automatic HTTPS) is included. `PRODUCTION.md` drops its inline env-var snippets and points at `.env.example` so the two can't drift.

### Fixed
* `SIGTERM` / `SIGINT` now actually drain in-flight HTTP requests before the process exits. The previous shutdown chain ended at `this.app.close()` on the Express app object (no such method exists), so the HTTP server was never told to stop — it just disappeared when `process.exit(0)` fired a few lines later, killing in-flight requests mid-response. The web server now keeps the real `http.Server` reference and calls `close()` on it; a configurable `server.shutdown.timeoutMs` (default 30 s) caps the drain and falls back to `closeAllConnections()` after the deadline. A second signal during shutdown short-circuits to immediate exit for operators who'd rather not wait [#243](https://github.com/sitespeedio/onlinetest/pull/243).
* Custom hero / navbar logo overrides now use whatever dimensions the operator sets in `html.logo.*`. Two hardcoded `aspect-ratio: 90.488 / 19.543` / `aspect-ratio: 123 / 25.375` CSS rules were forcing every logo back to the bundled SVG's proportions [#239](https://github.com/sitespeedio/onlinetest/pull/239).
* The analyze button on the Extras tab no longer sits a few pixels lower than on the other tabs. `#extras .control` was applying `padding: 4px 0` to the submit button's wrapper as well as to the intended checkbox rows; scoped to `.extras-fieldset .control` so only the diagnostics checkboxes get the extra spacing [#239](https://github.com/sitespeedio/onlinetest/pull/239).
* Footer spacing: removed the duplicate `&nbsp;` before "version" and added one between the trailing dash and "AGPLv3", so the footer now reads "©sitespeed.io  2026 - version X.Y.Z - AGPLv3" with consistent spacing [#239](https://github.com/sitespeedio/onlinetest/pull/239).
* Search help panel: tighter copy. "You can combine your search commands. To find a test for a URL, date and browser you can search like this" is now "Combine commands to narrow your search. Example". The "Find tests by …" preamble that repeated on every line is gone — each command now leads with its field name and (where applicable) the allowed values [#239](https://github.com/sitespeedio/onlinetest/pull/239).

## 3.3.1 - 2026-05-12

### Fixed
* Filmstrip 404s in the compare view, again — the 3.3.0 pass still constructed frame URLs on a fixed 100 ms cadence inside `(FirstVisualChange, LastVisualChange)`, which broke whenever visual progress sat flat between two boundaries (the expected JPGs were never written to disk). The vendored compare bundle now reads frame timestamps straight from `_visualMetrics.VisualProgress` — one JPG per VP sample, named after that exact ms — and lets the existing 100 ms padding step forward-fill the uniform grid, so the rendered strip still reads "nothing happened for 2 s" differently from "everything changed in 50 ms" [#238](https://github.com/sitespeedio/onlinetest/pull/238).

## 3.3.0 - 2026-05-12

### Added
* Refreshed the vendored compare bundle with a sharing pass, accurate transfer-size diffs and style recalculation visibility:
  * **Share action** in the result header. When both HARs were fetched from URLs it copies a share link the recipient can open to see the same comparison; otherwise it downloads a single JSON bundle with both HARs embedded, which the start page accepts via drop or paste.
  * **Request diff now reports transfer size**, not the HAR spec's `bodySize` (which is decoded body length and often `-1`/unknown). Prefers `_transferSize` (real bytes over the wire when Chrome / sitespeed.io / WPT recorded it), falls back to `bodySize > 0`, then `content.size > 0`. The byte deltas no longer under-report compressed payloads. Heading now reads "Request/response transfer size difference".
  * **Style recalc rows** in the page-x-ray "Render blocking" section, sourced from the new pagexray 4.5.0 field — how many elements the browser re-styled and how long it spent before FCP and LCP. A real lever for regression hunting that previously didn't show up anywhere.
  * **Render blocking section polish**: blocking-count labels now say "...blocking requests" so the unit is explicit (they used to read like ambiguous measurements), and Style recalc rows render before the request counts so the actual work reads first.

### Fixed
* Filmstrip and Visual Progress thumbnails no longer 404 — frame timestamps are now derived from the same `_visualMetrics.VisualProgress` change points sitespeed.io's own report uses, matching the cadence sitespeed.io actually wrote to disk.
* Millisecond timings in the page-x-ray diff are rounded to whole ms — the new recalc duration field reports sub-ms precision ("17.099 ms") that's noise at this scale.
* "Switch HAR" and run-dropdown changes preserve the previous source URLs / config / stripVersion choice, so the Share UI doesn't downgrade from "Copy share link" to "Download bundle" on every toggle.

## 3.2.0 - 2026-05-12

### Added
* Refreshed the vendored compare bundle to pick up the upstream regression-spotting pass:
  * Page-x-ray table gets a Δ column (red regressions, green improvements, grey "no change") and a per-section colour scheme. A new "Only differences" chip in the column header hides rows where nothing actually moved.
  * CPU "time spent by category" and "events" disclosure rows are now proper sub-tables with their own Δ column.
  * Filmstrip is a single rail of columns with HAR1 stacked over HAR2 at the same timestamp, padded onto a 100 ms grid. HAR1 cells get a blue stripe + "1" badge, HAR2 cells get orange + "2" so the eye lands on the right row without consulting the legend. Columns where the two HARs disagree on visual progress get an amber/red border.
  * Final-screenshot captures grow to ~460 px wide; clicking any thumbnail (capture or filmstrip frame) opens it in an in-page lightbox instead of kicking the user to a new tab.
  * Visual Progress chart gets vertical guide lines at FVC / FCP / LCP / Speed Index for each HAR, colour-coded per metric.
  * Waterfall card gets a "Side by side" toggle that swaps the blend-overlay for a 2-column grid.
  * Accessibility baseline: skip-to-content link, universal `:focus-visible` ring, `<main>` and `<nav>` landmarks, table caption, ARIA labels on every interactive control, alt text on capture images, `prefers-reduced-motion` honoured.
  * Action chips ("Switch", "Only differences", "Side by side", per-column "Upload") now have proper breathing room and consistent alignment.

## 3.1.1 - 2026-05-12

### Fixed
* Filmstrip and Visual Progress thumbnails no longer point at non-existent screenshots. The frame timestamps are now derived from `_visualMetrics.VisualProgress` change points — the authoritative list of frames sitespeed.io actually wrote to disk — instead of speculating a 100 ms grid that breaks on runs with a flat visual-progress stretch [#235](https://github.com/sitespeedio/onlinetest/pull/235).

* Theme and admin CSS now cache-bust on each release via `?v=<server-version>` stamped on the `<link rel="stylesheet">` hrefs. Previously a patch release that only touched the theme CSS could sit in browser caches until the unrelated 30-day cache header expired [#234](https://github.com/sitespeedio/onlinetest/pull/234).

## 3.1.0 - 2026-05-12

## Added
* The GUI skin can now be picked via `HTML_THEME` in `.env` (`console` or `memphis`); maps to `html.theme` in `server.yaml`. Works for both local development and Docker [#233](https://github.com/sitespeedio/onlinetest/pull/233).
* Refreshed the vendored compare bundle [#230](https://github.com/sitespeedio/onlinetest/pull/230) [#231](https://github.com/sitespeedio/onlinetest/pull/231):
  * Filmstrip section is back — works for sitespeed.io HARs (frame URLs are derived from `_meta.screenshot` at 100 ms intervals between FirstVisualChange and LastVisualChange), with a modern two-rail layout (HAR1 above HAR2, lazy-loaded thumbnails, time captions).
  * Visual Progress chart shows a thumbnail strip per HAR below the curve, aligned to the same time axis.
  * Hover a waterfall row to see the full request URL in a floating tooltip; the tooltip follows whichever HAR is currently more visible as the blend slider moves.
  * `?compare=1&har1=URL` autoload now picks page 1 for HAR2 on multi-page HARs (was silently rendering identical panels).
  * Internals: Template7 and the FileDropJS / zlib.js / normalize.css vendored libs are gone — replaced with native template literals, native dragover/drop, native `DecompressionStream`, and a minimal inline reset. ~1 000 fewer lines of vendored JS.
  * Classic script src URLs are now build-stamped (`?v=<buildId>`) so a deploy reaches every visitor on the next page load.
* Memphis search badges for completed / failed tests now use the same coloured-pill treatment the Console theme already had (pastel-fill, ink border, sticker shadow) instead of plain coloured text [#233](https://github.com/sitespeedio/onlinetest/pull/233).

### Fixed
* Blank log stream on the running page after the in-memory queue lookup misses (the page would load, sit silent, then jump to the result on completion). `/api/status/:id` now falls back to deriving the queue from the DB row, the same shape the `/result/:id` fix landed for in 3.0.3 [#229](https://github.com/sitespeedio/onlinetest/pull/229).
* `npm start --prefix server` and `npm start --prefix testrunner` couldn't find the project-root `.env` because npm switches cwd to the package directory and `dotenv/config` only looks there. Both `config.js` files now anchor dotenv to the project root explicitly; Docker is unaffected (env vars come from `docker-compose`'s `env_file`) [#232](https://github.com/sitespeedio/onlinetest/pull/232).

## 3.0.3 - 2026-05-11

### Fixed
* Fix spinning /result page when a queued test is in active state [#228](https://github.com/sitespeedio/onlinetest/pull/228).

## 3.0.2 - 2026-05-11

### Fixed
* Shorten the URL input placeholder so the allowed-domain regex hint fits on narrower viewports [#227](https://github.com/sitespeedio/onlinetest/pull/227).

## 3.0.1 - 2026-05-11

###  Fixed
* Show the configured `allowedDomain` regex in the URL input placeholder so users can see which URLs are accepted [#225](https://github.com/sitespeedio/onlinetest/pull/225).
* Fix broken status polling and missing fonts on the running page [#226](https://github.com/sitespeedio/onlinetest/pull/226).

## 3.0.0 - 2026-05-11

The 3.0.0 release replaces the Bulma-based GUI with a hand-written design system and ships two configurable themes. The API and database schema are unchanged.

### Upgrading from 2.X to 3.0
* If you have custom CSS in `html.css.override` that targets Bulma classes (e.g. `.button.is-primary`, `.notification.is-success`), it will need to be rewritten — Bulma is no longer loaded.
* Pick a theme via `html.theme` in `server.yaml`: `console` (engineering-grade light/dark dashboard, default) or `memphis` (playful pastel sticker design). Existing setups default to `console`.

### Added
* Collect metrics from the server and make it available for Prometheus [#213](https://github.com/sitespeedio/onlinetest/pull/213).
* New API endpoint to retrieve the full Browsertime JSON for a completed test via `GET /api/result/:id` [#217](https://github.com/sitespeedio/onlinetest/pull/217).
* Two configurable GUI themes: `console` (default) and `memphis`, selected via `html.theme` in server.yaml [#224](https://github.com/sitespeedio/onlinetest/pull/224).
* Lazy-load the Ace editor so it only fetches when the Scripting tab is opened; first paint of the start page drops by roughly 700 KB [#224](https://github.com/sitespeedio/onlinetest/pull/224).
* Searchable picker of all sitespeed.io CLI flags in the Command line tab [#224](https://github.com/sitespeedio/onlinetest/pull/224).
* Significant accessibility improvements: skip links, real labels, ARIA tablist with arrow-key navigation, modal focus trap, role attributes, aria-current on nav, aria-busy/aria-live on the running page, ≥44 px touch targets, prefers-reduced-motion, `/`-to-focus and ⌘↵-to-submit shortcuts [#224](https://github.com/sitespeedio/onlinetest/pull/224).
* Added step-security/harden-runner to all GitHub Actions workflows [#222](https://github.com/sitespeedio/onlinetest/pull/222).

### Changed
* Replaced the Bulma CSS framework with a hand-written design system — drops ~250 KB of vendor CSS. Custom CSS overrides targeting Bulma classes will need to be rewritten [#224](https://github.com/sitespeedio/onlinetest/pull/224).
* Default sitespeed.io Docker image bumped from 39 to 40 in `.env.example`.
* Pinned GitHub Actions to specific commit SHAs for supply-chain security [#220](https://github.com/sitespeedio/onlinetest/pull/220).
* Switched the API Docker workflow's harden-runner egress policy to `block` [#223](https://github.com/sitespeedio/onlinetest/pull/223).

### Fixed
* Smarter URL matching in scripting validation: now handles both single and double quotes, and whitespace inside `commands.measure.start(...)` / `commands.navigate(...)` calls [#211](https://github.com/sitespeedio/onlinetest/pull/211).
* Better error handling in the API result endpoint [#218](https://github.com/sitespeedio/onlinetest/pull/218).

## 2.0.0 - 2026-01-22

With the 2.0.0 release we combine the changelog for the server/testrunner and simplifying the releases. They will now be released with the same release number. If you want to find the old CHANGELOG entries, scroll down in this file.

The 2.0.0 release has some breaking changes. The goal with the release is to make the setup more solid. There's been no database changes or setup changes for the server however the docker compose files has been cleaned up and the way of starting the services has changed.

The README.md file is updated new documentation. There's a couple of new things:
* The docker compose file has been splitted into three:
  * The dependencies (Redis, Minio and PostGreSQL)
  * The server
  * The testrunner
* We use Redis by default (instead of KeyDB)
* You should use a .env file for your setup

### Upgrading from 1.X release to 2.0
// Coming soon

### Changed
* Rename defaulLocale configuration to locale [#178](https://github.com/sitespeedio/onlinetest/pull/178). If you used `localization:defaultLocale` that is now `localization:locale`.
* Updated minio to latest release. There are some changes on startup so check the PR and update your docker compose accordingly [#163](https://github.com/sitespeedio/onlinetest/pull/163).
* Switched to default use Redis instead of KeyDB since Redis is Open Source again [#169](https://github.com/sitespeedio/onlinetest/pull/169).
* Reworked the docker compose files [#200](https://github.com/sitespeedio/onlinetest/pull/200) [#202](https://github.com/sitespeedio/onlinetest/pull/202) [#203](https://github.com/sitespeedio/onlinetest/pull/203)
* Always use .env if it exists for both the server and the testrunner (and the compose files) [#190](https://github.com/sitespeedio/onlinetest/pull/190).

### Fixed
* Make sure the configuratiomn (nconf) is never accessed before configuration files is read [#177](https://github.com/sitespeedio/onlinetest/pull/177).
* Bump Postgres to latest version [#172](https://github.com/sitespeedio/onlinetest/pull/172)
* Fix correct path to scripting file [#167](https://github.com/sitespeedio/onlinetest/pull/167).
* Update to sitespeed.io 39 [#171](https://github.com/sitespeedio/onlinetest/pull/171).
* Use Trixie as base image [#185](https://github.com/sitespeedio/onlinetest/pull/185).
* Simplify how we do releases [#206](https://github.com/sitespeedio/onlinetest/pull/206)
* The webserver port was hardcoded, fixed in [#204](https://github.com/sitespeedio/onlinetest/pull/204).
* Renamed the default yaml files for server and testrunner [#199](https://github.com/sitespeedio/onlinetest/pull/199)

### Added
* Docker containers now uses NodeJS 24 [#173](https://github.com/sitespeedio/onlinetest/pull/173).
* German translations, thank you [Tobi](https://github.com/WBT112) for PR [#174](https://github.com/sitespeedio/onlinetest/pull/174).
* Translations: Arabic, Bengali, Spanish, French, Hindi, Portuguese, Russian, Urdu, Simplified Chinese thank you [Tobi](https://github.com/WBT112) for PR [#181](https://github.com/sitespeedio/onlinetest/pull/181).
* Basic Auth for admin now uses .env file and will warn in the logs if no auth is setup [#205](https://github.com/sitespeedio/onlinetest/pull/205).

## Old server changelog

## 1.7.1 - 2025-10-23
### Fixed
* Fix for the search qyuery parameter [#162](https://github.com/sitespeedio/onlinetest/pull/162).

## 1.7.0 - 2025-10-22
### Added
* Updated dependencies (too many PRs).
* Update to NodeJS 22 [#155](https://github.com/sitespeedio/onlinetest/pull/155)

## 1.6.5 - 2025-03-11
### Fixed
* And another fix for script names [#146](https://github.com/sitespeedio/onlinetest/pull/146).

## 1.6.4 - 2025-03-10
### Fixed
* Another fix for showing the script name [#145](https://github.com/sitespeedio/onlinetest/pull/145).

## 1.6.3 - 2025-03-10
### Fixed
* Show only the script name and not the full path [#144](https://github.com/sitespeedio/onlinetest/pull/144).

## 1.6.3 - 2025-02-13
### Fixed
* There was a bug that when you tried to change the URL after you edited a test with a script, you couldn't change the URL [#142](https://github.com/sitespeedio/onlinetest/pull/142).

## 1.6.2 - 2025-02-12
### Fixed
* Another label fix.

## 1.6.1 - 2025-02-12
### Fixed
* Guard against empty labels when changing labels [#141](https://github.com/sitespeedio/onlinetest/pull/141).

## 1.6.0 - 2025-02-12
### Added
* Add functionality to: edit/add alias to a finished test, rerun a test with the exact same configuration and change the URL of a test and rerun with the same configuration [#137](https://github.com/sitespeedio/onlinetest/pull/137).
* You can now configure which favicons that is used [#140](https://github.com/sitespeedio/onlinetest/pull/140).

### Fixed
* Update to latest sitespeed.io/log [#138](https://github.com/sitespeedio/onlinetest/pull/138).

## 1.5.0 - 2025-02-07
### Added
* Changed default text size to medium from large [#135](https://github.com/sitespeedio/onlinetest/pull/135) and [#136](https://github.com/sitespeedio/onlinetest/pull/136).

## 1.4.0 - 2025-02-04
### Added
* Make sure completed tests are linked to the result [#132](https://github.com/sitespeedio/onlinetest/pull/132).
* When hover the result link, show when the test was added, when it run and the connectivity [#133](https://github.com/sitespeedio/onlinetest/pull/133).

## 1.3.0 - 2025-01-30
### Added
* Add link to active test in search [#129](https://github.com/sitespeedio/onlinetest/pull/129).

## 1.2.0 - 2025-01-30
### Added
* You can now search by status. `status:completed`.  [#128](https://github.com/sitespeedio/onlinetest/pull/128).
* Add colors to failure/completes in search results [#127](https://github.com/sitespeedio/onlinetest/pull/127).

### Fixed
* Make sure failing tests with a result is accessible [#126](https://github.com/sitespeedio/onlinetest/pull/126).

## 1.1.3 - 2025-01-27
### Fixed
* Fix: failed rerun tests could get stuck in waiting state [#123](https://github.com/sitespeedio/onlinetest/pull/123).

## 1.1.2 - 2025-01-27
### Fixed
* Fix: rerun for Android picked the wrong queue [#122](https://github.com/sitespeedio/onlinetest/pull/122).

## 1.1.1 - 2025-01-26
### Fixed
* Fix click on location for search [#121](https://github.com/sitespeedio/onlinetest/pull/121).

## 1.1.0 - 2025-01-25
### Added
* You can now re-run a test using the re-run button in the search result. Also hover over the result buttons to see what you can do [#120](https://github.com/sitespeedio/onlinetest/pull/120)

### Fixed
* Use the latest version of the log package [#118](https://github.com/sitespeedio/onlinetest/pull/118).
* Better error logging [#119](https://github.com/sitespeedio/onlinetest/pull/119).
* Fix broken compare button [#120](https://github.com/sitespeedio/onlinetest/pull/120)
* Replace intel log with sitespeed.io log [#117](https://github.com/sitespeedio/onlinetest/pull/117)
* Update following dependencies: compression 1.7.5, execa 9.5.2, Pg 8.13.1, bull  4.16.5 and  helmet 8.0.0.

## 1.0.1 - 2024-12-06
### Fixed
* Fixed the release flow so the Docker containers get the correct tag.

## 1.0.0 - 2024-12-06
Hello and welcome to 1.0.0! In this release we aim to make it easier to run the full setup in Docker!

### Breaking change
With the release of 1.0.0 we makes it possible to configure sitespeed.io with the server/testrunner.yml file [#92](https://github.com/sitespeedio/onlinetest/pull/92).

That makes things so much easier when doing a default setup. However with this change we also retire the *config/sitespeed.json* configuration on the server. If you used that, you need to move that configuration to the yaml file for the server.

To start the server and a test runner locally on your machine you use docker compose:
```docker compose -f docker-compose.yml -f docker-compose.app.yml up```

If you only wants to start the dependencies:
```docker compose -f docker-compose.yml up```

When you run the dockerised version of the testrunner, the default setup use the last major version of sitespeed.io.

### Added
* A new Docker setup [#95](https://github.com/sitespeedio/onlinetest/pull/95)

## 0.4.5 - 2024-09-24
### Fixed
* Express 5.0.0 [#86](https://github.com/sitespeedio/onlinetest/pull/86).
* Update body parser [#88](https://github.com/sitespeedio/onlinetest/pull/88).
* Bull 4.16.3 [#87](https://github.com/sitespeedio/onlinetest/pull/87)

## 0.4.2 - 2024-09-09
### Fixed
* Device id was broken in the front end [#80](https://github.com/sitespeedio/onlinetest/pull/80) and [#81](https://github.com/sitespeedio/onlinetest/pull/81).
* The internal configuration was broken in the way that removing/adding testrunners failed removing correct configurations [#84](https://github.com/sitespeedio/onlinetest/pull/84). This fix also needs [#83](https://github.com/sitespeedio/onlinetest/pull/83) in the testrunners.

## 0.4.1 - 2024-08-23
### Fixed
* Fix bug so you can choose emulated mobile in GUI [#76](https://github.com/sitespeedio/onlinetest/pull/76).

## 0.4.0 - 2024-08-02
### Added
* Merged slug/label column in search result [#68](https://github.com/sitespeedio/onlinetest/pull/68)
* Make it possible to choose container that runs the test, using the API [#69](https://github.com/sitespeedio/onlinetest/pull/69/)

## 0.3.2 - 2024-07-15
### Fixed
* Upgrade to Bull 4.15.1 [#57](https://github.com/sitespeedio/onlinetest/pull/57).
* Default to max 50 finished jobs in the queue [#58](https://github.com/sitespeedio/onlinetest/pull/58).
* Update dev dependencies like ESLint 9 [#62](https://github.com/sitespeedio/onlinetest/pull/62).
* Update DayJS 1.11.11 [#63](https://github.com/sitespeedio/onlinetest/pull/63)
* Make sure all uncaught errors are caught [#64](https://github.com/sitespeedio/onlinetest/pull/64)
* Add a keydb configuration file [#56](https://github.com/sitespeedio/onlinetest/pull/56)

## 0.3.1 - 2024-06-29
### Fixed
* If the queue system is down when you add a new test, make sure the status of the test in the database is failed [#50](https://github.com/sitespeedio/onlinetest/pull/50).
* If the queue is not up when you access the start page, make sure that at least after X seconds you get a error page [#53](https://github.com/sitespeedio/onlinetest/pull/53).


## 0.3.0 - 2024-06-28
### Added
* search: Make label configurable in search result [#46](https://github.com/sitespeedio/onlinetest/pull/46).
* search: Make run date readable [#45](https://github.com/sitespeedio/onlinetest/pull/45).
* Show version number in footer and API [#44](https://github.com/sitespeedio/onlinetest/pull/44).

## 0.2.1 - 2024-06-27
### Fixed
* Search: Fix for searching for test type [#42](https://github.com/sitespeedio/onlinetest/pull/42).

## 0.2.0 - 2024-06-27
### Added
* Search: Add a clear search field button and make location and test type linkable in search result [#39](https://github.com/sitespeedio/onlinetest/pull/39).
* Search: Show 100 search result as default and make it configurable [#38](https://github.com/sitespeedio/onlinetest/pull/38).
* Search: Add last hour search button [#40](https://github.com/sitespeedio/onlinetest/pull/40)
* Search: Make it confirable to see the slug column in search result [#41](https://github.com/sitespeedio/onlinetest/pull/41)

## 0.1.0 - 2024-06-26
### Added
* Make removeOnComplete and removeOnFail in the queue configurable. If  you run a large installation with many many tests, you may want to increase the number of tests that will continue to live in the queue after the test has completed (removeOnComplete) [#36](https://github.com/sitespeedio/onlinetest/pull/36).
* Make attempts (number of tries if a test fail) configurable. By default there is one try [#37](https://github.com/sitespeedio/onlinetest/pull/37).

## 0.0.8 - 2024-06-26
### Fixed
* Update to PG 8.12.0 [#34](https://github.com/sitespeedio/onlinetest/pull/34).
* Update to Bull 4.14.0 [#32](https://github.com/sitespeedio/onlinetest/pull/32)
* Only keep 200 of latest completed job in the queue (make this configurable in the future) [#33](https://github.com/sitespeedio/onlinetest/pull/33).

## 0.0.7 - 2024-06-20
### Fixed
* Only link to the search result when we actually have a result [#26](https://github.com/sitespeedio/onlinetest/pull/26).

## 0.0.6
### Fixed
* Fix: Make sure that when passing on scripts using the API, only script and not the script name is validated [#25](https://github.com/sitespeedio/onlinetest/pull/25).

## 0.0.5
### Fixed
* Doing a search there's a lot of data passed around. With [#24](https://github.com/sitespeedio/onlinetest/pull/24) we only pass on data that is showed on the result page.

## 0.0.4
### Fixed
* Make sure URLs are kept as is in the database and when sent to the testrunner [#22](https://github.com/sitespeedio/onlinetest/pull/22). This makes sense so your test can keep running as before when you move your tesing to server/testrunner.

## 0.0.3 -  2024-06-04
### Fixed
* Updated to Pug 3.0.3 [#12](https://github.com/sitespeedio/onlinetest/pull/12).

## 0.0.2 -  2024-06-02
### Fixed
* Catch if the configured regular expression is broken [#7](https://github.com/sitespeedio/onlinetest/pull/7).
* Make sure API submited tests also uses the default sitespeed.io configuration configured on the server [#9](https://github.com/sitespeedio/onlinetest/pull/9).

## 0.0.1 - 2024-05-29

Welcome to the first release of the sitespeed.io server!

### Added
* Basic functionality.

## Old testrunner changelog

## 1.2.1 - 2025-10-31
### Fixed
* Tests running in the Docker container has the wrong path to the scripting file [#167](https://github.com/sitespeedio/onlinetest/pull/167).

## 1.2.0 - 2025-10-22
### Added
* Update to sitespeed.io 38 [#158](https://github.com/sitespeedio/onlinetest/pull/158)
* Update to NodeJS 22 [#155](https://github.com/sitespeedio/onlinetest/pull/155)
### Fixed
* Updated dependencies (too many PRs).

## 1.1.0 - 2025-02-12
### Added
* Updated to sitespeed.io 36 as default version [#134](https://github.com/sitespeedio/onlinetest/pull/134).

### Fixed
* Use latest version of sitespeed.io/logs [#138](https://github.com/sitespeedio/onlinetest/pull/138).
* Safer trap for WPR processes when running NodeJS Testrunner [#139](https://github.com/sitespeedio/onlinetest/pull/139).

## 1.0.7 - 2025-02-04
### Fixed
* Fix to make sure WPR always is killed whatever happens [#131](https://github.com/sitespeedio/onlinetest/pull/131).

## 1.0.6 - 2025-01-31
### Fixed
* Disable verbose logging from GUI [#130](https://github.com/sitespeedio/onlinetest/pull/130).

## 1.0.5 - 2025-01-30
### Fixed
* Make sure failing tests with a result is accessible [#126](https://github.com/sitespeedio/onlinetest/pull/126).

## 1.0.4 - 2025-01-25
### Fixed
* Replace Intel log with @sitespeed.io/log [#117](https://github.com/sitespeedio/onlinetest/pull/117).

## 1.0.3 - 2024-12-18
### Fixed
* Fix killing WebPageReplay correctly and correct path to WebPageReplay files [#108](https://github.com/sitespeedio/onlinetest/pull/108).

## 1.0.2 - 2024-12-18
### Fixed
* Fix broken path to the WebPageReplay script when running as npm package and fix so you also can run desktop test using WebPageReplay when you use npm [#107](https://github.com/sitespeedio/onlinetest/pull/107).

## 1.0.1 - 2024-12-06
### Fixed
* Fixed the release flow so the Docker containers get the correct tag.

## 1.0.0 - 2024-12-06
Hello and welcome to 1.0.0! In this release we aim to make it easier to run the full setup in Docker!

### Breaking change
With the release of 1.0.0 we makes it possible to configure sitespeed.io with the server/testrunner.yml file [#92](https://github.com/sitespeedio/onlinetest/pull/92).

That makes things so much easier when doing a default setup. However with this change we also retire the *config/sitespeed.json* configuration on the server. If you used that, you need to move that configuration to the yaml file for the server.

To start the server and a test runner locally on your machine you use docker compose:
```docker compose -f docker-compose.yml -f docker-compose.app.yml up```

If you only wants to start the dependencies:
```docker compose -f docker-compose.yml up```

When you run the dockerised version of the testrunner, the default setup use the last major version of sitespeed.io.

### Added
* A new Docker setup [#95](https://github.com/sitespeedio/onlinetest/pull/95)

## 0.5.6 - 2024-09-24
### Fixed
*  Bull 4.16.3 [#87](https://github.com/sitespeedio/onlinetest/pull/87)

## 0.5.3 - 2024-08-02
### Fixed
* Correctly set the hostname in the configuration file [#83](https://github.com/sitespeedio/onlinetest/pull/83).

## 0.5.2 - 2024-08-02
### Fixed
* Fix a bug setting the baseline for compare plugin [#71](https://github.com/sitespeedio/onlinetest/pull/71).

## 0.5.1 - 2024-08-02
### Fixed
* Correct version in package.json

## 0.5.0 - 2024-08-02
### Added
* When running compare plugin tests using Docker, set the baseline directory automatically [#70](https://github.com/sitespeedio/onlinetest/pull/70)
* * Make it possible to choose container that runs the test, using the API [#69](https://github.com/sitespeedio/onlinetest/pull/69/)

## 0.4.1 - 2024-07-30
### Fixed
* Log testrunner version on startup [#67](https://github.com/sitespeedio/onlinetest/pull/67).

## 0.4.0 - 2024-07-30
### Added
* Made it possible to map a baseline directory in Docker so you can run compare plugin tests [#66](https://github.com/sitespeedio/onlinetest/pull/66).

## 0.3.3 - 2024-07-30
### Fixed
* Fix for running WebPageReplay [#65](https://github.com/sitespeedio/onlinetest/pull/65).

## 0.3.2 -2024-07-15
### Fixed
* Upgrade to Bull 4.15.1 [#57](https://github.com/sitespeedio/onlinetest/pull/57).
* Default to max 50 finished jobs in the queue [#58](https://github.com/sitespeedio/onlinetest/pull/58).
* Upgrade dev dependencies: unicorn [#61](https://github.com/sitespeedio/onlinetest/pull/61), eslint [#60](https://github.com/sitespeedio/onlinetest/pull/60),
* Update joi and execa [#59](https://github.com/sitespeedio/onlinetest/pull/59).
* Make sure all uncaught errors are caught [#64](https://github.com/sitespeedio/onlinetest/pull/64)
### Added
* Version bump to sync tags.

## 0.2.1 - 2024-06-30
### Fixed
* Make sure we await adding things to the report queue [#55](https://github.com/sitespeedio/onlinetest/pull/55).
* Catch errors in all queue [#54](https://github.com/sitespeedio/onlinetest/pull/54).

## 0.2.0 - 2024-06-26
### Added
* Make removeOnComplete and removeOnFail in the queue configurable. If  you run a large installation with many many tests, you may want to increase the number of tests that will continue to live in the queue after the test has completed (removeOnComplete) [#35](https://github.com/sitespeedio/onlinetest/pull/35).

## 0.1.5 - 2024-06-26
### Fixed
* Update to Bull 4.14.0 [#32](https://github.com/sitespeedio/onlinetest/pull/32)
* Only keep 200 of latest completed job in the queue (make this configurable in the future) [#33](https://github.com/sitespeedio/onlinetest/pull/33).

## 0.1.4 - 2024-06-24
### Fixed
* Using common JS script files was broken, fixed in [#30](https://github.com/sitespeedio/onlinetest/pull/30).
* Log test id in start log.

## 0.1.3 - 2024-06-20
### Fixed
* Simplify Docker mapping inside the Docker testrunner [#27](https://github.com/sitespeedio/onlinetest/pull/27). This fixes running script files with the testrunner.
* A better cleanup in the work directory for Docker [#28](https://github.com/sitespeedio/onlinetest/pull/28).


## 0.1.2 - 2024-06-19
### Fixed
* Set --cap-add=NET_ADMIN as default for extraparameters (needed for throttling.
* Fix using an extra configuration file in Docker. Before it added an extra folder (that makes it really hard to use) [#23](https://github.com/sitespeedio/onlinetest/pull/23).

## 0.1.1 - 2024-06-18
### Fixed
* Make sure that API calls aren't passed on within the testrunner [#21](https://github.com/sitespeedio/onlinetest/pull/21).

## 0.1.0 - 2024-06-17
### Added
* Pass on extra parameters to the Docker container using `--docker.extraparameters` [#19](https://github.com/sitespeedio/onlinetest/pull/19). The parameters will be split by space and passed on to Docker between run and the name of the container.

## 0.0.1 - 2024-05-29

Welcome to the first release of the testrunner!

### Added
* Basic functionality.
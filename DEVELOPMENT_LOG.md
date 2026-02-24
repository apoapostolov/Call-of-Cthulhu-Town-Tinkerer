## 2026-02-24 - Pin OpenRouter to native DeepSeek provider

**Root cause:** OpenRouter's automatic routing sometimes selects third-party
providers (like Chutes or DeepInfra) which can have inconsistent throughput,
higher latency, or different quantization.

### Changed files

- `src/ai.ts`:
  - Added `provider` configuration to the OpenRouter fetch body.
  - Set `order: ["DeepSeek"]` and `allow_fallbacks: false` to force the use of
    DeepSeek's native inference.

### Verification

- Project built successfully.
- Server restarted and confirmed responsive on `localhost:9091`.

## 2026-02-24 - AI model changed to grok-4.1-fast for speed

Updated `AI_MODEL` constant from DeepSeek to `x-ai/grok-4-fast:free` and removed provider pinning to allow OpenRouter's automatic routing. This gave markedly lower latency during testing.

### Changed files

- `src/ai.ts` – changed AI_MODEL and provider.order value.

### Verification

- Project built successfully.
- Server restarted and confirmed responsive on `localhost:9091`.

## 2026-02-24 - Fix AI response truncation and refine batch size

**Root cause:** Large NPC batches (100+) combined with relationship data were
exceeding the ~4096 output token limit of the OpenRouter models (specifically
DeepSeek-v3.2), causing the JSON to be cut off mid-object.

### Changed files

- `src/ai.ts`:
  - Reduced `BATCH_SIZE` from 100 down to 50 to ensure the full JSON payload
    (people + relationships) fits comfortably within model output limits.
  - Updated `SYSTEM_PROMPT` to further limit secret length (≤6 words) and
    explicitly warn about truncation.
  - Enhanced `parseAIResponse` diagnostic logging to explicitly flag
    truncated responses (content not ending in `}`).
  - Added specific error message for truncation to guide users/developers.

### Verification

- Project built successfully.
- Server restarted and confirmed responsive on `localhost:9091`.

## 2026-02-24 - Update AGENTS.md with Build and Restart Protocol

Added a mandatory protocol for agents to build and restart the development
server after every response. This ensures the environment is consistently
verified against recent changes.

### Changed files

- `AGENTS.md` — Added "Build and Restart Protocol (Mandatory)" section under
  Local Development Server.
- `DEVELOPMENT_LOG.md` — This entry.

### Verification

- Project built successfully with `npm run build`.
- Server restarted and confirmed responsive on `localhost:9091`.

## 2026-02-24 - Parallel AI Batch Processing

Improved AI generation speed by processing character batches in parallel
rather than sequentially.

### Changed files

- `src/ai.ts`:
  - Added `CONCURRENCY_LIMIT` (set to 3) to process multiple batches at once.
  - Replaced the sequential `for` loop in `populateAIData` with a parallel
    worker pool using `Promise.all`.
  - Workers pull from a shared queue to ensure efficient distribution of work
    regardless of individual batch response times.
  - Updated `onProgress` to reflect total completed batches across all
    active workers.

### Build result

9 modules — 102.7 kB JS / 9.77 kB CSS (no TypeScript errors)

## 2026-02-24 - Robustify AI JSON Parsing and Reduce Batch Size

Fixed an issue where large AI responses (Batch size 200) were failing to
parse as valid JSON, likely due to truncation or subtle formatting errors
(like trailing commas).

### Changed files

- `src/ai.ts`:
  - Reduced `BATCH_SIZE` from 200 to 100 to increase reliability and prevent
    response truncation/token limit issues.
  - Updated `SYSTEM_PROMPT` to be even more emphatic about strict JSON output
    without markdown backticks.
  - Robustified `parseAIResponse` with a `clean()` helper that removes
    trailing commas (a common LLM JSON error).
  - Added a detailed console error preview of the first/last 200 characters of
    failed JSON content for easier debugging.
- `DEVELOPMENT_LOG.md` — This entry.

### Verification

- Project built successfully.
- Server restarted on port 9091.

## 2026-02-24 - Enhance AI Network Debugging and Fix Accessibility Warning

I've refined the AI network layer to identify where the population process
stalls and satisfied a browser accessibility requirement for the API key form.

### Changed files

- `src/ai.ts` — Updated `callOpenRouterWithRetry` to use `response.text()`
  followed by manual `JSON.parse` instead of `response.json()`. Added granular
  logs for:
  - "Reading response body..."
  - Bytes read from the wire.
  - Success/failure of the outer OpenRouter envelope parsing.
  - Detection of empty or malformed `choices` arrays.
- `index.html` — Added a hidden username field (`<input type="text" name="username" style="display:none">`) inside the password form to satisfy accessibility requirements and remove the `[DOM] Password forms should have username fields` warning.
- `DEVELOPMENT_LOG.md` — This entry.

### Verification

- Project built successfully.
- Server restarted on port 9091.

## 2026-02-24 - AI Debugging and Console Observability

Fixed an issue where AI data population could stall silently. Added verbose
tracing and ongoing pings to the console to help identify where the process
hangs.

### Changed files

- `src/ai.ts` — Added `console.debug`, `console.info`, `console.warn`, and
  `console.error` throughout the OpenRouter call chain. Traces now show:
  - Batch start/end and total counts.
  - Per-attempt fetch initiation and prompt length.
  - Response status codes and parsing success/failure.
  - Detailed error logs for network failures, rate limits (429), and server
    errors (5xx).
  - Explicit logging of 90s timeouts.
- `src/main.ts` — Updated the `populateAiBtn` click handler with console
  pings. The app now logs:
  - Initialization status and environment mode.
  - Progress updates (batch X/Y) with percentages.
  - Result summaries (count of people/relationships generated).
  - Cache update stats.
  - Success/Failure terminal states.

### Build result

9 modules — 102.6 kB JS / 9.77 kB CSS (no TypeScript errors)

## 2026-02-24 - Fix AI stall and API key security

**Root cause 1 (stall):** `callOpenRouterWithRetry` had no per-request timeout.
If the network hung, the `fetch` awaited indefinitely, leaving the progress
overlay stuck on "Batch N — requesting…" with no error and no cancel feedback.

**Root cause 2 (security):** The settings modal re-populated `aiKeyInput.value`
with the raw key string from localStorage, making it readable in the DOM /
DevTools inspector. The DOM `value` is accessible to any JS that runs in the
same page context.

**Root cause 3 (console warning):** The `<input type="password">` was not
wrapped in a `<form>`, triggering `[DOM] Password field is not contained in a
form`.

### Changed files

- `src/ai.ts` — `callOpenRouterWithRetry`: each attempt now creates a private
  `AbortController` with a 90-second `setTimeout`. The caller's optional
  `signal` is forwarded via an `"abort"` listener so user cancel still works
  instantly. The catch block distinguishes user cancel (`AbortError` +
  `signal.aborted`) from timeout/network error and shows a clear message
  instead of hanging. `clearTimeout` in `finally` prevents timer leaks on
  success or retry.
- `src/main.ts` — extracted `closeAiSettings()` helper that always clears
  `aiKeyInput.value` before hiding the overlay; `aiSettingsBtn` click no
  longer pre-fills the input — instead it sets a contextual placeholder
  ("Key saved — enter a new key to replace" vs "sk-or-v1-…"). Added
  `aiKeyRemoveBtn` handler that calls `localStorage.removeItem`. Cancel and
  overlay-backdrop clicks both route through `closeAiSettings()`.
- `index.html` — wrapped the password `<input>` in
  `<form autocomplete="off" onsubmit="return false;">` to silence the browser
  warning; changed `autocomplete` attribute to `new-password`; added
  "🗑️ Remove Key" button; updated description text to explain key is never
  displayed after saving.
- `src/style.css` — added `.ai-settings-actions button.btn-danger` (dark
  red background, pink text) and its `:hover` variant.

### Build result

9 modules — 102.44 kB JS / 9.77 kB CSS (no TypeScript errors)

## 2026-07-14 - Smart AI cache: growing localStorage pool with auto-fill

New feature: every successful AI run now appends its generated traits and
secrets to a persistent localStorage cache. Once the cache is large enough to
cover the current population, `doGenerate()` silently auto-fills every adult
without any API call.

**Root cause / motivation**: AI generation costs money (~$0.02/1 000 NPCs).
Each run produces unique 1920s-flavoured traits and secrets — saving them means
future runs of a similar-sized town become completely free.

### Changed files

- `src/cache.ts` _(new)_ — complete cache module:
  - `appendToCache(result)` — deduplicates and appends to three pools
    (`traits[]`, `normalSecrets[]`, `supernaturalSecrets[]`) up to a
    25 000-entry ceiling per pool; handles localStorage quota via graceful trim
  - `fillFromCache(people, seed, maxAdults)` — returns a fully populated
    `Map<id, AIPersonData>` when all pools are large enough for the current
    population, otherwise returns `null`; mirrors the exact supernatural-
    selection PRNG from `ai.ts` so the same seed always puts the same people
    in the supernatural 1 %
  - `getCacheStats()` — returns pool sizes for the status indicator
- `src/ai.ts` — exported `MAX_ADULTS`; added `supernaturalIds: Set<number>` to
  `AIResult` so `appendToCache` can route secrets to the correct sub-pool
- `src/main.ts` — added `aiDataFromCache` flag; `doGenerate()` now calls
  `fillFromCache()` before `renderCategories()` so cards show traits
  immediately on page load when cache is warm; `populateAiBtn` handler now
  calls `appendToCache(result)` and `updateCacheStatus()` after each live run;
  added `updateCacheStatus()` which renders the `#aiCacheStatus` element
- `index.html` — added `<div id="aiCacheStatus" class="ai-cache-status">` in
  the seed-control row
- `src/style.css` — added `.ai-cache-status` (muted grey) and
  `.ai-cache-status.fulfilled` (green) utility classes

### Build result

9 modules — 101.86 kB JS / 9.63 kB CSS (no TypeScript errors)

## 2026-02-24 - Initial project restructuring and documentation

- Moved Vite/TS project files from `cthulhu-town-tinkerer/` into root and removed now-empty folder
- Updated `package.json`:
  - bumped version to 1.0.0
  - modified `dev` script to run on port 9091
  - added `serve` script
- Created `AGENTS.md` with development rules, server run instructions, log/changelog/git protocol
- Expanded `README.md` with professional project overview, setup, and contribution guidelines
- Added `CHANGELOG.md` with Unreleased and 1.0.0 sections
- Initialized `DEVELOPMENT_LOG.md` with this entry
- Confirmed build still works (`npm run build`)

## 2026-02-24 - Strict UI Port

- Rewrote `index.html` to exactly match the original project's DOM structure.
- Rewrote `src/style.css` to exactly match the original project's CSS styling.
- Rewrote `src/main.ts` to exactly match the original project's vanilla DOM manipulation logic, including the category grid, pagination, modal overlays, and family tree rendering.
- Fixed TypeScript errors introduced during the manual TS port of the vanilla JS logic.
- Updated `CHANGELOG.md` to reflect the strict UI port.

## 2026-02-24 - Google Drive photo integration

- Created `src/photos.ts` — auto-generated from original source; contains 191 female and 591 male Google Drive photo IDs plus `gdUrl()` helper.
- Updated `src/main.ts`:
  - Added import of `GDRIVE_PHOTOS` and `gdUrl` from `./photos`.
  - Added `shufflePhotosWithSeed(seed)` — seeded Fisher-Yates shuffle of both pools, called at the start of every `doGenerate()` so the same seed always produces the same faces.
  - Added `getPhotoUrl(person, seed)` — deterministic per-person photo selection using `mulberry32(seed ^ (person.id * 2654435761))`.
  - Rewrote `makeAvatarHtml` to render a `<img>` with `loading="lazy"` and an emoji `onerror` fallback; falls back to placeholder when photos not yet loaded.
- CSS classes `person-avatar`, `person-avatar-large`, `person-avatar-placeholder`, `person-avatar-placeholder-large` were already present in `src/style.css`; no CSS changes needed.
- Build verified: 7 modules, 91.95 kB JS (up from 63 kB due to photo ID data).

## 2026-02-24 - Set repo description and MIT license

- Added a 300‑character description to `package.json` summarizing the project's purpose and capabilities.
- Changed `package.json` license field from ISC to MIT.
- Created `LICENSE` file with standard MIT text.

## 2026-02-24 - OpenRouter AI Data population feature

Model selected: `deepseek/deepseek-v3.2` (best writing/creative on OpenRouter, $0.64/1M tokens — ~$0.02 per 1 000 NPCs).

### New files

- `src/ai.ts` — standalone AI module:
  - `populateAIData()` — batches adults in groups of 200, capped at 5 000 adults; seeded Fisher-Yates picks 1 % for supernatural secrets.
  - `callOpenRouterWithRetry()` — handles 200 OK, 429 rate-limit back-off, 401/402 permanent failures, 5xx transient retries (max 3), `AbortSignal` cancel support.
  - `buildBatchPrompt()` — ultra-compact text format (id|name|age|job|sex|relations) minimises token spend.
  - `parseAIResponse()` — tolerates direct JSON, markdown code blocks, or loose JSON in response.
  - `relKey()` — canonical `"minId-maxId"` pair key.
- `.env.example` — documents `VITE_OPENROUTER_API_KEY` build-time override.

### Modified files

- `index.html` — added "🤖 AI Data" button and "⚙️" settings button in seed-control row; added AI settings overlay and AI progress overlay.
- `src/style.css` — AI section styles: `.btn-ai`, `.btn-ai-settings`, `.ai-settings-overlay`, `.ai-progress-overlay`, `.person-traits`, `.ai-character-section`, `.ai-traits-text`, `.ai-secret-text`, `.rel-tone`.
- `src/main.ts`:
  - Imports `populateAIData`, `relKey`, `AIPersonData` from `./ai`.
  - State: `aiData: Map<number, AIPersonData>`, `aiRels: Map<string, string>`, `aiController: AbortController`.
  - `getApiKey()` — reads localStorage then falls back to Vite env var.
  - AI settings overlay wiring (save/cancel/backdrop click).
  - Populate AI Data button: prompts for key if missing, runs batched AI call with live progress bar, stores results, supports abort via Cancel button.
  - `doGenerate()` now resets `aiData`/`aiRels` on each population regeneration.
  - `renderJobList()` — person cards show italic traits when AI data available.
  - `showPersonDetail()` — "✨ Character Notes" section (traits + 🔒 secret) rendered after header when AI data present.
  - Spouse/parent/sibling/child family member lines display a `.rel-tone` badge when AI relationship word available.
- `.gitignore` — added `.env` / `.env.*` (except `.env.example`).
- Build verified: 8 modules, 98.66 kB JS, clean TypeScript.

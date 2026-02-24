## 2026-02-24 - Settlement title word, cult system, gender glyphs in pills

### New features

Three independent features added in one batch:

#### 1 — Dynamic settlement title word (`settlementWord`)
The page title `🐙 Call of Cthulhu — 1920s **Town** Tinkerer` now reflects the
current population. As the slider moves the word updates live:
`Hamlet` (<300), `Village` (<1 000), `Town` (<5 000), `City` (<20 000),
`Capital` (<60 000), `Large City` (<200 000), `Metropolis` (<1 000 000),
`Megalopolis` (≥1 000 000).

#### 2 — Cult system (full feature)
New `src/cult.ts` module provides all generation logic, word lists, and types.

- **Button**: `⚗ Create Cult` appears in the seed-control row; disabled until the population has been generated.
- **Name generation**: three random styles using `CULT_ADJECTIVES` (75 entries), `CULT_NOUNS` (60), and `CULT_SUBJECTS` (48). No AI required.
- **Hierarchy**: 1 Hierophant 🕯️, 1–3 Archons 🗝️ (by size), ~25 % Acolytes 📜, rest Initiates 🔮. Size is seeded-random and population-capped (3 – 120 members).
- **Contact network**: each member knows the Hierophant + 1–3 lateral peers + 1–2 juniors.  Used to populate the "Contacts" list in the person modal.
- **Secret enrichment**: on cult creation `enrichCultSecrets()` adds tagged `[Cult] …` entries to each member's AI-data extra-secrets pool. Hierophant gets +1 supernatural, Archon/Acolyte get +1 normal, Initiates 50 % chance of +1 normal.
- **UI**: cults render as `.cult-card` panels above the category grid. Each rank row shows coloured pills (clickable → opens person modal). Multiple cults can be created; all reset when Generate is clicked.
- **Person modal**: members see their cult name, rank title, description, flavour text, and clickable contacts list in the character notes section.
- **Job-list cards**: cult members show a small `⚗` badge next to their name.

#### 3 — Gender glyphs in person pills
Adult pills `👨 John Smith` / `👩 Jane Doe` replaced with lighter Unicode glyphs
`♂ John Smith` / `♀ Jane Doe`. Children's gendered emoji (`👦`/`👧`) unchanged.

### Changed files

- `src/cult.ts` *(new)* — `settlementWord`, `generateCult`, `getCultMembership`, `allCultMemberIds`, all word lists, `CultRank`/`CultMember`/`Cult` types
- `src/main.ts` — imports from `cult.ts`; new state (`currentCults`, `nextCultId`, `cultSeed`); `updateTitleWord()`; `renderCults()`; `enrichCultSecrets()`; `createCultBtn` listener; gender glyphs in `renderJobList()`; cult badge and membership lookup; cult section in `showPersonDetail()`
- `index.html` — `<button id="createCultBtn">` and `<div id="cultsContainer">` added to seed-control row
- `src/style.css` — cult card/header/pill/badge/modal classes; gender-glyph colour rules

---

## 2026-02-24 - Portrait fix, emoji centering, cache post-processing

### Problem

Portraits regressed to emoji fallback after the previous session added
`crossorigin="anonymous"` to the `<img>` tag. Root cause: the attribute
switches the browser from no-cors to cors fetch mode, sending an `Origin`
header. Combined with `cache-control: private` + `vary: Origin` on
`lh3.googleusercontent.com`, browsers could fail CORS validation against a
previously cached non-CORS response, triggering the fallback path. Without the
attribute, the browser sends cookies (needed when files are shared only with a
specific Google account) and no CORS validation is required for image display.

The emoji fallback circle was also visually misaligned because the emoji has
unusual vertical metrics; adding `line-height: 1` to both placeholder classes
forces correct centering.

### Changed files

- **`src/main.ts`**
  - `makeAvatarHtml()`: removed `crossorigin="anonymous"` — lets the browser
    send cookies and avoids CORS-mode failures for Google Drive images.

- **`src/style.css`**
  - `.person-avatar-placeholder` and `.person-avatar-placeholder-large`: added
    `line-height: 1` to centre the emoji glyph vertically inside the circle/box.

### Cache post-processing

- **`PROCESSING_INSTRUCTIONS.md`** _(new)_: documents the post-processing
  workflow for AI agents tasked with curating `public/prebuilt_cache.json`
  after new batches are generated — covers normalSecrets era correction and
  supernaturalSecrets quality curation.

- **`scripts/process_cache.py`** _(new)_: reference implementation of the
  post-processing. Normalises case, deduplicates, removes weak/anachronistic
  entries, fills gaps with 243 hand-picked 1920s–1930s period secrets, and
  replaces the 158-entry redundant supernatural pool with 36 curated,
  distinctly-flavoured entries (covering Jazz-age haunting, Great-War ghosts,
  Egyptian curses, Lovecraftian deals, and period-specific objects like a
  cursed phonograph and a ghost-bound pocketwatch).

- **`public/prebuilt_cache.json`**:
  - `normalSecrets`: 233 case-duplicates removed; 10 weak/anachronistic entries
    removed; 243 replacements added → maintained at 1 000 unique entries.
  - `supernaturalSecrets`: reduced from 158 heavily-clustered entries to 36
    high-quality, distinct entries; `[!]` artefacts stripped; proper nouns
    correctly preserved.

---

## 2026-02-24 - Cache status color, comma normalization, multi-secret rules

### Changed files

- **`src/style.css`**
  - `.ai-cache-status.fulfilled`: changed color from bright `#4ade80` to muted cool grey `#a0aec0`, consistent with the dark purple theme and secondary hint text style.

- **`src/ai.ts`**
  - `AIPersonData` interface: added `extraSecrets?: string[]` for additional secrets assigned post-AI by `fillFromCache`.
  - Trait comma normalization: `.replace(/,\s*/g, ", ")` applied to every trait string coming out of the AI response, ensuring consistent spacing like `"brave, reckless, greedy"` regardless of what the model outputs.
  - `populateAIData()` supernatural selection: only adults aged 18+ are now eligible for supernatural secrets; teens (13–17) who are not "Child" job always receive a plain normal secret.

- **`src/cache.ts`**
  - `mergeCache()`: trait entries from prebuilt cache are now normalized for comma spacing on ingestion.
  - `appendToCache()`: same normalization applied when appending live AI results.
  - `fillFromCache()` supernatural selection: mirrored the age≥18 filter from `ai.ts`; uses `supEligible` instead of full `adults` array for the 1% supernatural draw.
  - `fillFromCache()` multi-secret assignment: after primary assignment, a second pass over sorted adults with a new seeded RNG (`seed ^ 0xef7a1b23`) applies:
    - Teens (< 18): no extra secrets.
    - Supernatural adults: 1% chance of gaining one extra normal secret.
    - Normal adults: 10% chance of a 2nd secret; 33% of those also gain a 3rd secret.
    - Extra secrets are drawn from the tail of the `normalSecretIndices` array (positions unused by primary assignment), so no entries are shared. If the pool is exhausted the extra is silently skipped (graceful degradation).

- **`src/main.ts`**
  - `showPersonDetail()` info-secondary block: renders `ai.extraSecrets` when present, appending each as an additional `🔒` line in the right column of the portrait info area.

---

## 2026-02-24 - Person modal: button theme, two-column info, copy btn placement

### Changed files

- **`src/style.css`**
  - `.seed-control button` / `.seed-control button:hover`: replaced bright blue (`#3498db`) with muted purple (`rgba(99,102,241,0.35/0.55)`) with a `1px solid rgba(99,102,241,0.5)` border — keeps Regenerate and Random Seed visually consistent with the purple AI buttons.
  - `.copy-btn` / `.copy-btn:hover` / `.copy-btn.copied`: replaced green (`#27ae60`) with the same muted purple scheme; `copied` state uses a muted green tint for subtle success feedback; removed `margin-top` (button is now inline at row level); reduced padding slightly to fit next to the heading.
  - `.person-detail .info`: changed to `display: flex; gap: 1.5rem; align-items: flex-start; flex: 1` to host side-by-side columns.
  - Added `.info-primary` (fixed-width left column: Age/Job/Family/Gender) and `.info-secondary` (flex right column with left border divider for Traits + Secret).
  - Added `.sheet-header` flex rule (`justify-content: space-between; align-items: center`) to place the Copy button inline right-aligned with the "📊 Cthulhu Sheet" heading.
  - Added `.sheet-header h4 { margin: 0 }` to prevent extra spacing inside the row.

- **`src/main.ts`**
  - `showPersonDetail()` `.info` block: restructured into `<div class="info-primary">` (core fields) + conditional `<div class="info-secondary">` (ai traits/secret) so they render as two left-aligned columns when AI data is present.
  - `statsHtml` template: wrapped `<h4>` and `<button class="copy-btn">` inside `<div class="sheet-header">` and moved the button before the stats text block so it appears right-aligned on the same line as the heading.

---

## 2026-02-24 - UI polish batch: profession cards, modals, cache status

### Changed files

- **`src/style.css`**
  - `.pop-input`: changed `text-align` from `right` to `center` so the population number is visually centered in the input field.
  - `.ai-cache-status`: replaced `flex-basis: 100%; padding-top: 0.4rem` with `align-self: center; margin-left: 0.5rem` so the cache status sits inline after the AI Settings button rather than wrapping to a new line.
  - `.job-name`: added `flex: 1; min-width: 0; overflow: hidden` and a new child rule `.job-name > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` so long profession names never wrap to a second line.
  - Removed `.threshold` rule entirely — the `(X+)` label is no longer rendered in HTML.
  - `.person-traits`: changed color from `#a78bfa` to `#aaa` to match `.person-relations` and `.person-connections`.
  - `.ai-character-section`: added `display: none` to hide the ✨ Character Notes frame (preserved in DOM for future reuse).
  - Added `.ai-inline-traits` and `.ai-inline-secret` utility classes (grey, italic for traits) for the new inline portrait-column display.

- **`src/main.ts`**
  - `renderCategories()`: removed `<span class="threshold">(X+)</span>` from each job card; added `title="${job.name} — found in settlements of ${displayThreshold}+ people"` tooltip attribute on the `.job` div so threshold info is accessible on hover.
  - `renderJobList()`: merged age into the name line as `name, N y.o.` (inline `<span class="person-age">`) instead of a separate block div.
  - `showPersonDetail()`: character traits and secret are now rendered inside the `.info` column next to the portrait using `.ai-inline-traits` / `.ai-inline-secret` classes in grey italic; the original `.ai-character-section` block remains in DOM but is hidden by CSS.

---

## 2026-02-24 - Translate job skill profiles to English

**Root cause:** Several jobs in the embedded data still used French skill
names (e.g. `Esquive`, `Comptabilité`, `Arts et métiers (Mécanique)`), which
blew the strict Foundry character sheet format and forced users to manually
edit the output. The original Google Sites scraper already contained a
comprehensive FR→EN map in `work/`, so the fix was to surface that mapping
and apply it during stat generation.

### Changed files

- `src/data.ts` — added `skillTranslations` export with the full translation
  table derived from the work folder.
- `src/logic.ts` — imported `skillTranslations` and translated all profile
  skill keys before rolling values; ensured generated `Stats.Skills` are in
  English.
- `src/cache.ts` / `src/main.ts` — added explicit `.ts` extensions to a few
  imports (`./logic`, `./photos`) which were causing resolution errors in
  tooling.

### Verification

- Ran a standalone `ts-node` snippet to produce a sheet for an
  `Auto Mechanic` and confirmed every skill name appeared in English.
- Rebuilt and ran the web app; manual population samples now export clean,
  English-only sheets that match the format example.

## 2026-02-24 - Strict Foundry export format

- Reworked `formatStatsForFoundry` output to exactly match the sheet layout
  used by the keeper's example, with name/age line, stat rows, explicit
  Combat section, dodge breakdown, and comma-separated skill list plus
  separate Languages line. Dropped the previous "Name:" and "Job:" prefixes
  so the text can be imported directly into Foundry VTT without manual
  editing.
- Added documentation note about the new export format.

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

## 2026-02-24 - Prebuilt AI cache and generation script

Created `scripts/generate_cache.ts`, a Node script that reuses the existing
AI module to produce a JSON file containing 1 000 000 traits and 1 000 000
secrets. The file (`prebuilt_cache.json`) is checked into the repo and is
loaded by the browser on first visit so new users instantly see AI results
without any network calls. Added `generate-cache` npm script and dev
dependencies (`ts-node`, `typescript`).

### Changed files

- `src/ai.ts` – changed AI_MODEL and provider.order value.

### Verification

- Project built successfully.
- Server restarted and confirmed responsive on `localhost:9091`.

## 2026-02-24 - Merge prebuilt cache on startup

The prebuilt cache JSON is now shipped in `public/` and gets fetched every
session. Instead of only seeding localStorage on a pristine install, the
app calls a new `mergeCache()` helper which unions the file contents with
any existing entries and respects the `MAX_POOL` ceiling. This guarantees
that a newly generated town will be populated with a trait and secret for
every adult (plus 1 % supernatural secrets) even if the AI button is
never pressed.

### Changed files

- `src/cache.ts` – added `mergeCache()` implementation and export.
- `src/main.ts` – updated `seedCacheFromFile()` to unconditionally pull and
  merge the prebuilt JSON; removed first-run check.

### Verification

- Confirmed that the public folder contains `prebuilt_cache.json`.
- Loaded app in dev server, cleared localStorage, generated town, and saw
  immediate traits/secrets without providing an API key.

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

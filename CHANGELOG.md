# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Parallel AI Batch Processing**: Character data is now generated using a parallel worker pool (concurrency: 3). This significantly reduces total generation time by processing multiple batches simultaneously.
- **Smart AI Caching**: Persistent `localStorage` pooling for traits and secrets. Once the cache contains enough unique entries for the current population size, the generator automatically "auto-fills" NPC details without requiring an API call.
- **AI Data Population**: Fully integrated OpenRouter support (`deepseek-v3.2`) to generate 1920s-appropriate character traits, dark secrets, and relationship nuances for every adult NPC.
- **Real Photo Integration**: Deterministic matching of NPCs to a pool of 700+ period-appropriate portraits using a seeded Fisher-Yates shuffle.

### Changed

- **Robust AI JSON Parsing**: Implemented a `clean()` utility that repairs common LLM syntax errors (like trailing commas) before parsing, significantly reducing batch failures.
- **Reliable AI Networking**:
  - Added 90-second per-request timeouts using `AbortController` to prevent silent hangs.
  - Reduced batch size from 100 to 50 individuals to ensure responses stay within model token limits and avoid truncation errors.
  - Pinned DeepSeek model requests to the native "DeepSeek" provider on OpenRouter to improve consistency and reduce routing latency.
  - Switched the default AI model to `x-ai/grok-4-fast:free` for much lower latency and removed manual provider restrictions to let OpenRouter auto‑route.
- **API Key Security**:
  - API keys are no longer pre-filled in the settings DOM.
  - Added a "🗑️ Remove Key" feature to clear local storage.
  - Passwords fields now use correct ARIA attributes and hidden username fields to satisfy browser accessibility requirements.
- **Improved Observability**: Added granular console tracing for all AI and application state changes to simplify remote debugging.

### Fixed

- Fixed a silent stalling issue where hanging network requests would block the AI generation progress indefinitely.
- Corrected various TypeScript type errors following the port from vanilla JavaScript.
- Standardized file structure and moved all build artifacts out of the source tree.

## [1.0.0] - 2026-02-24

### Added

- Initial codebase ported from original JavaScript town generator. Includes full population, job, and stats logic with English-only data.
- UI recreated with dark glassmorphism theme and responsive layout, strictly matching the original project's design.
- Development documentation (`AGENTS.md`, `DEVELOPMENT_LOG.md`) and professional README added.
- Vite/TypeScript build system with npm scripts for development and production.
- Added license and repository metadata.

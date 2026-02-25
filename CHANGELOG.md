# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- Reverted `src/map.ts` to the last committed square-layout map generator for stability and consistency, while keeping non-map processing/documentation work and UI shell styling updates.

## [1.0.0] - 2026-02-24

### Added

- **Full procedural town generator**: populate, jobs, stats, and relationships in a
  1920s Call of Cthulhu setting, all deterministic from a seed.
- **AI‑driven character enrichment**: optional OpenRouter integration to generate
  period‑appropriate traits, secrets, and relationship tones for every adult
  NPC; includes a smart local cache and a prebuilt JSON file so the feature
  works offline.
- **Real photos**: assign each NPC a realistic 1920s portrait from a 700+ image
  archive using a seeded shuffle.
- **Secret cult system**: create rare occult cults with procedurally generated
  names, hierarchies, contacts, and flavour text. Cult membership grants
  extra secrets and is reflected on the front page and in the character
  modal. Cult-related word lists auto‑expand at runtime and motivations now
  number 100 unique, engaging entries.
- **Dynamic page title**: the main heading changes from Hamlet → Village → Town
  → City → … as population increases.
- **Accessibility & UX polish**: gender glyphs for people, secret fallbacks when
  cache is empty, pentagram icons for cults, movable UI elements (cult button
  before AI Data), and many small touchups.

### Changed

- Export format for characters matches the keeper's example exactly, easing
  import into tools like Foundry VTT.
- Numerous under‑the‑hood improvements to AI networking, parsing, and caching
  for reliability and performance.
- Added comprehensive console logging for easier debugging.

_(Fixes and other minor technical adjustments were performed during
development but are not included in this release note.)_

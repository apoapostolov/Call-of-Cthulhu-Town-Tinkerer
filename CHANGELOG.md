# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added a batch-safe cache curation script that migrates high-quality traits and secrets from `prebuilt_cache.json` into internal TypeScript databanks, removing runtime dependence on external JSON for those banks.

### Changed

- Reverted `src/map.ts` to the last committed square-layout map generator for stability and consistency, while keeping non-map processing/documentation work and UI shell styling updates.
- Expanded industrial and social facility databanks to large 1920s procedural sets (thousands of worker-destination names) with period-appropriate operators, facility cores, and modifiers.
- Town map generation now follows center-out urban morphology: high-value commercial/civic cores, outer residential spread, and corner-biased industrial/poor belts, with irregular polygon districts and angular street geometry instead of strict orthogonal cell filling.
- Fixed map generation order so parcel creation truly progresses from urban center outward, and removed unintended diagonal collector overlays that visually cut across districts.
- Replaced near-circular growth bias with branch-front settlement expansion so towns spread in organic, mold-like arms from the core rather than filling as concentric rings.
- Building rendering now separates transparent parcel zones from smaller inset rectangular structures aligned to local road angle, increasing visual spacing and avoiding large touching polygon-like building masses.

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

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- No user-visible changes yet.

## [1.1.0] - 2026-02-25

### Added

- **Abstract City Map**: Introduced a procedurally generated city map with realistic district layouts, building types, and socioeconomic simulations. Each district features unique residential and worker distributions, reflecting 1920s urban planning.
- **Socioeconomic Simulation**: Implemented dynamic assignment of social classes, work addresses, and home addresses for the town population. The simulation ensures historical accuracy and balance across different settlement scales.
- **Real-Time Search**: Added an interactive search feature to locate and highlight any resident on the town map. Includes real-time name matching, hover effects, and persistent map pins for selected individuals.

### Changed

- Tons of minor changes and polish

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

- Initial Release

_(Fixes and other minor technical adjustments were performed during
development but are not included in this release note.)_

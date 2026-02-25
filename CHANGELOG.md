# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- No user-visible changes yet.

## [1.1.0] - 2026-02-25

### Added

- Added a batch-safe cache curation script that migrates high-quality traits and secrets from `prebuilt_cache.json` into internal TypeScript databanks, removing runtime dependence on external JSON for those banks.
- Added an interactive resident search above the map with real-time name matching, a scrollable themed dropdown, and hover/select integration for map-location highlighting.
- Added `scripts/class_distribution_report.ts`, a seeded benchmark utility that prints building-class distributions across hamlet/town/city/metropolis scenarios for balancing passes.

### Changed

- Added muted Google Maps-style person pins on the map: hover in search shows temporary residential/work pointers (red/green), and click sets persistent pointers until the search is cleared or a different resident is selected/hovered.
- Moved resident search into the left map column above the canvas, made search selection populate the input with the chosen full name, shifted pin tips to land roughly 40% into buildings with slight horizontal offset, and increased red/green pin contrast.
- Reworked parcel social-class assignment to use scale-specific 1920s US wealth-band targets (quantile mapping), yielding more historically plausible class spreads from villages to metropolis while preserving district/building influences.
- Tuned Credit Rating-based occupant overrides so resident wealth can still uplift parcels, but only under stronger conditions that avoid unrealistic upper-class inflation.
- Reverted `src/map.ts` to the last committed square-layout map generator for stability and consistency, while keeping non-map processing/documentation work and UI shell styling updates.
- Expanded industrial and social facility databanks to large 1920s procedural sets (thousands of worker-destination names) with period-appropriate operators, facility cores, and modifiers.
- Town map generation now follows center-out urban morphology: high-value commercial/civic cores, outer residential spread, and corner-biased industrial/poor belts, with irregular polygon districts and angular street geometry instead of strict orthogonal cell filling.
- Fixed map generation order so parcel creation truly progresses from urban center outward, and removed unintended diagonal collector overlays that visually cut across districts.
- Replaced near-circular growth bias with branch-front settlement expansion so towns spread in organic, mold-like arms from the core rather than filling as concentric rings.
- Building rendering now separates transparent parcel zones from smaller inset rectangular structures aligned to local road angle, increasing visual spacing and avoiding large touching polygon-like building masses.
- Parcel-zone overlays are now effectively invisible by default, inner building footprints are enlarged by about 20%, and economic zoning pressure is stronger (core commercial/civic jobs, outer residential, corner industrial/poor-adjacent clustering).
- Parcel Inspector now includes a 1920s building descriptor per parcel type, a computed social-class label (Luxury→Slums) based on building function and occupants, type-specific building color updates (Civic/Commercial/Residential/Social/Industrial), and it suppresses empty Residents/Workers sections entirely.
- Fixed road naming so streets no longer collapse to a single repeated name, moved `Class` into the main Parcel Inspector meta row with bold label, and expanded district/street name generation variety by more than 3x via combinatorial name banks.
- Expanded city naming enums again to 3x-scale sets (district prefixes/cores and street naming affix/type pools) and replaced the class model with urban-value scoring (building type + center/ring + affluent/industrial proximity), where occupant credit only strongly upgrades class when materially above the parcel baseline.
- Tuned class realism by settlement scale: hamlets/towns are capped at Affluent, Luxury requires strict eligibility in large cities (center + affluent adjacency + low industrial pressure), and City/Metropolis now form stronger poor belts near industrial zones and outer fringe.
- Reworked class override logic around Call of Cthulhu-style Credit Rating bands so resident wealth can upgrade parcel class only when significantly above the parcel baseline, preserving realistic built-environment constraints while allowing rare high-credit uplift events.
- Fixed naming randomness regressions by adding seeded offset/stride selection for district and street names per generated map, and added Residential/Work parcel addresses to the Character Modal info column.
- Fixed occupancy realism: every villager now receives a residential address, workforce assignment follows 1920s-style participation rules (married women usually non-working unless in selected professions), and only a scale-appropriate unemployment/joblessness share remains without work addresses.
- Added a settlement-name generator for Hamlet→Metropolis using 1–3 element names from large American/Lovecraftian-style non-canonical banks (100+ options per element bank), and replaced the map header label with the generated town name.
- Removed explicit Lovecraft place-name elements from district/settlement naming pools and changed the map frame from red dotted styling to grey dotted styling.

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

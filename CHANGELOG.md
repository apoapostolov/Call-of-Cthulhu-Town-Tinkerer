# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added 1920s household telephone support with Credit Rating-gated access, unique local exchange numbers, and character profile display when a resident has a registered line.
- Added building work-line telephones: every commercial parcel now gets a unique phone number, and any staffed parcel receives a unique work line so workers can have a listed workplace number.
- Added a town-header `Phonebook` entry point that opens a 1920s-styled directory modal listing residents and businesses with name, address, and phone number.

### Changed

- Increased the population slider ceiling from 10,000 to 50,000 while keeping direct slider-to-population mapping for responsive map regeneration.
- Rebalanced mixed/commercial parcel supply with a new center-weighted economic pass so settlements maintain stronger work-lot presence and capacity near core districts.
- Re-tuned 1920s land-use realism in villages/towns by reducing mixed-use prevalence, concentrating mixed parcels closer to the core/main-street area, and increasing separate residential/commercial representation.
- Updated Character Profile to show a resident's work telephone when available.
- Updated resident live-search dropdown to include each resident phone number in a dedicated mid-grey column.
- Added phonebook pagination and instant name filtering within the modal so large settlements remain navigable.
- Expanded name generation banks to 1,000 male first names, 1,000 female first names, and 1,000 surnames using US historical datasets for significantly higher resident-name variety.

## [1.1.0] - 2026-02-25

### Added

- **Abstract City Map**: Introduced a procedurally generated city map with realistic district layouts, building types, and socioeconomic simulations. Each district features unique residential and worker distributions, reflecting 1920s urban planning.
- **Socioeconomic Simulation**: Implemented dynamic assignment of social classes, work addresses, and home addresses for the town population. The simulation ensures historical accuracy and balance across different settlement scales.
- **Real-Time Search**: Added an interactive search feature to locate and highlight any resident on the town map. Includes real-time name matching, hover effects, and persistent map pins for selected individuals.

### Changed

- Tons of minor changes and polish
- Road hierarchy now promotes arterials by actual parcel demand (residents/workers near each road) instead of fixed border/axis rules, and border roads are excluded from arterial promotion.
- Refined arterial selection again to use distance-limited occupied-frontage scoring with minimum demand/parcel thresholds and stronger edge-band exclusion, preventing empty/peripheral roads from being promoted in large settlements.
- Added an interior fallback for arterial promotion with center-bias scoring, ensuring settlements still get central cross-cutting arterials when strict demand thresholds are sparse.
- Reverted arterial quantity behavior to the denser classic grid-tier pattern and now only suppresses edge-border arterials by downgrading near-edge or outermost candidates.
- Fixed a regression where edge suppression could remove all arterials by treating endpoint touches as edge hits; edge checks now use road-axis position so interior roads remain arterial in towns/cities.
- Added road-tail trimming for empty outskirts: when interior edge-side intersections border four empty blocks, roads no longer extend further through adjacent zero-building regions.
- Optimized road-rejection and arterial-edge checks by replacing per-road geometry scans with axis/index-based math and cached empty-intersection masks, reducing overhead on larger settlements.
- Population slider now directly ranges from 1,000 to 10,000 for normal operation, while the numeric population field continues to allow larger custom values.
- Map generation now scales road and parcel density within each settlement tier using population interpolation, so slider changes between 1,000 and 10,000 visibly affect map structure instead of only crossing tier boundaries.
- Increased population scaling strength so larger settlements now produce meaningfully larger map extents and denser road/parcel capacity, improving visual and housing-capacity separation between 1,000 and 10,000 populations.
- Rebalanced residence allocation: housing now strongly prioritizes residential buildings, mixed-use second, and only limited non-industrial commercial lodging (usually one household, occasionally two), with automatic residential-stock conversion when capacity is insufficient.

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

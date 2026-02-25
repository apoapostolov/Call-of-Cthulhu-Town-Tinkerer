# TODO

## P0 - Address Generator Core (Seeded and Deterministic)
- [ ] Add `Address` and `Building` domain models (street, number, district, buildingType, occupancy, workplaceOccupancy, qualityTier).
- [ ] Build a seeded street-network generator that outputs named streets and numbered parcels.
- [ ] Assign every generated person to at least one address role: `lives_at`, `works_at`, or both.
- [ ] Add an address panel in UI with filters for `Living`, `Working`, `Both`, `District`, and `Building type`.
- [ ] Ensure same seed + same population always reproduces identical addresses and building assignments.

## P0 - Household and Family Realism
- [ ] Add household composition rules (single adult, nuclear, multi-generation, boarding house, shared labor housing).
- [ ] Implement extended-family proximity logic with configurable ratios for same-household, same-street, and same-district placement.
- [ ] Add surname-cluster heuristics so related families tend to appear in plausible proximity without forcing duplicates.
- [ ] Add tenancy ownership split (owner-occupied vs rented rooms) with era-appropriate ratios by wealth tier.
- [ ] Add life-stage housing transitions (young workers in boarding houses, widowed elders with relatives, etc.).

## P0 - Socioeconomic District Model
- [ ] Generate district archetypes (`Poor`, `Working`, `Middle`, `Affluent`, `Industrial`, `Commercial`, `Civic`) from settlement size.
- [ ] Add district-level metrics: rent pressure, crowding, sanitation, policing intensity, and crime baseline.
- [ ] Derive a per-person wealth descriptor from status score + profession + district conditions.
- [ ] Add support for mixed-status edge zones (not all streets in a district share equal quality).
- [ ] Introduce migration pressure so rapid-growth towns produce overcrowded low-income blocks.

## P1 - Employment Capacity and Joblessness
- [ ] Add settlement-size capacity limits for each profession and business class.
- [ ] Mark oversupply workers as `Jobless` while preserving trained profession history.
- [ ] Track underemployment states (`Part-time`, `Seasonal`, `Laid-off`, `Day labor`) for richer hooks.
- [ ] Link district unemployment to crime-ratio adjustments and household stress indicators.
- [ ] Expose a "why jobless" explanation in UI (capacity exceeded, seasonal collapse, business closure, injury).

## P1 - Commercial and Craft Distribution
- [ ] Add business parcel allocation rules by settlement scale (village/town/city/metropolis bands).
- [ ] Place craft, trade, and service workplaces near plausible demand clusters.
- [ ] Add street-level frontage logic so commercial premises favor main roads and intersections.
- [ ] Support live-work buildings for artisans and family shops.
- [ ] Add economic dependency chains (bakery depends on mill routes, docks influence warehouse density, etc.).

## P1 - Address Semantics and Naming Quality
- [ ] Add era-appropriate street naming sets (founders, trades, landmarks, religious/civic references).
- [ ] Add neighborhood alias system (official name vs colloquial keeper-facing nickname).
- [ ] Add civic numbering irregularities for old districts (missing lots, split lots, renamed lanes).
- [ ] Generate descriptive location tags for map-less play ("behind foundry", "above apothecary", "near rail yard").
- [ ] Add locale style presets (US/UK/continental naming/numbering flavor) while keeping deterministic seeds.

## P1 - Keeper Gameplay Hooks from Address Data
- [ ] Build "hotspot synthesis" that flags blocks with high tension (poverty + crime + cult contact density).
- [ ] Add district rumor tables derived from unemployment, wealth gap, and business closures.
- [ ] Add witness-accessibility scoring (how easy it is to find someone at home/work by time of day).
- [ ] Add social mobility events (promotion, eviction, inheritance, bankruptcy) for living-town evolution.
- [ ] Add default "session delta" simulation to advance households between game sessions.

## P0 - Vector Map Research and Spike
- [ ] Evaluate rendering stacks (`SVG + D3`, `Canvas + vector model`, `PixiJS`, `Paper.js`) against deterministic layout needs.
- [ ] Create a minimal spike that renders districts, streets, parcels, and building boxes from the same seed used by generation.
- [ ] Define canonical coordinate system so addresses, people, and businesses resolve to stable map positions.
- [ ] Validate hover interaction: building tooltip lists residents/workers with quick links to character modal.
- [ ] Benchmark map render times at 1k, 5k, 20k populations and set target budgets.

## P1 - Procedural Urban Layout Rules for Vector Map
- [ ] Implement road hierarchy generator (arterial, collector, local) based on settlement size and district type.
- [ ] Add parcel subdivision rules by district archetype (small dense lots vs large affluent parcels).
- [ ] Add block-level constraints for civic anchors (church, hall, station, market, docks, mills).
- [ ] Add optional natural features layer (river/coast/hills) that influences street growth and value gradients.
- [ ] Keep all spatial decisions seed-deterministic and serializable for save/load.

## P1 - Map Interaction and Usability
- [ ] Add hover cards with `lives/works/both` counts plus named residents and occupations.
- [ ] Add clickable building drill-down that opens filtered people list and family graph.
- [ ] Add map filters for wealth tier, crime pressure, cult activity, occupation class, and vacancy/joblessness.
- [ ] Add zoom-level rules for label density to prevent clutter in large settlements.
- [ ] Add export options (SVG snapshot + JSON world state) for VTT handouts and campaign continuity.

## P2 - Data Quality, Testing, and Tooling
- [ ] Add property-based tests for deterministic generation invariants across seeds.
- [ ] Add statistical validation tests for family ratios, district composition, and unemployment distribution.
- [ ] Create keeper-facing scenario fixtures (hamlet, town, city, metropolis) for regression snapshots.
- [ ] Add debug overlay for generator internals (district scores, capacity stress, parcel occupancy).
- [ ] Add migration path for save-file compatibility when address/map schemas evolve.

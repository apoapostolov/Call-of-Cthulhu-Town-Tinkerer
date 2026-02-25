# SIM_TOWN_RULES.md

Procedural generation rules for the Living Town simulator (1920s Call of Cthulhu context).

## 1. Core Principles

- Deterministic: same seed + population yields the same town.
- Era fidelity: town layout and industries are grounded in 1920s North American patterns.
- Usability over perfect realism: enough plausibility for sandbox play and investigation hooks.

## 2. Settlement Scale Bands

- `Hamlet` < 2,000
- `Town` 2,000–19,999
- `City` 20,000–199,999
- `Metropolis` >= 200,000

Scale controls:
- map dimensions
- road count/density
- parcel count
- prevalence of industrial/commercial zones

## 3. Terrain Rolls

A settlement rolls one terrain class:
- `none`
- `river`
- `coast`

Target heuristic (US-like distribution):
- Most settlements have no major water edge.
- River settlements are common.
- Coastal settlements are less common than inland.

### Water occupancy exclusion rules

Blocks/lots are measured for estimated water coverage.

- Coastline rule: if block/lot is >10% water, do not place buildings.
- River rule: if block/lot is >40% water, do not place buildings.

This applies before parcel assignment and again at lot level.

## 4. Road System

Roads are generated from logical axes and then warped into natural curves.

Road classes:
- `local` (thin)
- `collector` (medium)
- `arterial` (thick)

Arterials are significantly thicker and carry labels at lower zoom levels.
Collectors and locals reveal labels progressively at higher zoom.

### Commercial Street

One arterial is designated as the commercial corridor.
Parcels near this corridor are biased toward larger commercial footprints.

## 5. Parcel Geometry

Parcels are polygonal, not strict rectangles:
- edge-based lot segmentation
- merged-lot chance for larger buildings
- corner jitter + optional extra vertex
- geometric warp for non-grid visual realism

Commercial and industrial parcels can become larger than residential lots.

## 6. Zoning and Civic Spaces

Each block is evaluated for socio-planning use:

- Residential default in most neighborhoods
- Commercial bias near the commercial street and market wards
- Industrial belt near map edges for `Town+` scales (factories out of core)
- Civic uses distributed around centers and key wards
- Parks and plazas generated as dedicated polygon parcels

### Park and Plaza rules

- `Plaza`: rare central civic open space
- `Park`: low-probability open space mostly in central urban rings

These reserve land and suppress regular building placement.

## 7. 1920s Industry Anchors

Industrial outcomes prioritize era-appropriate sectors:
- textile mills
- foundries
- rail yards and depots
- canneries and packing plants
- docks/warehouse handling
- tanneries and printing works

Large industrial parcels cluster toward edge belts and transport-adjacent areas.

## 8. District Layer

Neighborhood/district names are generated from fixed period-flavored pools.
Districts influence baseline biases for:
- residential/commercial/industrial mix
- civic intensity
- visual tint and map legend grouping

## 9. Interaction Rules

- Hover updates inspector when no parcel is selected.
- Click pins a parcel.
- While pinned, hover does not mutate inspector.
- Click same parcel or empty map to unpin.

## 10. Validation Targets

- Deterministic output for same seed.
- No buildings placed on excluded water thresholds.
- Arterials visibly dominant over collectors/locals.
- Commercial corridor present and identifiable.
- Parks/plazas and edge-industry behavior observable on `Town+` scales.

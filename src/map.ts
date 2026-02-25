import type { Person } from "./logic.ts";
import { STREET_NAME_BANK } from "./databanks.ts";
import { mulberry32 } from "./logic.ts";

type SettlementScale = "Hamlet" | "Town" | "City" | "Metropolis";
type DistrictKind =
  | "Old Quarter"
  | "Market Ward"
  | "Factory Belt"
  | "Harbor Side"
  | "Civic Hill"
  | "Garden Ward";
type BuildingKind =
  | "Residential"
  | "Commercial"
  | "Industrial"
  | "Civic"
  | "Mixed";
type RoadTier = "local" | "collector" | "arterial";
type TerrainKind = "none" | "river" | "coast";
type CoastSide = "north" | "south" | "east" | "west";

interface Point {
  x: number;
  y: number;
}

interface District {
  id: number;
  name: string;
  kind: DistrictKind;
  hue: string;
  center: Point;
  points: Point[];
}

interface Road {
  id: number;
  name: string;
  path: string;
  tier: RoadTier;
}

interface WaterFeature {
  kind: TerrainKind;
  path: string;
  label: string;
  labelX?: number;
  labelY?: number;
}

interface Building {
  id: number;
  districtId: number;
  districtName: string;
  kind: BuildingKind;
  descriptor: string;
  points: Point[];
  structurePoints: Point[];
  address: string;
  residents: number[];
  workers: number[];
}

interface MapModel {
  scale: SettlementScale;
  width: number;
  height: number;
  districts: District[];
  roads: Road[];
  buildings: Building[];
  water: WaterFeature[];
}

interface ScaleConfig {
  width: number;
  height: number;
  verticalRoads: number;
  horizontalRoads: number;
  maxBuildings: number;
}

interface RenderParams {
  svgEl: SVGSVGElement;
  legendEl: HTMLElement;
  statsEl: HTMLElement;
  hoverEl: HTMLElement;
  scaleEl: HTMLElement;
  population: number;
  seed: number;
  people: Person[];
  getPersonName: (p: Person) => string;
  onPersonClick: (personId: number) => void;
}

interface CameraState {
  zoom: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

const cameraBySvg = new WeakMap<SVGSVGElement, CameraState>();

const DISTRICT_NAME_PREFIXES = [
  "North",
  "South",
  "East",
  "West",
  "Upper",
  "Lower",
  "Old",
  "New",
  "Grand",
  "Harbor",
  "River",
  "Market",
  "Foundry",
  "Miskatonic",
  "Lantern",
  "Union",
];

const DISTRICT_NAME_CORES = [
  "Terrace",
  "Yard",
  "Hill",
  "Row",
  "Green",
  "End",
  "Quarter",
  "Rise",
  "Heights",
  "Common",
  "District",
  "Ward",
];

function buildDistrictNameBank(): string[] {
  const out: string[] = [];
  for (const p of DISTRICT_NAME_PREFIXES) {
    for (const c of DISTRICT_NAME_CORES) out.push(`${p} ${c}`);
  }
  return out;
}

const neighborhoodNames = buildDistrictNameBank();

const districtHue: Record<DistrictKind, string> = {
  "Old Quarter": "#d3cab5",
  "Market Ward": "#cec3ab",
  "Factory Belt": "#c1b59d",
  "Harbor Side": "#c6c9b9",
  "Civic Hill": "#d9cfb9",
  "Garden Ward": "#cad0b8",
};

const DESCRIPTOR_ADJECTIVES_1920 = [
  "Gaslight",
  "Telegraph",
  "Railway",
  "Steam",
  "Brick",
  "Granite",
  "Mercantile",
  "Union",
  "Dockside",
  "Trolley",
  "Boiler",
  "Lantern",
];

const RESIDENTIAL_NOUNS_1920 = [
  "Tenement",
  "Townhouse",
  "Boardinghouse",
  "Row House",
  "Courtyard Home",
  "Walk-Up",
  "Brownstone",
  "Family House",
  "Apartment House",
  "Lodging House",
];

const COMMERCIAL_NOUNS_1920 = [
  "Mercantile",
  "Emporium",
  "Dry Goods Hall",
  "Trading House",
  "Arcade",
  "Market House",
  "Counting House",
  "Shopfront Block",
  "Brokerage House",
  "Warehouse Store",
];

const INDUSTRIAL_NOUNS_1920 = [
  "Foundry Hall",
  "Machine Works",
  "Freight Shed",
  "Assembly House",
  "Textile Works",
  "Boiler Yard",
  "Packing House",
  "Rail Depot",
  "Coal Works",
  "Mill Annex",
];

const CIVIC_NOUNS_1920 = [
  "Municipal Hall",
  "Civic House",
  "Parish Annex",
  "Court Office",
  "Public Registry",
  "Relief Office",
  "Library Wing",
  "Ward Hall",
  "Clerk House",
  "State Annex",
];

const SOCIAL_NOUNS_1920 = [
  "Club Hall",
  "Lodge House",
  "Assembly Rooms",
  "Temperance Hall",
  "Social Institute",
  "People's Hall",
  "Union Rooms",
  "Music Rooms",
  "Lecture Hall",
  "Society House",
];

const STATUS_LABELS = [
  "Slums",
  "Poor",
  "Working Class",
  "Modest",
  "Middle Class",
  "Respectable",
  "Affluent",
  "Luxury",
];

function normalizeStreetRoot(name: string): string {
  return name
    .replace(
      /\s+(Street|Avenue|Road|Lane|Terrace|Way|Court|Place|Row|Parade|Drive|Walk|Square|Hill|Passage)$/i,
      "",
    )
    .trim();
}

function buildStreetRootBank(): string[] {
  const baseRoots: string[] = [];
  const seenBase = new Set<string>();
  for (const name of STREET_NAME_BANK) {
    const root = normalizeStreetRoot(name);
    if (!root || seenBase.has(root)) continue;
    seenBase.add(root);
    baseRoots.push(root);
  }

  const variants: string[] = [];
  const seen = new Set<string>();
  const affixes = ["Old", "New", "North", "South", "East", "West", "Upper", "Lower"];

  const add = (value: string) => {
    const v = value.trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    variants.push(v);
  };

  for (const root of baseRoots) add(root);
  for (const root of baseRoots) {
    for (const a of affixes) {
      add(`${a} ${root}`);
      add(`${root} ${a}`);
    }
  }
  return variants;
}

const STREET_ROOT_BANK = buildStreetRootBank();

function settlementScale(population: number): SettlementScale {
  if (population < 2_000) return "Hamlet";
  if (population < 20_000) return "Town";
  if (population < 200_000) return "City";
  return "Metropolis";
}

function scaleConfig(scale: SettlementScale): ScaleConfig {
  switch (scale) {
    case "Hamlet":
      return {
        width: 1000,
        height: 680,
        verticalRoads: 9,
        horizontalRoads: 7,
        maxBuildings: 220,
      };
    case "Town":
      return {
        width: 1320,
        height: 900,
        verticalRoads: 13,
        horizontalRoads: 10,
        maxBuildings: 520,
      };
    case "City":
      return {
        width: 1760,
        height: 1160,
        verticalRoads: 18,
        horizontalRoads: 14,
        maxBuildings: 1080,
      };
    case "Metropolis":
      return {
        width: 2360,
        height: 1520,
        verticalRoads: 26,
        horizontalRoads: 20,
        maxBuildings: 2300,
      };
    default:
      return {
        width: 1320,
        height: 900,
        verticalRoads: 13,
        horizontalRoads: 10,
        maxBuildings: 520,
      };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pickIds(rng: () => number, people: Person[], count: number): number[] {
  if (people.length === 0 || count <= 0) return [];
  const set = new Set<number>();
  const target = Math.min(count, people.length);
  while (set.size < target) {
    const idx = Math.floor(rng() * people.length);
    set.add(people[idx].id);
  }
  return Array.from(set);
}

function buildDescriptorBank(nouns: string[]): string[] {
  const out: string[] = [];
  for (const adj of DESCRIPTOR_ADJECTIVES_1920) {
    for (const noun of nouns) out.push(`${adj} ${noun}`);
  }
  return out;
}

const BUILDING_DESCRIPTOR_BANKS: Record<BuildingKind, string[]> = {
  Residential: buildDescriptorBank(RESIDENTIAL_NOUNS_1920),
  Commercial: buildDescriptorBank(COMMERCIAL_NOUNS_1920),
  Industrial: buildDescriptorBank(INDUSTRIAL_NOUNS_1920),
  Civic: buildDescriptorBank(CIVIC_NOUNS_1920),
  Mixed: buildDescriptorBank(SOCIAL_NOUNS_1920),
};

function pickDescriptor(kind: BuildingKind, rng: () => number): string {
  const bank = BUILDING_DESCRIPTOR_BANKS[kind];
  return bank[Math.floor(rng() * bank.length)];
}

function personStatusScore(person: Person): number {
  const job = (person.job ?? "").toLowerCase();
  let score = 44;
  if (!job || job === "no profession") score -= 24;
  if (job.includes("child") || job.includes("student")) score -= 9;
  if (
    job.includes("doctor") ||
    job.includes("professor") ||
    job.includes("lawyer") ||
    job.includes("bank") ||
    job.includes("judge") ||
    job.includes("owner")
  ) {
    score += 24;
  }
  if (
    job.includes("manager") ||
    job.includes("editor") ||
    job.includes("merchant") ||
    job.includes("accountant") ||
    job.includes("architect")
  ) {
    score += 15;
  }
  if (
    job.includes("clerk") ||
    job.includes("teacher") ||
    job.includes("nurse") ||
    job.includes("police") ||
    job.includes("post")
  ) {
    score += 7;
  }
  if (
    job.includes("labor") ||
    job.includes("dock") ||
    job.includes("factory") ||
    job.includes("miner") ||
    job.includes("laundry") ||
    job.includes("porter")
  ) {
    score -= 10;
  }
  if (job.includes("unemployed") || job.includes("beggar")) score -= 18;
  if (person.age >= 55) score += 2;
  return clamp(score, 0, 100);
}

function statusLabelFromScore(score: number): string {
  if (score < 16) return STATUS_LABELS[0];
  if (score < 28) return STATUS_LABELS[1];
  if (score < 40) return STATUS_LABELS[2];
  if (score < 52) return STATUS_LABELS[3];
  if (score < 64) return STATUS_LABELS[4];
  if (score < 76) return STATUS_LABELS[5];
  if (score < 88) return STATUS_LABELS[6];
  return STATUS_LABELS[7];
}

function parcelSocialClass(
  building: Building,
  peopleById: Map<number, Person>,
): string {
  const peopleScores = [...building.residents, ...building.workers]
    .map((id) => peopleById.get(id))
    .filter((p): p is Person => Boolean(p))
    .map(personStatusScore);
  const avgPeople = peopleScores.length
    ? peopleScores.reduce((a, b) => a + b, 0) / peopleScores.length
    : 44;

  let baseByKind = 46;
  if (building.kind === "Commercial") baseByKind = 58;
  else if (building.kind === "Civic") baseByKind = 55;
  else if (building.kind === "Residential") baseByKind = 42;
  else if (building.kind === "Industrial") baseByKind = 30;
  else if (building.kind === "Mixed") baseByKind = 50;

  const workersPressure = building.workers.length > building.residents.length * 2 ? -4 : 0;
  const residentsLift = building.residents.length >= 4 ? 3 : 0;
  const score = clamp(baseByKind * 0.45 + avgPeople * 0.55 + workersPressure + residentsLift, 0, 100);
  return statusLabelFromScore(score);
}

function districtByPoint(
  x: number,
  y: number,
  districts: District[],
): District | undefined {
  let best: District | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const district of districts) {
    const dx = x - district.center.x;
    const dy = y - district.center.y;
    const centerDist = Math.hypot(dx, dy);
    const boundaryDist = Math.max(1, averageRadius(district.points, district.center));
    const score = centerDist / boundaryDist;
    if (score < bestScore) {
      bestScore = score;
      best = district;
    }
  }
  return best;
}

function randomBuildingKind(
  rng: () => number,
  districtKind: DistrictKind,
): BuildingKind {
  const roll = rng();
  if (districtKind === "Factory Belt") {
    if (roll < 0.62) return "Industrial";
    if (roll < 0.84) return "Mixed";
    if (roll < 0.95) return "Commercial";
    return "Residential";
  }
  if (districtKind === "Market Ward") {
    if (roll < 0.52) return "Commercial";
    if (roll < 0.78) return "Mixed";
    if (roll < 0.93) return "Residential";
    return "Civic";
  }
  if (districtKind === "Civic Hill") {
    if (roll < 0.4) return "Civic";
    if (roll < 0.7) return "Commercial";
    if (roll < 0.9) return "Residential";
    return "Mixed";
  }
  if (districtKind === "Harbor Side") {
    if (roll < 0.46) return "Industrial";
    if (roll < 0.72) return "Commercial";
    if (roll < 0.9) return "Mixed";
    return "Residential";
  }
  if (districtKind === "Garden Ward") {
    if (roll < 0.64) return "Residential";
    if (roll < 0.84) return "Civic";
    if (roll < 0.95) return "Commercial";
    return "Mixed";
  }
  if (roll < 0.7) return "Residential";
  if (roll < 0.88) return "Mixed";
  if (roll < 0.96) return "Commercial";
  return "Civic";
}

function makeRoadName(index: number, vertical: boolean): string {
  const base = STREET_ROOT_BANK[index % STREET_ROOT_BANK.length];
  return vertical ? `${base} St` : `${base} Ave`;
}

function roadTier(index: number, total: number): RoadTier {
  const center = Math.floor(total / 2);
  if (index === center || index % Math.max(3, Math.floor(total / 5)) === 0) {
    return "arterial";
  }
  if (index % 2 === 0) return "collector";
  return "local";
}

function rollTerrain(scale: SettlementScale, rng: () => number): TerrainKind {
  const r = rng();
  // Approximate US settlement patterns:
  // most inland places have no major water edge, then river towns, then coast.
  if (scale === "Hamlet") {
    if (r < 0.07) return "coast";
    if (r < 0.30) return "river";
    return "none";
  }
  if (scale === "Town") {
    if (r < 0.11) return "coast";
    if (r < 0.40) return "river";
    return "none";
  }
  if (scale === "City") {
    if (r < 0.16) return "coast";
    if (r < 0.52) return "river";
    return "none";
  }
  if (r < 0.22) return "coast";
  if (r < 0.60) return "river";
  return "none";
}

function isWaterOccupied(
  terrain: TerrainKind,
  coastSide: CoastSide | null,
  coastDepth: number,
  rect: { left: number; right: number; top: number; bottom: number },
  riverBand?: { y: number; h: number },
): boolean {
  if (terrain === "none") return false;
  if (terrain === "river" && riverBand) {
    return rect.top < riverBand.y + riverBand.h && rect.bottom > riverBand.y - riverBand.h;
  }
  if (terrain === "coast" && coastSide) {
    if (coastSide === "west") return rect.left < coastDepth;
    if (coastSide === "east") return rect.right > coastDepth;
    if (coastSide === "north") return rect.top < coastDepth;
    if (coastSide === "south") return rect.bottom > coastDepth;
  }
  return false;
}

function addressForLot(
  lotX: number,
  lotY: number,
  verticalIndex: number,
  horizontalIndex: number,
): string {
  const number = Math.floor(lotX + lotY) * 2 + 10;
  const street = makeRoadName(verticalIndex + horizontalIndex, true);
  return `${number} ${street}`;
}

function makeRoadPositions(
  count: number,
  min: number,
  max: number,
  rng: () => number,
): number[] {
  const span = max - min;
  const baseStep = span / (count - 1);
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    let pos = min + baseStep * i;
    if (i > 0 && i < count - 1) {
      pos += (rng() - 0.5) * baseStep * 0.26;
    }
    positions.push(pos);
  }
  positions.sort((a, b) => a - b);
  positions[0] = min;
  positions[positions.length - 1] = max;
  return positions;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  return `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`;
}

function polygonPointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function polygonCentroid(points: Point[]): Point {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

function polygonBounds(points: Point[]): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function averageRadius(points: Point[], center: Point): number {
  if (points.length === 0) return 1;
  return (
    points.reduce((acc, p) => acc + Math.hypot(p.x - center.x, p.y - center.y), 0) /
    points.length
  );
}

function insetPolygon(points: Point[], inset: number): Point[] {
  const center = polygonCentroid(points);
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nextDist = Math.max(2, dist - inset);
    return { x: center.x + (dx / dist) * nextDist, y: center.y + (dy / dist) * nextDist };
  });
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
}

function normalize(vx: number, vy: number): Point {
  const m = Math.hypot(vx, vy) || 1;
  return { x: vx / m, y: vy / m };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function orientedRectInsideZone(
  zone: Point[],
  preferAlongRoad: Point,
  rng: () => number,
): Point[] {
  const c = polygonCentroid(zone);
  const axisA = normalize(preferAlongRoad.x, preferAlongRoad.y);
  const axisB = { x: -axisA.y, y: axisA.x };

  let maxA = 0;
  let maxB = 0;
  for (const p of zone) {
    const rel = { x: p.x - c.x, y: p.y - c.y };
    maxA = Math.max(maxA, Math.abs(dot(rel, axisA)));
    maxB = Math.max(maxB, Math.abs(dot(rel, axisB)));
  }
  const halfA = Math.max(2.8, maxA * (0.528 + rng() * 0.192));
  const halfB = Math.max(2.4, maxB * (0.408 + rng() * 0.168));

  return [
    { x: c.x - axisA.x * halfA - axisB.x * halfB, y: c.y - axisA.y * halfA - axisB.y * halfB },
    { x: c.x + axisA.x * halfA - axisB.x * halfB, y: c.y + axisA.y * halfA - axisB.y * halfB },
    { x: c.x + axisA.x * halfA + axisB.x * halfB, y: c.y + axisA.y * halfA + axisB.y * halfB },
    { x: c.x - axisA.x * halfA + axisB.x * halfB, y: c.y - axisA.y * halfA + axisB.y * halfB },
  ];
}

function quadPoint(quad: Point[], u: number, v: number): Point {
  const [a, b, c, d] = quad;
  return {
    x:
      a.x * (1 - u) * (1 - v) +
      b.x * u * (1 - v) +
      c.x * u * v +
      d.x * (1 - u) * v,
    y:
      a.y * (1 - u) * (1 - v) +
      b.y * u * (1 - v) +
      c.y * u * v +
      d.y * (1 - u) * v,
  };
}

function quadCellPolygon(
  quad: Point[],
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): Point[] {
  return [
    quadPoint(quad, u0, v0),
    quadPoint(quad, u1, v0),
    quadPoint(quad, u1, v1),
    quadPoint(quad, u0, v1),
  ];
}

function buildRoadNodeGrid(
  xRoads: number[],
  yRoads: number[],
  center: Point,
  width: number,
  height: number,
  rng: () => number,
): Point[][] {
  const grid: Point[][] = [];
  const dxAvg = (xRoads[xRoads.length - 1] - xRoads[0]) / (xRoads.length - 1);
  const dyAvg = (yRoads[yRoads.length - 1] - yRoads[0]) / (yRoads.length - 1);
  const localAmplitude = Math.min(dxAvg, dyAvg) * 0.2;

  for (let xi = 0; xi < xRoads.length; xi++) {
    const col: Point[] = [];
    for (let yi = 0; yi < yRoads.length; yi++) {
      const baseX = xRoads[xi];
      const baseY = yRoads[yi];
      const edge = xi === 0 || yi === 0 || xi === xRoads.length - 1 || yi === yRoads.length - 1;
      const jitterX = (rng() - 0.5) * (edge ? dxAvg * 0.08 : localAmplitude);
      const jitterY = (rng() - 0.5) * (edge ? dyAvg * 0.08 : localAmplitude);

      const cdx = baseX - center.x;
      const cdy = baseY - center.y;
      const radialDist = Math.hypot(cdx, cdy) || 1;
      const tangentialBias = (rng() - 0.5) * Math.min(24, radialDist * 0.06);
      const tx = (-cdy / radialDist) * tangentialBias;
      const ty = (cdx / radialDist) * tangentialBias;

      col.push({
        x: clamp(baseX + jitterX + tx, 0, width),
        y: clamp(baseY + jitterY + ty, 0, height),
      });
    }
    grid.push(col);
  }

  const minDx = dxAvg * 0.28;
  const minDy = dyAvg * 0.28;
  for (let pass = 0; pass < 4; pass++) {
    for (let yi = 0; yi < yRoads.length; yi++) {
      grid[0][yi].x = xRoads[0];
      grid[xRoads.length - 1][yi].x = xRoads[xRoads.length - 1];
      for (let xi = 1; xi < xRoads.length - 1; xi++) {
        grid[xi][yi].x = Math.max(grid[xi][yi].x, grid[xi - 1][yi].x + minDx);
      }
      for (let xi = xRoads.length - 2; xi >= 1; xi--) {
        grid[xi][yi].x = Math.min(grid[xi][yi].x, grid[xi + 1][yi].x - minDx);
      }
    }
    for (let xi = 0; xi < xRoads.length; xi++) {
      grid[xi][0].y = yRoads[0];
      grid[xi][yRoads.length - 1].y = yRoads[yRoads.length - 1];
      for (let yi = 1; yi < yRoads.length - 1; yi++) {
        grid[xi][yi].y = Math.max(grid[xi][yi].y, grid[xi][yi - 1].y + minDy);
      }
      for (let yi = yRoads.length - 2; yi >= 1; yi--) {
        grid[xi][yi].y = Math.min(grid[xi][yi].y, grid[xi][yi + 1].y - minDy);
      }
    }
  }
  return grid;
}

function districtKindsByUrbanModel(
  center: Point,
  width: number,
  height: number,
  rng: () => number,
): Array<{ kind: DistrictKind; center: Point }> {
  const cornerOptions: Point[] = [
    { x: width * 0.16, y: height * 0.18 },
    { x: width * 0.84, y: height * 0.18 },
    { x: width * 0.16, y: height * 0.82 },
    { x: width * 0.84, y: height * 0.82 },
  ];
  const firstCorner = cornerOptions[Math.floor(rng() * cornerOptions.length)];
  const oppositeCorner = cornerOptions.find(
    (c) => (c.x < width * 0.5) !== (firstCorner.x < width * 0.5) && (c.y < height * 0.5) !== (firstCorner.y < height * 0.5),
  ) ?? cornerOptions[0];

  return [
    { kind: "Market Ward", center: { x: center.x + (rng() - 0.5) * 46, y: center.y + (rng() - 0.5) * 42 } },
    { kind: "Civic Hill", center: { x: center.x + (rng() - 0.5) * 90, y: center.y + (rng() - 0.5) * 90 } },
    {
      kind: "Old Quarter",
      center: {
        x: firstCorner.x + (center.x - firstCorner.x) * (0.35 + rng() * 0.12),
        y: firstCorner.y + (center.y - firstCorner.y) * (0.35 + rng() * 0.12),
      },
    },
    {
      kind: "Garden Ward",
      center: {
        x: oppositeCorner.x + (center.x - oppositeCorner.x) * (0.42 + rng() * 0.18),
        y: oppositeCorner.y + (center.y - oppositeCorner.y) * (0.42 + rng() * 0.18),
      },
    },
    { kind: "Factory Belt", center: { x: firstCorner.x, y: firstCorner.y } },
    { kind: "Harbor Side", center: { x: oppositeCorner.x, y: oppositeCorner.y } },
  ];
}

function irregularDistrictPolygon(
  seed: Point,
  baseRadius: number,
  width: number,
  height: number,
  margin: number,
  rng: () => number,
): Point[] {
  const points: Point[] = [];
  const steps = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2 + (rng() - 0.5) * 0.2;
    const radius = baseRadius * (0.72 + rng() * 0.55);
    points.push({
      x: clamp(seed.x + Math.cos(angle) * radius, margin, width - margin),
      y: clamp(seed.y + Math.sin(angle) * radius, margin, height - margin),
    });
  }
  return points;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: Point[]): Point[] {
  const unique = Array.from(
    new Map(points.map((p) => [`${p.x.toFixed(3)}:${p.y.toFixed(3)}`, p])).values(),
  );
  if (unique.length <= 3) return unique;
  unique.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const lower: Point[] = [];
  for (const p of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const p = unique[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function generateGrowthFront(
  center: Point,
  width: number,
  height: number,
  margin: number,
  scale: SettlementScale,
  rng: () => number,
): Point[] {
  const points: Point[] = [center];
  const branches: Array<{ p: Point; angle: number; energy: number }> = [];
  const initialBranches =
    scale === "Metropolis" ? 8 : scale === "City" ? 7 : scale === "Town" ? 6 : 5;
  const maxEnergy =
    scale === "Metropolis" ? 46 : scale === "City" ? 38 : scale === "Town" ? 30 : 22;
  const stepBase = Math.min(width, height) * (scale === "Metropolis" ? 0.017 : 0.022);

  for (let i = 0; i < initialBranches; i++) {
    const angle = (i / initialBranches) * Math.PI * 2 + (rng() - 0.5) * 0.45;
    branches.push({ p: { x: center.x, y: center.y }, angle, energy: maxEnergy });
  }

  while (branches.length > 0 && points.length < 2400) {
    const b = branches.pop()!;
    let cursor = { x: b.p.x, y: b.p.y };
    let angle = b.angle;
    let energy = b.energy;
    while (energy > 0) {
      const step = stepBase * (0.75 + rng() * 0.85);
      angle += (rng() - 0.5) * 0.52;
      const nx = cursor.x + Math.cos(angle) * step;
      const ny = cursor.y + Math.sin(angle) * step;
      if (nx < margin || nx > width - margin || ny < margin || ny > height - margin) break;

      cursor = { x: nx, y: ny };
      points.push(cursor);
      energy -= 1;

      if (energy > 6 && rng() < 0.19) {
        branches.push({
          p: { x: cursor.x, y: cursor.y },
          angle: angle + (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.7),
          energy: Math.floor(energy * (0.48 + rng() * 0.34)),
        });
      }
      if (energy > 5 && rng() < 0.12) {
        branches.push({
          p: { x: cursor.x, y: cursor.y },
          angle: angle + (rng() < 0.5 ? -1 : 1) * (0.2 + rng() * 0.45),
          energy: Math.floor(energy * (0.38 + rng() * 0.24)),
        });
      }
    }
  }

  const sporePatches = scale === "Metropolis" ? 5 : scale === "City" ? 4 : 3;
  for (let i = 0; i < sporePatches; i++) {
    const anchor = points[Math.floor(rng() * points.length)] ?? center;
    const count = 20 + Math.floor(rng() * 36);
    for (let j = 0; j < count; j++) {
      const a = rng() * Math.PI * 2;
      const r = (2 + rng() * 12) * (1 + i * 0.1);
      points.push({
        x: clamp(anchor.x + Math.cos(a) * r, margin, width - margin),
        y: clamp(anchor.y + Math.sin(a) * r, margin, height - margin),
      });
    }
  }

  return points;
}

function minDistanceToPoints(p: Point, cloud: Point[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const q of cloud) {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best) best = d;
  }
  return best;
}

function createMapModel(
  population: number,
  seed: number,
  people: Person[],
): MapModel {
  const scale = settlementScale(population);
  const config = scaleConfig(scale);
  const rng = mulberry32(seed ^ 0x4d4150);

  const margin = 58;
  const center: Point = {
    x: config.width * (0.5 + (rng() - 0.5) * 0.08),
    y: config.height * (0.5 + (rng() - 0.5) * 0.08),
  };

  const xRoads = makeRoadPositions(
    config.verticalRoads,
    margin,
    config.width - margin,
    rng,
  );
  const yRoads = makeRoadPositions(
    config.horizontalRoads,
    margin,
    config.height - margin,
    rng,
  );

  const nodes = buildRoadNodeGrid(
    xRoads,
    yRoads,
    center,
    config.width,
    config.height,
    rng,
  );

  const terrain = rollTerrain(scale, rng);
  const water: WaterFeature[] = [];
  const riverY = config.height * (0.32 + rng() * 0.24);
  const riverHalf = clamp(config.height * 0.07, 42, 100);
  let coastSide: CoastSide | null = null;
  let coastDepth = 0;

  if (terrain === "river") {
    water.push({
      kind: "river",
      path: `M ${margin - 18} ${(riverY - riverHalf * 0.65).toFixed(
        1,
      )} C ${(config.width * 0.2).toFixed(1)} ${(riverY - riverHalf).toFixed(
        1,
      )} ${(config.width * 0.55).toFixed(1)} ${(riverY + riverHalf).toFixed(
        1,
      )} ${(config.width - margin + 12).toFixed(1)} ${(riverY + riverHalf * 0.45).toFixed(
        1,
      )} L ${(config.width - margin + 12).toFixed(1)} ${(riverY + riverHalf * 1.1).toFixed(
        1,
      )} C ${(config.width * 0.58).toFixed(1)} ${(riverY + riverHalf * 1.38).toFixed(
        1,
      )} ${(config.width * 0.25).toFixed(1)} ${(riverY + riverHalf * 0.15).toFixed(
        1,
      )} ${(margin - 18).toFixed(1)} ${(riverY + riverHalf * 0.8).toFixed(1)} Z`,
      label: "Miskatonic River",
      labelX: config.width * 0.47,
      labelY: config.height * 0.39,
    });
  }

  if (terrain === "coast") {
    const sides: CoastSide[] = ["east", "west", "north", "south"];
    coastSide = sides[Math.floor(rng() * sides.length)];
    coastDepth = Math.floor(
      (coastSide === "east" || coastSide === "west"
        ? config.width
        : config.height) *
        (0.16 + rng() * 0.12),
    );

    if (coastSide === "east") {
      water.push({
        kind: "coast",
        path: `M ${(config.width - coastDepth).toFixed(1)} 0 L ${config.width} 0 L ${config.width} ${config.height} L ${(config.width - coastDepth + 24).toFixed(1)} ${config.height} C ${(config.width - coastDepth - 16).toFixed(1)} ${(config.height * 0.74).toFixed(1)} ${(config.width - coastDepth + 18).toFixed(1)} ${(config.height * 0.28).toFixed(1)} ${(config.width - coastDepth).toFixed(1)} 0 Z`,
        label: "Atlantic Coast",
        labelX: config.width - coastDepth * 0.48,
        labelY: config.height * 0.14,
      });
    } else if (coastSide === "west") {
      water.push({
        kind: "coast",
        path: `M 0 0 L ${coastDepth.toFixed(1)} 0 C ${(coastDepth + 18).toFixed(1)} ${(config.height * 0.27).toFixed(1)} ${(coastDepth - 22).toFixed(1)} ${(config.height * 0.73).toFixed(1)} ${coastDepth.toFixed(1)} ${config.height} L 0 ${config.height} Z`,
        label: "Atlantic Coast",
        labelX: coastDepth * 0.52,
        labelY: config.height * 0.14,
      });
    } else if (coastSide === "north") {
      water.push({
        kind: "coast",
        path: `M 0 0 L ${config.width} 0 L ${config.width} ${(coastDepth - 12).toFixed(1)} C ${(config.width * 0.72).toFixed(1)} ${(coastDepth + 18).toFixed(1)} ${(config.width * 0.31).toFixed(1)} ${(coastDepth - 18).toFixed(1)} 0 ${(coastDepth + 10).toFixed(1)} Z`,
        label: "Coastal Bay",
        labelX: config.width * 0.78,
        labelY: coastDepth * 0.56,
      });
    } else {
      water.push({
        kind: "coast",
        path: `M 0 ${(config.height - coastDepth).toFixed(1)} C ${(config.width * 0.28).toFixed(1)} ${(config.height - coastDepth - 18).toFixed(1)} ${(config.width * 0.72).toFixed(1)} ${(config.height - coastDepth + 14).toFixed(1)} ${config.width} ${(config.height - coastDepth).toFixed(1)} L ${config.width} ${config.height} L 0 ${config.height} Z`,
        label: "Coastal Bay",
        labelX: config.width * 0.78,
        labelY: config.height - coastDepth * 0.36,
      });
    }
  }

  const districtSeedDefs = districtKindsByUrbanModel(
    center,
    config.width,
    config.height,
    rng,
  );
  const districts: District[] = [];
  for (let i = 0; i < districtSeedDefs.length; i++) {
    const d = districtSeedDefs[i];
    const baseRadius = Math.min(config.width, config.height) * (0.18 + rng() * 0.1);
    districts.push({
      id: i,
      name: neighborhoodNames[i % neighborhoodNames.length],
      kind: d.kind,
      hue: districtHue[d.kind],
      center: d.center,
      points: irregularDistrictPolygon(
        d.center,
        baseRadius,
        config.width,
        config.height,
        margin,
        rng,
      ),
    });
  }

  const roads: Road[] = [];
  let roadId = 0;
  for (let i = 0; i < nodes.length; i++) {
    roads.push({
      id: roadId++,
      name: makeRoadName(i, true),
      path: pointsToPath(nodes[i]),
      tier: roadTier(i, nodes.length),
    });
  }
  for (let i = 0; i < nodes[0].length; i++) {
    const pts: Point[] = [];
    for (let xi = 0; xi < nodes.length; xi++) pts.push(nodes[xi][i]);
    roads.push({
      id: roadId++,
      name: makeRoadName(i, false),
      path: pointsToPath(pts),
      tier: roadTier(i, nodes[0].length),
    });
  }

  const buildings: Building[] = [];
  let buildingId = 0;
  const growthFront = generateGrowthFront(
    center,
    config.width,
    config.height,
    margin,
    scale,
    rng,
  );
  const shoreline =
    coastSide === null
      ? 0
      : coastSide === "east"
        ? config.width - coastDepth
        : coastSide === "south"
          ? config.height - coastDepth
          : coastDepth;

  const blockEntries: Array<{ xi: number; yi: number; block: Point[]; growthScore: number }> = [];
  for (let yi = 0; yi < nodes[0].length - 1; yi++) {
    for (let xi = 0; xi < nodes.length - 1; xi++) {
      const block = [
        nodes[xi][yi],
        nodes[xi + 1][yi],
        nodes[xi + 1][yi + 1],
        nodes[xi][yi + 1],
      ];
      const c = polygonCentroid(block);
      const radialDist = Math.hypot(c.x - center.x, c.y - center.y);
      const branchDist = minDistanceToPoints(c, growthFront);
      const growthScore = branchDist * 0.82 + radialDist * 0.18 + rng() * 10;
      blockEntries.push({
        xi,
        yi,
        block,
        growthScore,
      });
    }
  }
  blockEntries.sort((a, b) => a.growthScore - b.growthScore);

  for (const entry of blockEntries) {
    if (buildings.length >= config.maxBuildings) break;
    const { xi, yi, block } = entry;
      const b = polygonBounds(block);
      const cellW = b.right - b.left;
      const cellH = b.bottom - b.top;
      if (cellW < 22 || cellH < 22) continue;

      const inWater = isWaterOccupied(
        terrain,
        coastSide,
        shoreline,
        { left: b.left, right: b.right, top: b.top, bottom: b.bottom },
        terrain === "river" ? { y: riverY, h: riverHalf } : undefined,
      );
      if (inWater && rng() < 0.72) continue;

      const district =
        districtByPoint((b.left + b.right) * 0.5, (b.top + b.bottom) * 0.5, districts) ||
        districts[0];

      const localCenter = polygonCentroid(block);
      const normCenterDist =
        Math.hypot(localCenter.x - center.x, localCenter.y - center.y) /
        Math.hypot(config.width, config.height);
      const toFactory = districts
        .filter((d) => d.kind === "Factory Belt" || d.kind === "Harbor Side")
        .reduce((acc, d) => Math.min(acc, Math.hypot(localCenter.x - d.center.x, localCenter.y - d.center.y)), Number.POSITIVE_INFINITY);

      const cols = clamp(Math.floor(3 + rng() * 3), 3, 5);
      const rows = clamp(Math.floor(3 + rng() * 3), 3, 5);
      for (let u = 0; u < cols; u++) {
        for (let v = 0; v < rows; v++) {
          if (buildings.length >= config.maxBuildings) break;
          const edgeLot = u === 0 || v === 0 || u === cols - 1 || v === rows - 1;
          if (!edgeLot && rng() > (scale === "Metropolis" ? 0.45 : scale === "City" ? 0.32 : 0.18)) continue;

          const lot = quadCellPolygon(
            block,
            u / cols,
            (u + 1) / cols,
            v / rows,
            (v + 1) / rows,
          );
          const lb = polygonBounds(lot);
          if (lb.right - lb.left < 7 || lb.bottom - lb.top < 7) continue;

          const zone = insetPolygon(lot, 2 + rng() * 2.4);
          const zoneBounds = polygonBounds(zone);
          if (zoneBounds.right - zoneBounds.left < 6 || zoneBounds.bottom - zoneBounds.top < 6) {
            continue;
          }

          const [a, b, c, d] = zone;
          const uVec = normalize(midpoint(b, c).x - midpoint(a, d).x, midpoint(b, c).y - midpoint(a, d).y);
          const vVec = normalize(midpoint(d, c).x - midpoint(a, b).x, midpoint(d, c).y - midpoint(a, b).y);
          const alongRoad =
            u === 0 || u === cols - 1
              ? vVec
              : v === 0 || v === rows - 1
                ? uVec
                : (zoneBounds.right - zoneBounds.left) > (zoneBounds.bottom - zoneBounds.top)
                  ? uVec
                  : vVec;
          const structure = orientedRectInsideZone(zone, alongRoad, rng);

          let kind = randomBuildingKind(rng, district.kind);
          const cornerBand = Math.min(config.width, config.height) * 0.2;
          if (normCenterDist < 0.1) {
            kind = rng() < 0.72 ? "Commercial" : rng() < 0.88 ? "Civic" : "Mixed";
          } else if (normCenterDist < 0.18 && rng() < 0.62) {
            kind = rng() < 0.56 ? "Commercial" : "Mixed";
          } else if (toFactory < cornerBand && rng() < 0.72) {
            kind = rng() < 0.74 ? "Industrial" : "Mixed";
          } else if (
            normCenterDist > 0.27 &&
            toFactory > Math.min(config.width, config.height) * 0.22 &&
            rng() < 0.64
          ) {
            kind = "Residential";
          }

          const residentsTarget =
            kind === "Residential"
              ? (normCenterDist > 0.24 ? 2 : 1) + Math.floor(rng() * 4)
              : kind === "Mixed"
                ? 1 + Math.floor(rng() * 3)
                : Math.floor(rng() * 2);
          const workersTarget =
            kind === "Industrial"
              ? (toFactory < cornerBand ? 5 : 3) + Math.floor(rng() * 9)
              : kind === "Commercial"
                ? (normCenterDist < 0.12 ? 4 : 2) + Math.floor(rng() * 8)
                : kind === "Civic"
                  ? (normCenterDist < 0.14 ? 3 : 2) + Math.floor(rng() * 5)
                  : kind === "Mixed"
                    ? (normCenterDist < 0.16 ? 2 : 1) + Math.floor(rng() * 4)
                    : Math.floor(rng() * 2);

          buildings.push({
            id: buildingId++,
            districtId: district.id,
            districtName: district.name,
            kind,
            descriptor: pickDescriptor(kind, rng),
            points: zone,
            structurePoints: structure,
            address: addressForLot(
              xi * 20 + rng() * 4,
              yi * 12 + rng() * 4,
              xi,
              yi,
            ),
            residents: pickIds(rng, people, residentsTarget),
            workers: pickIds(rng, people, workersTarget),
          });
        }
      }
    }

  const districtPoints = new Map<number, Point[]>();
  for (const district of districts) districtPoints.set(district.id, []);
  for (let yi = 0; yi < nodes[0].length - 1; yi++) {
    for (let xi = 0; xi < nodes.length - 1; xi++) {
      const block = [
        nodes[xi][yi],
        nodes[xi + 1][yi],
        nodes[xi + 1][yi + 1],
        nodes[xi][yi + 1],
      ];
      const c = polygonCentroid(block);
      const district = districtByPoint(c.x, c.y, districts);
      if (!district) continue;
      const list = districtPoints.get(district.id);
      if (!list) continue;
      list.push(...block);
    }
  }
  for (const district of districts) {
    const pts = districtPoints.get(district.id);
    if (!pts || pts.length < 3) continue;
    district.points = insetPolygon(
      convexHull(pts),
      -(2 + rng() * 8),
    ).map((p) => ({
      x: clamp(p.x, margin, config.width - margin),
      y: clamp(p.y, margin, config.height - margin),
    }));
    district.center = polygonCentroid(district.points);
  }

  return {
    scale,
    width: config.width,
    height: config.height,
    districts,
    roads,
    buildings,
    water,
  };
}

function ensureCamera(
  svgEl: SVGSVGElement,
  width: number,
  height: number,
): CameraState {
  const existing = cameraBySvg.get(svgEl);
  if (
    existing &&
    existing.width === width &&
    existing.height === height &&
    existing.zoom >= 1
  ) {
    return existing;
  }
  const created: CameraState = {
    zoom: 1,
    cx: width / 2,
    cy: height / 2,
    width,
    height,
  };
  cameraBySvg.set(svgEl, created);
  return created;
}

function updateRoadLabelVisibility(svgEl: SVGSVGElement): void {
  const cam = cameraBySvg.get(svgEl);
  if (!cam) return;
  const labels = svgEl.querySelectorAll<SVGTextElement>(".town-map-road-label");
  labels.forEach((el) => {
    const tier = (el.dataset.tier || "local") as RoadTier;
    const minZoom =
      tier === "arterial" ? 1 : tier === "collector" ? 1.6 : 2.4;
    el.style.display = cam.zoom >= minZoom ? "" : "none";
  });

  const neighborhoods = svgEl.querySelectorAll<SVGTextElement>(
    ".town-map-neighborhood-label",
  );
  neighborhoods.forEach((el) => {
    el.style.display = cam.zoom >= 1.35 ? "" : "none";
  });
}

function applyViewBox(svgEl: SVGSVGElement): void {
  const cam = cameraBySvg.get(svgEl);
  if (!cam) return;
  const vw = cam.width / cam.zoom;
  const vh = cam.height / cam.zoom;
  const x = clamp(cam.cx - vw / 2, 0, cam.width - vw);
  const y = clamp(cam.cy - vh / 2, 0, cam.height - vh);
  svgEl.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
  updateRoadLabelVisibility(svgEl);
}

function setZoom(svgEl: SVGSVGElement, nextZoom: number): void {
  const cam = cameraBySvg.get(svgEl);
  if (!cam) return;
  cam.zoom = clamp(nextZoom, 1, 6);
  applyViewBox(svgEl);
}

export function initTownMapControls(
  svgEl: SVGSVGElement,
  zoomInBtn: HTMLButtonElement,
  zoomOutBtn: HTMLButtonElement,
  zoomResetBtn: HTMLButtonElement,
): void {
  if (svgEl.dataset.mapControlsReady === "1") return;
  svgEl.dataset.mapControlsReady = "1";

  zoomInBtn.addEventListener("click", () => {
    const cam = cameraBySvg.get(svgEl);
    if (!cam) return;
    setZoom(svgEl, cam.zoom * 1.15);
  });
  zoomOutBtn.addEventListener("click", () => {
    const cam = cameraBySvg.get(svgEl);
    if (!cam) return;
    setZoom(svgEl, cam.zoom / 1.15);
  });
  zoomResetBtn.addEventListener("click", () => {
    const cam = cameraBySvg.get(svgEl);
    if (!cam) return;
    cam.cx = cam.width / 2;
    cam.cy = cam.height / 2;
    cam.zoom = 1;
    applyViewBox(svgEl);
  });

  svgEl.addEventListener("wheel", (event) => {
    event.preventDefault();
    const cam = cameraBySvg.get(svgEl);
    if (!cam) return;
    const mul = event.deltaY > 0 ? 0.92 : 1.08;
    setZoom(svgEl, cam.zoom * mul);
  });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  svgEl.addEventListener("mousedown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const cam = cameraBySvg.get(svgEl);
    if (!cam) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    const scale = 1 / cam.zoom;
    cam.cx = clamp(cam.cx - dx * scale, 0, cam.width);
    cam.cy = clamp(cam.cy - dy * scale, 0, cam.height);
    applyViewBox(svgEl);
  });
}

function districtFillClass(kind: DistrictKind): string {
  switch (kind) {
    case "Old Quarter":
      return "district-old";
    case "Market Ward":
      return "district-market";
    case "Factory Belt":
      return "district-factory";
    case "Harbor Side":
      return "district-harbor";
    case "Civic Hill":
      return "district-civic";
    case "Garden Ward":
      return "district-garden";
    default:
      return "district-old";
  }
}

function buildingFillClass(kind: BuildingKind): string {
  switch (kind) {
    case "Residential":
      return "building-residential";
    case "Commercial":
      return "building-commercial";
    case "Industrial":
      return "building-industrial";
    case "Civic":
      return "building-civic";
    case "Mixed":
      return "building-social";
    default:
      return "building-residential";
  }
}

function roadTierClass(tier: RoadTier): string {
  if (tier === "arterial") return "town-map-road-arterial";
  if (tier === "collector") return "town-map-road-collector";
  return "town-map-road-local";
}

function hoverPeopleButtons(
  title: string,
  ids: number[],
  peopleById: Map<number, Person>,
  getPersonName: (p: Person) => string,
): string {
  if (ids.length === 0) return "";
  const head = ids.slice(0, 6);
  const rows = head
    .map((id) => {
      const person = peopleById.get(id);
      if (!person) return "";
      return `<button class="town-map-person-link" data-person-id="${id}">${getPersonName(person)}</button>`;
    })
    .join("");
  const extra =
    ids.length > 6
      ? `<div class="town-map-hover-more">+${ids.length - 6} more</div>`
      : "";
  return `<div class="town-map-hover-group"><div class="town-map-hover-label">${title}</div>${rows}${extra}</div>`;
}

function roadLabel(svgEl: SVGSVGElement, road: Road): void {
  const points = Array.from(road.path.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)).map(
    (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
  );
  if (points.length < 2) return;
  const midIdx = Math.floor(points.length / 2);
  const mid = points[midIdx];
  const near = points[Math.max(0, midIdx - 1)];
  const angle = Math.atan2(mid.y - near.y, mid.x - near.x) * (180 / Math.PI);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", `town-map-road-label town-map-road-label-${road.tier}`);
  text.dataset.tier = road.tier;
  text.setAttribute("x", mid.x.toFixed(1));
  text.setAttribute("y", mid.y.toFixed(1));
  text.setAttribute(
    "transform",
    `rotate(${angle.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)})`,
  );
  text.textContent = road.name;
  svgEl.appendChild(text);
}

export function renderTownMapPrototype(params: RenderParams): void {
  const {
    svgEl,
    legendEl,
    statsEl,
    hoverEl,
    scaleEl,
    population,
    seed,
    people,
    getPersonName,
    onPersonClick,
  } = params;

  const model = createMapModel(population, seed, people);
  scaleEl.textContent = model.scale;
  ensureCamera(svgEl, model.width, model.height);

  svgEl.innerHTML = "";
  svgEl.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
  svgEl.setAttribute("aria-label", "Procedural town map");
  svgEl.setAttribute("role", "img");
  svgEl.dataset.seed = String(seed);
  applyViewBox(svgEl);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <pattern id="paper-fiber" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#c9bea9" stroke-width="0.38" opacity="0.36"></path>
    </pattern>
    <pattern id="paper-noise-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="#2e2519" stroke-width="0.6" opacity="0.08"></line>
    </pattern>
  `;
  svgEl.appendChild(defs);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(model.width));
  bg.setAttribute("height", String(model.height));
  bg.setAttribute("class", "town-map-bg");
  svgEl.appendChild(bg);

  for (const district of model.districts) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", polygonPointsAttr(district.points));
    poly.setAttribute("class", `town-map-district ${districtFillClass(district.kind)}`);
    poly.setAttribute("fill", district.hue);
    poly.setAttribute("opacity", "0.42");
    svgEl.appendChild(poly);

    const neighborhood = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    neighborhood.setAttribute("x", district.center.x.toFixed(1));
    neighborhood.setAttribute("y", district.center.y.toFixed(1));
    neighborhood.setAttribute("class", "town-map-neighborhood-label");
    neighborhood.textContent = district.name;
    svgEl.appendChild(neighborhood);
  }

  for (const water of model.water) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", water.path);
    path.setAttribute("class", `town-map-water town-map-water-${water.kind}`);
    svgEl.appendChild(path);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const labelX =
      water.labelX ?? (water.kind === "river" ? model.width * 0.47 : model.width * 0.82);
    const labelY =
      water.labelY ?? (water.kind === "river" ? model.height * 0.39 : model.height * 0.13);
    label.setAttribute("x", labelX.toFixed(1));
    label.setAttribute("y", labelY.toFixed(1));
    label.setAttribute("class", "town-map-water-label");
    label.textContent = water.label;
    svgEl.appendChild(label);
  }

  for (const road of model.roads) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", road.path);
    path.setAttribute("class", `town-map-road ${roadTierClass(road.tier)}`);
    svgEl.appendChild(path);
    roadLabel(svgEl, road);
  }

  const buildingsGroup = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  buildingsGroup.setAttribute("class", "town-map-buildings");
  svgEl.appendChild(buildingsGroup);

  for (const building of model.buildings) {
    const zone = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    zone.setAttribute("points", polygonPointsAttr(building.points));
    zone.setAttribute("class", "town-map-building");
    zone.dataset.buildingId = String(building.id);
    buildingsGroup.appendChild(zone);

    const structure = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    structure.setAttribute("points", polygonPointsAttr(building.structurePoints));
    structure.setAttribute("class", `town-map-building-structure ${buildingFillClass(building.kind)}`);
    structure.setAttribute("pointer-events", "none");
    buildingsGroup.appendChild(structure);
  }

  const paperFiber = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  paperFiber.setAttribute("x", "0");
  paperFiber.setAttribute("y", "0");
  paperFiber.setAttribute("width", String(model.width));
  paperFiber.setAttribute("height", String(model.height));
  paperFiber.setAttribute("fill", "url(#paper-fiber)");
  paperFiber.setAttribute("opacity", "0.48");
  paperFiber.setAttribute("pointer-events", "none");
  svgEl.appendChild(paperFiber);

  const paperNoise = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  paperNoise.setAttribute("x", "0");
  paperNoise.setAttribute("y", "0");
  paperNoise.setAttribute("width", String(model.width));
  paperNoise.setAttribute("height", String(model.height));
  paperNoise.setAttribute("fill", "url(#paper-noise-hatch)");
  paperNoise.setAttribute("opacity", "0.35");
  paperNoise.setAttribute("pointer-events", "none");
  svgEl.appendChild(paperNoise);

  const frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  frame.setAttribute("x", "22");
  frame.setAttribute("y", "22");
  frame.setAttribute("width", String(model.width - 44));
  frame.setAttribute("height", String(model.height - 44));
  frame.setAttribute("class", "town-map-frame");
  svgEl.appendChild(frame);

  const peopleById = new Map<number, Person>(people.map((p) => [p.id, p]));
  const buildingById = new Map<number, Building>(
    model.buildings.map((b) => [b.id, b]),
  );

  legendEl.innerHTML = model.districts
    .map(
      (d) => `<div class="town-map-legend-row">
        <span class="town-map-legend-chip" style="background:${d.hue}"></span>
        <span>${d.name}</span>
      </div>`,
    )
    .join("");

  const residential = model.buildings.filter(
    (b) => b.kind === "Residential" || b.kind === "Mixed",
  ).length;
  const employment = model.buildings.filter(
    (b) =>
      b.kind === "Commercial" || b.kind === "Industrial" || b.kind === "Civic",
  ).length;
  const arterialCount = model.roads.filter((r) => r.tier === "arterial").length;
  statsEl.innerHTML = `
    <div class="town-map-stat"><span>Districts</span><strong>${model.districts.length}</strong></div>
    <div class="town-map-stat"><span>Roads</span><strong>${model.roads.length}</strong></div>
    <div class="town-map-stat"><span>Arterials</span><strong>${arterialCount}</strong></div>
    <div class="town-map-stat"><span>Parcels</span><strong>${model.buildings.length}</strong></div>
    <div class="town-map-stat"><span>Housing Lots</span><strong>${residential}</strong></div>
    <div class="town-map-stat"><span>Work Lots</span><strong>${employment}</strong></div>
  `;

  const defaultHoverHtml =
    '<div class="town-map-hover-empty">Hover a parcel to inspect residents and workers. Click a parcel to pin details.</div>';
  hoverEl.innerHTML = defaultHoverHtml;

  const renderBuildingPanel = (building: Building) => {
    const socialClass = parcelSocialClass(building, peopleById);
    const kindLabel = building.kind === "Mixed" ? "Social" : building.kind;
    hoverEl.innerHTML = `
      <h4>${building.address}</h4>
      <div class="town-map-hover-meta">${kindLabel} · ${building.descriptor} · ${building.districtName} · <strong>Class</strong>: ${socialClass}</div>
      ${hoverPeopleButtons("Residents", building.residents, peopleById, getPersonName)}
      ${hoverPeopleButtons("Workers", building.workers, peopleById, getPersonName)}
    `;
    hoverEl
      .querySelectorAll<HTMLElement>(".town-map-person-link")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const personId = Number(btn.dataset.personId);
          onPersonClick(personId);
        });
      });
  };

  let selectedBuildingId: number | null = null;

  const setSelectedBuilding = (buildingId: number | null) => {
    selectedBuildingId = buildingId;
    const nodes = svgEl.querySelectorAll<SVGPolygonElement>(".town-map-building");
    nodes.forEach((n) => {
      const isSel = Number(n.dataset.buildingId) === selectedBuildingId;
      n.classList.toggle("selected", isSel);
      if (!isSel) n.classList.remove("active");
    });
    if (selectedBuildingId === null) {
      hoverEl.innerHTML = defaultHoverHtml;
      return;
    }
    const building = buildingById.get(selectedBuildingId);
    if (building) renderBuildingPanel(building);
  };

  const interactiveBuildings = svgEl.querySelectorAll<SVGPolygonElement>(
    ".town-map-building",
  );
  interactiveBuildings.forEach((node) => {
    node.addEventListener("mouseenter", () => {
      if (selectedBuildingId !== null) return;
      const id = Number(node.dataset.buildingId);
      const building = buildingById.get(id);
      if (!building) return;
      node.classList.add("active");
      renderBuildingPanel(building);
    });
    node.addEventListener("mouseleave", () => {
      if (selectedBuildingId !== null) return;
      node.classList.remove("active");
      hoverEl.innerHTML = defaultHoverHtml;
    });
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(node.dataset.buildingId);
      if (selectedBuildingId === id) {
        setSelectedBuilding(null);
      } else {
        setSelectedBuilding(id);
      }
    });
  });

  svgEl.onclick = (event) => {
    const target = event.target as Element;
    if (target.closest(".town-map-building")) return;
    if (selectedBuildingId !== null) {
      setSelectedBuilding(null);
    }
  };

  updateRoadLabelVisibility(svgEl);
}

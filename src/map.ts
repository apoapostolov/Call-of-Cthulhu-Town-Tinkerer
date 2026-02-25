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

interface District {
  id: number;
  name: string;
  kind: DistrictKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hue: string;
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
  x: number;
  y: number;
  w: number;
  h: number;
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

const districtKindCycle: DistrictKind[] = [
  "Old Quarter",
  "Market Ward",
  "Harbor Side",
  "Factory Belt",
  "Civic Hill",
  "Garden Ward",
];

const neighborhoodNames = [
  "Northside Terrace",
  "Riverside Yard",
  "French Hill",
  "Merchant Row",
  "Garrison Green",
  "Wharf End",
  "Old Gables",
  "College Rise",
  "Mason Quarter",
  "Dunwich Roadside",
  "South Market",
  "Ashbury Common",
];

const districtHue: Record<DistrictKind, string> = {
  "Old Quarter": "#d3cab5",
  "Market Ward": "#cec3ab",
  "Factory Belt": "#c1b59d",
  "Harbor Side": "#c6c9b9",
  "Civic Hill": "#d9cfb9",
  "Garden Ward": "#cad0b8",
};

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

function districtByPoint(
  x: number,
  y: number,
  districts: District[],
): District | undefined {
  return districts.find(
    (d) => x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h,
  );
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
  const base = STREET_NAME_BANK[index % STREET_NAME_BANK.length]
    .replace(/\s+(Street|Avenue|Road|Lane|Terrace|Way|Court|Place|Row|Parade|Drive|Walk|Square|Hill|Passage)$/i, "")
    .trim();
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

function edgeLots(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  depth: number,
  rng: () => number,
): { x: number; y: number; w: number; h: number }[] {
  const lots: { x: number; y: number; w: number; h: number }[] = [];
  const horizontal = Math.abs(y2 - y1) < 0.001;
  if (horizontal) {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    let cursor = left;
    while (cursor < right - 8) {
      const lotW = clamp(14 + rng() * 22, 10, 34);
      const next = Math.min(cursor + lotW, right);
      lots.push({ x: cursor, y: y1, w: next - cursor, h: depth });
      cursor = next + 2;
    }
  } else {
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    let cursor = top;
    while (cursor < bottom - 8) {
      const lotH = clamp(14 + rng() * 22, 10, 34);
      const next = Math.min(cursor + lotH, bottom);
      lots.push({ x: x1, y: cursor, w: depth, h: next - cursor });
      cursor = next + 2;
    }
  }
  return lots;
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

  const districts: District[] = [];
  const districtCols = 3;
  const districtRows = 2;
  const districtW = (config.width - margin * 2) / districtCols;
  const districtH = (config.height - margin * 2) / districtRows;
  let districtId = 0;
  for (let r = 0; r < districtRows; r++) {
    for (let c = 0; c < districtCols; c++) {
      const kind = districtKindCycle[districtId % districtKindCycle.length];
      const x = margin + c * districtW;
      const y = margin + r * districtH;
      districts.push({
        id: districtId,
        name: neighborhoodNames[districtId % neighborhoodNames.length],
        kind,
        x,
        y,
        w: districtW,
        h: districtH,
        hue: districtHue[kind],
      });
      districtId++;
    }
  }

  const roads: Road[] = [];
  let roadId = 0;
  for (let i = 0; i < xRoads.length; i++) {
    roads.push({
      id: roadId++,
      name: makeRoadName(i, true),
      path: `M ${xRoads[i].toFixed(1)} ${margin} L ${xRoads[i].toFixed(1)} ${(
        config.height - margin
      ).toFixed(1)}`,
      tier: roadTier(i, xRoads.length),
    });
  }
  for (let i = 0; i < yRoads.length; i++) {
    roads.push({
      id: roadId++,
      name: makeRoadName(i, false),
      path: `M ${margin} ${yRoads[i].toFixed(1)} L ${(config.width - margin).toFixed(
        1,
      )} ${yRoads[i].toFixed(1)}`,
      tier: roadTier(i, yRoads.length),
    });
  }

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

  const buildings: Building[] = [];
  let buildingId = 0;
  const innerGap = 4;
  const shoreline =
    coastSide === null
      ? 0
      : coastSide === "east"
        ? config.width - coastDepth
        : coastSide === "south"
          ? config.height - coastDepth
          : coastDepth;

  outer: for (let yi = 0; yi < yRoads.length - 1; yi++) {
    for (let xi = 0; xi < xRoads.length - 1; xi++) {
      if (buildings.length >= config.maxBuildings) break outer;
      const left = xRoads[xi] + innerGap;
      const right = xRoads[xi + 1] - innerGap;
      const top = yRoads[yi] + innerGap;
      const bottom = yRoads[yi + 1] - innerGap;
      const cellW = right - left;
      const cellH = bottom - top;
      if (cellW < 20 || cellH < 20) continue;

      const inWater = isWaterOccupied(
        terrain,
        coastSide,
        shoreline,
        { left, right, top, bottom },
        terrain === "river" ? { y: riverY, h: riverHalf } : undefined,
      );
      if (inWater && rng() < 0.72) continue;

      const district =
        districtByPoint((left + right) * 0.5, (top + bottom) * 0.5, districts) ||
        districts[0];

      const depth = clamp(Math.min(cellW, cellH) * 0.26, 8, 20);
      const perimeterLots = [
        ...edgeLots(left, top, right, top, depth, rng),
        ...edgeLots(left, bottom - depth, right, bottom - depth, depth, rng),
        ...edgeLots(left, top + depth, left, bottom - depth, depth, rng),
        ...edgeLots(
          right - depth,
          top + depth,
          right - depth,
          bottom - depth,
          depth,
          rng,
        ),
      ];

      for (const lot of perimeterLots) {
        if (buildings.length >= config.maxBuildings) break outer;
        if (lot.w < 7 || lot.h < 7) continue;
        if (rng() < 0.12) continue;

        const inset = 1 + rng() * 2;
        const x = lot.x + inset;
        const y = lot.y + inset;
        const w = Math.max(5, lot.w - inset * 2);
        const h = Math.max(5, lot.h - inset * 2);
        if (w < 5 || h < 5) continue;

        const kind = randomBuildingKind(rng, district.kind);
        const residentsTarget =
          kind === "Residential"
            ? 1 + Math.floor(rng() * 5)
            : kind === "Mixed"
              ? 1 + Math.floor(rng() * 3)
              : Math.floor(rng() * 2);
        const workersTarget =
          kind === "Industrial"
            ? 3 + Math.floor(rng() * 9)
            : kind === "Commercial"
              ? 2 + Math.floor(rng() * 7)
              : kind === "Civic"
                ? 2 + Math.floor(rng() * 5)
                : kind === "Mixed"
                  ? 1 + Math.floor(rng() * 4)
                  : Math.floor(rng() * 2);

        buildings.push({
          id: buildingId++,
          districtId: district.id,
          districtName: district.name,
          kind,
          x,
          y,
          w,
          h,
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
      return "building-mixed";
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
  if (ids.length === 0) {
    return `<div class="town-map-hover-empty">${title}: none listed</div>`;
  }
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
  const m = road.path.match(/M\s+([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return;
  const x1 = Number(m[1]);
  const y1 = Number(m[2]);
  const x2 = Number(m[3]);
  const y2 = Number(m[4]);
  const vertical = Math.abs(x1 - x2) < 0.01;

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", `town-map-road-label town-map-road-label-${road.tier}`);
  text.dataset.tier = road.tier;

  if (vertical) {
    text.setAttribute("x", (x1 + 6).toFixed(1));
    text.setAttribute("y", ((y1 + y2) * 0.5).toFixed(1));
    text.setAttribute("transform", `rotate(-90 ${x1 + 6} ${(y1 + y2) * 0.5})`);
  } else {
    text.setAttribute("x", ((x1 + x2) * 0.5).toFixed(1));
    text.setAttribute("y", (y1 - 3).toFixed(1));
  }

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
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", district.x.toFixed(1));
    rect.setAttribute("y", district.y.toFixed(1));
    rect.setAttribute("width", district.w.toFixed(1));
    rect.setAttribute("height", district.h.toFixed(1));
    rect.setAttribute("class", `town-map-district ${districtFillClass(district.kind)}`);
    rect.setAttribute("fill", district.hue);
    rect.setAttribute("opacity", "0.42");
    svgEl.appendChild(rect);

    const neighborhood = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    neighborhood.setAttribute("x", (district.x + district.w * 0.5).toFixed(1));
    neighborhood.setAttribute("y", (district.y + district.h * 0.5).toFixed(1));
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
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", building.x.toFixed(1));
    rect.setAttribute("y", building.y.toFixed(1));
    rect.setAttribute("width", building.w.toFixed(1));
    rect.setAttribute("height", building.h.toFixed(1));
    rect.setAttribute("class", `town-map-building ${buildingFillClass(building.kind)}`);
    rect.dataset.buildingId = String(building.id);
    buildingsGroup.appendChild(rect);
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
    hoverEl.innerHTML = `
      <h4>${building.address}</h4>
      <div class="town-map-hover-meta">${building.kind} · ${building.districtName}</div>
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
    const nodes = svgEl.querySelectorAll<SVGRectElement>(".town-map-building");
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

  const interactiveBuildings = svgEl.querySelectorAll<SVGRectElement>(
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

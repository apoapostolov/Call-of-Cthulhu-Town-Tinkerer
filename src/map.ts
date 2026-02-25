import type { Person } from "./logic.ts";
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
  primary: boolean;
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
}

interface ScaleConfig {
  width: number;
  height: number;
  districts: number;
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
const streetNames = [
  "Miskatonic Avenue",
  "Church Row",
  "Foundry Street",
  "Gaslight Lane",
  "Old Wharf Road",
  "Telegraph Way",
  "Cobbler Court",
  "Crown Passage",
  "Elm Street",
  "Station Road",
  "Pilgrim Street",
  "Kingsley Terrace",
  "Tallow Yard",
  "Raven Alley",
  "Cedar Road",
  "Penny Arcade",
  "Millwright Street",
  "Oak Parade",
];
const districtKindCycle: DistrictKind[] = [
  "Old Quarter",
  "Market Ward",
  "Harbor Side",
  "Factory Belt",
  "Civic Hill",
  "Garden Ward",
];
const districtHue: Record<DistrictKind, string> = {
  "Old Quarter": "#846f4a",
  "Market Ward": "#9a8157",
  "Factory Belt": "#6d5e4b",
  "Harbor Side": "#65797c",
  "Civic Hill": "#8f765f",
  "Garden Ward": "#7a8e63",
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
      return { width: 980, height: 640, districts: 4, maxBuildings: 120 };
    case "Town":
      return { width: 1300, height: 840, districts: 6, maxBuildings: 250 };
    case "City":
      return { width: 1700, height: 1080, districts: 9, maxBuildings: 460 };
    case "Metropolis":
      return { width: 2250, height: 1400, districts: 14, maxBuildings: 860 };
    default:
      return { width: 1300, height: 840, districts: 6, maxBuildings: 250 };
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

function randomBuildingKind(
  rng: () => number,
  districtKind: DistrictKind,
): BuildingKind {
  const roll = rng();
  if (districtKind === "Factory Belt") {
    if (roll < 0.55) return "Industrial";
    if (roll < 0.8) return "Mixed";
    if (roll < 0.93) return "Commercial";
    return "Residential";
  }
  if (districtKind === "Market Ward") {
    if (roll < 0.5) return "Commercial";
    if (roll < 0.75) return "Mixed";
    if (roll < 0.9) return "Residential";
    return "Civic";
  }
  if (districtKind === "Civic Hill") {
    if (roll < 0.45) return "Civic";
    if (roll < 0.7) return "Commercial";
    if (roll < 0.9) return "Residential";
    return "Mixed";
  }
  if (districtKind === "Harbor Side") {
    if (roll < 0.4) return "Industrial";
    if (roll < 0.68) return "Commercial";
    if (roll < 0.88) return "Mixed";
    return "Residential";
  }
  if (districtKind === "Garden Ward") {
    if (roll < 0.6) return "Residential";
    if (roll < 0.8) return "Civic";
    if (roll < 0.95) return "Commercial";
    return "Mixed";
  }
  if (roll < 0.65) return "Residential";
  if (roll < 0.84) return "Mixed";
  if (roll < 0.95) return "Commercial";
  return "Civic";
}

function buildingAddress(
  rng: () => number,
  districtId: number,
  lotIndex: number,
): string {
  const street = streetNames[(districtId * 7 + lotIndex) % streetNames.length];
  const number = 2 * (Math.floor(rng() * 150) + 1);
  return `${number} ${street}`;
}

function createMapModel(
  population: number,
  seed: number,
  people: Person[],
): MapModel {
  const scale = settlementScale(population);
  const config = scaleConfig(scale);
  const rng = mulberry32(seed ^ 0x4d4150);

  const districts: District[] = [];
  const roads: Road[] = [];
  const buildings: Building[] = [];

  const cols = Math.max(2, Math.ceil(Math.sqrt(config.districts * 1.2)));
  const rows = Math.ceil(config.districts / cols);
  const margin = 40;
  const usableW = config.width - margin * 2;
  const usableH = config.height - margin * 2;
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  for (let i = 0; i < config.districts; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const kind = districtKindCycle[i % districtKindCycle.length];
    const jitterX = (rng() - 0.5) * cellW * 0.14;
    const jitterY = (rng() - 0.5) * cellH * 0.14;
    const widthShrink = 0.1 + rng() * 0.15;
    const heightShrink = 0.1 + rng() * 0.15;
    const x = margin + col * cellW + cellW * widthShrink * 0.5 + jitterX;
    const y = margin + row * cellH + cellH * heightShrink * 0.5 + jitterY;
    const w = cellW * (1 - widthShrink);
    const h = cellH * (1 - heightShrink);
    districts.push({
      id: i,
      name: `${kind} ${i + 1}`,
      kind,
      x,
      y,
      w,
      h,
      hue: districtHue[kind],
    });
  }

  let roadId = 0;
  for (let c = 1; c < cols; c++) {
    const x = margin + c * cellW;
    roads.push({
      id: roadId++,
      name: streetNames[c % streetNames.length],
      path: `M ${x.toFixed(1)} ${margin} L ${x.toFixed(1)} ${config.height - margin}`,
      primary: c % 2 === 0,
    });
  }
  for (let r = 1; r < rows; r++) {
    const y = margin + r * cellH;
    roads.push({
      id: roadId++,
      name: streetNames[(r + 6) % streetNames.length],
      path: `M ${margin} ${y.toFixed(1)} L ${config.width - margin} ${y.toFixed(1)}`,
      primary: r % 2 === 0,
    });
  }
  roads.push({
    id: roadId++,
    name: "Grand Processional",
    path: `M ${margin * 0.7} ${(config.height * 0.78).toFixed(1)} L ${(config.width * 0.84).toFixed(1)} ${margin * 0.72}`,
    primary: true,
  });

  const lotsPerDistrict = Math.max(
    16,
    Math.floor(config.maxBuildings / districts.length),
  );
  let buildingId = 0;
  for (const district of districts) {
    const gridX = Math.max(3, Math.floor(district.w / 45));
    const gridY = Math.max(2, Math.floor(district.h / 38));
    const lotW = district.w / gridX;
    const lotH = district.h / gridY;
    const buildChance = clamp(lotsPerDistrict / (gridX * gridY), 0.35, 0.92);

    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        if (buildings.length >= config.maxBuildings) break;
        if (rng() > buildChance) continue;

        const insetX = lotW * (0.08 + rng() * 0.2);
        const insetY = lotH * (0.1 + rng() * 0.22);
        const w = lotW - insetX * 2;
        const h = lotH - insetY * 2;
        if (w < 6 || h < 6) continue;
        const x = district.x + gx * lotW + insetX;
        const y = district.y + gy * lotH + insetY;
        const kind = randomBuildingKind(rng, district.kind);

        const residentsTarget =
          kind === "Residential"
            ? 1 + Math.floor(rng() * 6)
            : kind === "Mixed"
              ? 1 + Math.floor(rng() * 4)
              : Math.floor(rng() * 2);
        const workersTarget =
          kind === "Industrial"
            ? 3 + Math.floor(rng() * 10)
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
          address: buildingAddress(rng, district.id, buildingId + gx + gy),
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

function applyViewBox(svgEl: SVGSVGElement): void {
  const cam = cameraBySvg.get(svgEl);
  if (!cam) return;
  const vw = cam.width / cam.zoom;
  const vh = cam.height / cam.zoom;
  const x = clamp(cam.cx - vw / 2, 0, cam.width - vw);
  const y = clamp(cam.cy - vh / 2, 0, cam.height - vh);
  svgEl.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
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
  const extra = ids.length > 6 ? `<div class="town-map-hover-more">+${ids.length - 6} more</div>` : "";
  return `<div class="town-map-hover-group"><div class="town-map-hover-label">${title}</div>${rows}${extra}</div>`;
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
    <pattern id="paper-grid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#2a2118" stroke-width="0.35" opacity="0.35"></path>
    </pattern>
    <pattern id="grain-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="1" opacity="0.12"></line>
    </pattern>
    <filter id="parchment-noise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch"></feTurbulence>
      <feColorMatrix type="saturate" values="0"></feColorMatrix>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.12"></feFuncA>
      </feComponentTransfer>
    </filter>
  `;
  svgEl.appendChild(defs);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(model.width));
  bg.setAttribute("height", String(model.height));
  bg.setAttribute("class", "town-map-bg");
  svgEl.appendChild(bg);

  const paperGrid = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  paperGrid.setAttribute("x", "0");
  paperGrid.setAttribute("y", "0");
  paperGrid.setAttribute("width", String(model.width));
  paperGrid.setAttribute("height", String(model.height));
  paperGrid.setAttribute("fill", "url(#paper-grid)");
  paperGrid.setAttribute("opacity", "0.42");
  svgEl.appendChild(paperGrid);

  for (const district of model.districts) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", district.x.toFixed(1));
    rect.setAttribute("y", district.y.toFixed(1));
    rect.setAttribute("width", district.w.toFixed(1));
    rect.setAttribute("height", district.h.toFixed(1));
    rect.setAttribute("rx", "8");
    rect.setAttribute("class", `town-map-district ${districtFillClass(district.kind)}`);
    rect.setAttribute("fill", district.hue);
    rect.setAttribute("opacity", "0.34");
    svgEl.appendChild(rect);
  }

  for (const road of model.roads) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", road.path);
    path.setAttribute(
      "class",
      road.primary ? "town-map-road town-map-road-primary" : "town-map-road",
    );
    svgEl.appendChild(path);
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
    rect.setAttribute("rx", "2.5");
    rect.setAttribute("class", `town-map-building ${buildingFillClass(building.kind)}`);
    rect.dataset.buildingId = String(building.id);
    buildingsGroup.appendChild(rect);
  }

  const texture = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  texture.setAttribute("x", "0");
  texture.setAttribute("y", "0");
  texture.setAttribute("width", String(model.width));
  texture.setAttribute("height", String(model.height));
  texture.setAttribute("fill", "url(#grain-hatch)");
  texture.setAttribute("filter", "url(#parchment-noise)");
  texture.setAttribute("opacity", "0.48");
  texture.setAttribute("pointer-events", "none");
  svgEl.appendChild(texture);

  const peopleById = new Map<number, Person>(people.map((p) => [p.id, p]));
  const buildingById = new Map<number, Building>(
    model.buildings.map((b) => [b.id, b]),
  );

  legendEl.innerHTML = model.districts
    .slice(0, 6)
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
  statsEl.innerHTML = `
    <div class="town-map-stat"><span>Districts</span><strong>${model.districts.length}</strong></div>
    <div class="town-map-stat"><span>Roads</span><strong>${model.roads.length}</strong></div>
    <div class="town-map-stat"><span>Parcels</span><strong>${model.buildings.length}</strong></div>
    <div class="town-map-stat"><span>Housing Lots</span><strong>${residential}</strong></div>
    <div class="town-map-stat"><span>Work Lots</span><strong>${employment}</strong></div>
  `;

  hoverEl.innerHTML =
    '<div class="town-map-hover-empty">Hover a parcel to inspect residents and workers.</div>';

  const interactiveBuildings = svgEl.querySelectorAll<SVGRectElement>(
    ".town-map-building",
  );
  interactiveBuildings.forEach((node) => {
    node.addEventListener("mouseenter", () => {
      const id = Number(node.dataset.buildingId);
      const building = buildingById.get(id);
      if (!building) return;
      node.classList.add("active");
      hoverEl.innerHTML = `
        <h4>${building.address}</h4>
        <div class="town-map-hover-meta">${building.kind} · ${building.districtName}</div>
        ${hoverPeopleButtons("Residents", building.residents, peopleById, getPersonName)}
        ${hoverPeopleButtons("Workers", building.workers, peopleById, getPersonName)}
      `;
      hoverEl.querySelectorAll<HTMLElement>(".town-map-person-link").forEach((btn) => {
        btn.addEventListener("click", () => {
          const personId = Number(btn.dataset.personId);
          onPersonClick(personId);
        });
      });
    });
    node.addEventListener("mouseleave", () => {
      node.classList.remove("active");
    });
  });
}

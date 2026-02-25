import type { AIPersonData } from "./ai.ts";
import { MAX_ADULTS, populateAIData, relKey } from "./ai.ts";
import {
  appendToCache,
  fillFromCache,
  getCacheStats,
  mergeCache,
} from "./cache.ts";
import type { Cult } from "./cult.ts";
import {
  allCultMemberIds,
  generateCult,
  getCultMembership,
  RANK_META,
  settlementWord,
} from "./cult.ts";
import { cthulhuData } from "./data.ts";
import type { Person, Stats } from "./logic";
import {
  generateCthulhuStats,
  generatePopulation,
  mulberry32,
} from "./logic.ts";
import {
  initTownMapControls,
  renderTownMapPrototype,
} from "./map.ts";
import { GDRIVE_PHOTOS, gdUrl } from "./photos.ts";
import "./style.css";

console.info("[App] Call of Cthulhu - 1920s Town Tinkerer starting...");
console.debug(`[App] Env: ${import.meta.env.MODE}`);

// Optional import-only path for externally curated cache files.
// The app now ships with built-in databanks; this is only for adding more data.
async function importExternalCacheFromFile() {
  try {
    const resp = await fetch("/prebuilt_cache.json");
    if (resp.ok) {
      const data = (await resp.json()) as Record<string, any>;
      mergeCache(data as any);
      console.info("[App] merged optional external cache file");
    }
  } catch (e) {
    // Optional file; ignore missing/blocked fetches.
    console.debug("[App] external cache import skipped", e);
  }
}
importExternalCacheFromFile();

let malePhotosSeed: string[] = [];
let femalePhotosSeed: string[] = [];
const malePhotos = GDRIVE_PHOTOS.hommes.map(gdUrl);
const femalePhotos = GDRIVE_PHOTOS.femmes.map(gdUrl);

function shufflePhotosWithSeed(seed: number): void {
  const rng = mulberry32(seed + 999999);
  malePhotosSeed = [...malePhotos];
  femalePhotosSeed = [...femalePhotos];
  for (let i = malePhotosSeed.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [malePhotosSeed[i], malePhotosSeed[j]] = [
      malePhotosSeed[j],
      malePhotosSeed[i],
    ];
  }
  for (let i = femalePhotosSeed.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [femalePhotosSeed[i], femalePhotosSeed[j]] = [
      femalePhotosSeed[j],
      femalePhotosSeed[i],
    ];
  }
}

function getPhotoUrl(person: Person, seed: number): string | null {
  const photos = person.gender === "male" ? malePhotosSeed : femalePhotosSeed;
  if (!photos.length) return null;
  const rng = mulberry32(seed ^ (person.id * 2654435761));
  const idx = Math.floor(rng() * photos.length);
  return photos[idx];
}

let currentPopulation: {
  people: Person[];
  jobIndex: Record<string, number[]>;
} | null = null;
let currentSeed = 12345;
let totalPopulation = 1000;

// AI enrichment state
let aiData: Map<number, AIPersonData> = new Map();
let aiRels: Map<string, string> = new Map();
let aiController: AbortController | null = null;
let aiDataFromCache = false;

function getApiKey(): string {
  return (
    localStorage.getItem("openrouter_api_key") ||
    (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) ||
    ""
  );
}

function updateCacheStatus(): void {
  const statusEl = document.getElementById("aiCacheStatus");
  if (!statusEl) return;
  const stats = getCacheStats();
  const totalSecrets = stats.normal + stats.supernatural;
  if (stats.traits === 0 && totalSecrets === 0) {
    statusEl.textContent = "";
    statusEl.className = "ai-cache-status";
    return;
  }
  if (aiData.size > 0 && aiDataFromCache) {
    statusEl.textContent = `📦 ${aiData.size.toLocaleString()} characters auto-filled from cache  ·  ${stats.traits.toLocaleString()} traits  ·  ${totalSecrets.toLocaleString()} secrets stored`;
    statusEl.className = "ai-cache-status fulfilled";
  } else {
    statusEl.textContent = `📦 ${stats.traits.toLocaleString()} traits  ·  ${totalSecrets.toLocaleString()} secrets cached`;
    statusEl.className = "ai-cache-status";
  }
}

// Cult state
let currentCults: Cult[] = [];
let nextCultId = 0;
let cultSeed = 12345;

let currentJob: string | null = null;
let currentPage = 0;
const PEOPLE_PER_PAGE = 50;
let navigationHistory: any[] = [];

const popSlider = document.getElementById("popSlider") as HTMLInputElement;
const popInput = document.getElementById("popInput") as HTMLInputElement;
const seedInput = document.getElementById("seedInput") as HTMLInputElement;
const regenerateBtn = document.getElementById(
  "regenerateBtn",
) as HTMLButtonElement;
const randomSeedBtn = document.getElementById(
  "randomSeedBtn",
) as HTMLButtonElement;
const populateAiBtn = document.getElementById(
  "populateAiBtn",
) as HTMLButtonElement;
const aiSettingsBtn = document.getElementById(
  "aiSettingsBtn",
) as HTMLButtonElement;
const aiSettingsOverlay = document.getElementById(
  "aiSettingsOverlay",
) as HTMLDivElement;
const aiKeyInput = document.getElementById("aiKeyInput") as HTMLInputElement;
const aiProgressOverlay = document.getElementById(
  "aiProgressOverlay",
) as HTMLDivElement;
const aiProgressFill = document.getElementById(
  "aiProgressFill",
) as HTMLDivElement;
const aiProgressText = document.getElementById(
  "aiProgressText",
) as HTMLParagraphElement;
const categoriesEl = document.getElementById("categories") as HTMLDivElement;
const summaryEl = document.getElementById("summary") as HTMLDivElement;
const townMapSvgEl = document.getElementById(
  "townMapSvg",
) as unknown as SVGSVGElement;
const townMapLegendEl = document.getElementById(
  "townMapLegend",
) as HTMLDivElement;
const townMapStatsEl = document.getElementById("townMapStats") as HTMLDivElement;
const townMapHoverEl = document.getElementById("townMapHover") as HTMLDivElement;
const townMapScaleEl = document.getElementById(
  "townMapScale",
) as HTMLSpanElement;
const mapZoomInBtn = document.getElementById("mapZoomIn") as HTMLButtonElement;
const mapZoomOutBtn = document.getElementById(
  "mapZoomOut",
) as HTMLButtonElement;
const mapZoomResetBtn = document.getElementById(
  "mapZoomReset",
) as HTMLButtonElement;
const generatingEl = document.getElementById("generating") as HTMLDivElement;
const progressFill = document.getElementById("progressFill") as HTMLDivElement;
const progressText = document.getElementById(
  "progressText",
) as HTMLParagraphElement;
const modalOverlay = document.getElementById("modalOverlay") as HTMLDivElement;
const modal = document.getElementById("modal") as HTMLDivElement;
const createCultBtn = document.getElementById(
  "createCultBtn",
) as HTMLButtonElement;

initTownMapControls(townMapSvgEl, mapZoomInBtn, mapZoomOutBtn, mapZoomResetBtn);

/** Update the settlement-type word in the page title based on population. */
function updateTitleWord(population: number): void {
  const titleEl = document.getElementById("title");
  if (!titleEl) return;
  const word = settlementWord(population);
  titleEl.textContent = `🐙 Call of Cthulhu — 1920s ${word} Tinkerer`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString("en-US");
}

function getPersonName(p: Person): string {
  const fn =
    p.gender === "male"
      ? cthulhuData.firstNamesMale
      : cthulhuData.firstNamesFemale;
  return fn[p.firstNameIdx] + " " + cthulhuData.lastNames[p.lastNameIdx];
}

function makeAvatarHtml(person: Person, _size = 48, isLarge = false): string {
  const emoji = person.gender === "male" ? "👨" : "👩";
  const cls = isLarge ? "person-avatar-large" : "person-avatar";
  const placeholderCls = isLarge
    ? "person-avatar-placeholder-large"
    : "person-avatar-placeholder";
  const url = getPhotoUrl(person, currentSeed);
  if (!url) {
    return `<div class="${placeholderCls}">${emoji}</div>`;
  }
  const fallback = `<div class="${placeholderCls}">${emoji}</div>`;
  // No crossorigin attribute — lets the browser send cookies (needed for
  // Google-account-gated Drive files) and avoids CORS-mode failures in the
  // browser when the cached image was stored without CORS headers.
  return `<img src="${url}" class="${cls}" alt="" loading="lazy" onerror="this.outerHTML='${fallback.replace(/"/g, "&quot;")}'">`;
}

function formatStatsForFoundry(person: Person, stats: Stats): string {
  // Strict sheet format required by Foundry VTT import.
  const name = getPersonName(person);
  let text = `${name}, age ${person.age}\n`;

  // primary stats on two lines
  text += `STR ${stats.STR} CON ${stats.CON} SIZ ${stats.SIZ} DEX ${stats.DEX} APP ${stats.APP} INT ${stats.INT}\n`;
  text += `POW ${stats.POW} EDU ${stats.EDU} SAN ${stats.SAN} HP ${stats.HP} DB: ${
    stats.DB || "Aucun"
  }\n`;
  text += `Build: ${stats.Build} Move: ${stats.MOV} MP: ${stats.MP} Luck: ${stats.Luck}\n\n`;

  // combat section: attacks and dodge values with half/quarter breakdown
  text += `Combat\n`;
  for (const attack of stats.Attacks) {
    // attack strings come like "Fist (1D3+1)" or "Club (1D6)" etc
    const m = attack.match(/^(.*?) \((.*)\)$/);
    let skillName = attack;
    let damageInfo = "";
    if (m) {
      skillName = m[1];
      damageInfo = m[2];
    }
    const skillVal = stats.Skills[skillName] || 0;
    const half = Math.floor(skillVal / 2);
    const quarter = Math.floor(skillVal / 4);
    text += `${skillName} ${skillVal}% (${half}/${quarter})`;
    if (damageInfo) {
      text += `, damage ${damageInfo}`;
    }
    text += `\n`;
  }
  const dodge = stats.Dodge;
  const dodgeHalf = Math.floor(dodge / 2);
  const dodgeQuarter = Math.floor(dodge / 4);
  text += `Dodge ${dodge}% (${dodgeHalf}/${dodgeQuarter})\n\n`;

  // skills section separates languages from others
  const entries = Object.entries(stats.Skills);
  const langEntries = entries.filter(
    ([n]) => /language/i.test(n) || n === "Own Language",
  );
  const otherEntries = entries.filter(
    ([n]) => !(/language/i.test(n) || n === "Own Language"),
  );
  if (otherEntries.length > 0) {
    // alphabetical for consistent ordering
    otherEntries.sort((a, b) => a[0].localeCompare(b[0]));
    text += `Skills\n`;
    text += otherEntries.map(([n, v]) => `${n} ${v}%`).join(`, `);
    text += `\n`;
  }
  if (langEntries.length > 0) {
    langEntries.sort((a, b) => a[0].localeCompare(b[0]));
    text += `Languages: `;
    text += langEntries.map(([n, v]) => `${n} ${v}%`).join(`, `);
    text += `.`;
  }

  return text;
}

function renderCategories() {
  if (!currentPopulation) return;
  const { jobIndex } = currentPopulation;

  categoriesEl.innerHTML = "";
  for (const [, category] of Object.entries(cthulhuData.jobs)) {
    const catEl = document.createElement("div");
    catEl.className = "category";
    let jobsHtml = "";
    const sortedJobs = [...category.jobs].sort(
      (a, b) =>
        (jobIndex[b.name]?.length || 0) - (jobIndex[a.name]?.length || 0),
    );

    for (const job of sortedJobs) {
      const count = jobIndex[job.name]?.length || 0;
      const active = totalPopulation >= job.threshold;
      if (!active && count === 0) continue;

      const displayName = job.name;
      const displayThreshold = formatNumber(job.threshold);
      jobsHtml += `<div class="job ${active && count > 0 ? "" : "inactive"}" data-job="${job.name}" title="${job.name} — found in settlements of ${displayThreshold}+ people">
        <span class="job-name"><span>${job.icon}</span><span>${displayName}</span></span>
        <span class="job-count">${formatNumber(count)}</span>
      </div>`;
    }

    if (!jobsHtml) continue;

    catEl.innerHTML = `<h2 style="border-color: ${category.color}; color: ${category.color};">${category.name}</h2>${jobsHtml}`;
    catEl.querySelectorAll(".job:not(.inactive)").forEach((jobEl) => {
      jobEl.addEventListener("click", () => {
        const jobName = (jobEl as HTMLElement).dataset.job!;
        const ids = jobIndex[jobName];
        if (ids && ids.length > 0) openModal(jobName);
      });
    });
    categoriesEl.appendChild(catEl);
  }

  const children = jobIndex["Child"]?.length || 0;
  const elders = jobIndex["Retiree"]?.length || 0;

  summaryEl.innerHTML = `
    <div class="summary-item"><div class="value">${formatNumber(totalPopulation)}</div><div class="label">Population</div></div>
    <div class="summary-item"><div class="value">${formatNumber(children)}</div><div class="label">Children</div></div>
    <div class="summary-item"><div class="value">${formatNumber(totalPopulation - children - elders)}</div><div class="label">Adults</div></div>
    <div class="summary-item"><div class="value">${formatNumber(elders)}</div><div class="label">Retirees</div></div>
    <div class="summary-item"><div class="value">${Object.keys(jobIndex).length}</div><div class="label">Jobs</div></div>
  `;
}

function openModal(jobName: string) {
  currentJob = jobName;
  currentPage = 0;
  navigationHistory = [{ type: "list", job: jobName }];
  modalOverlay.classList.add("active");
  renderJobList();
}

function openPersonFromMap(personId: number): void {
  navigationHistory = [{ type: "detail", personId }];
  modalOverlay.classList.add("active");
  showPersonDetail(personId);
}

function closeModal() {
  modalOverlay.classList.remove("active");
  currentJob = null;
  navigationHistory = [];
}

function renderJobList() {
  if (!currentPopulation || !currentJob) return;
  const { people, jobIndex } = currentPopulation;
  const ids = jobIndex[currentJob] || [];
  const totalPages = Math.ceil(ids.length / PEOPLE_PER_PAGE);
  const start = currentPage * PEOPLE_PER_PAGE;
  const end = Math.min(start + PEOPLE_PER_PAGE, ids.length);

  let peopleHtml = "";
  for (let i = start; i < end; i++) {
    const p = people[ids[i]];
    const name = getPersonName(p);
    const relations = [];
    if (p.spouseId !== null) {
      const sp = people[p.spouseId];
      const spName =
        sp.gender === "female"
          ? cthulhuData.firstNamesFemale[sp.firstNameIdx]
          : cthulhuData.firstNamesMale[sp.firstNameIdx];
      relations.push(
        `💑 ${spName}${p.isGay ? ' <span class="badge-gay">🏳️‍🌈</span>' : ""}`,
      );
    }
    if (p.childrenIds.length > 0) relations.push(`👶 ${p.childrenIds.length}`);
    const gayBadge =
      p.isGay && p.spouseId === null
        ? ' <span class="badge-gay">🏳️‍🌈</span>'
        : "";
    const cultMembership = getCultMembership(currentCults, p.id);
    const cultEmoji = cultMembership
      ? ` <span class="cult-member-badge" title="Member of ${cultMembership.cult.name}">⚗</span>`
      : "";

    const aiPersonData = aiData.get(p.id);
    const genderGlyph =
      p.job === "Child"
        ? p.gender === "male"
          ? "👦"
          : "👧"
        : p.gender === "male"
          ? "♂"
          : "♀";
    peopleHtml += `<div class="person-card ${p.gender}${p.isGay ? " gay" : ""}" data-person-id="${p.id}">
      ${makeAvatarHtml(p, 48, false)}
      <div class="person-info">
        <div class="person-name">${genderGlyph} ${name}${gayBadge}${cultEmoji}<span class="person-age">, ${p.age} y.o.</span></div>
        ${aiPersonData ? `<div class="person-traits">${aiPersonData.traits}</div>` : ""}
        ${relations.length > 0 ? `<div class="person-relations">${relations.join(" • ")}</div>` : ""}
      </div>
    </div>`;
  }

  let jobIcon = "👤";
  for (const cat of Object.values(cthulhuData.jobs)) {
    const found = cat.jobs.find((j) => j.name === currentJob);
    if (found) {
      jobIcon = found.icon;
      break;
    }
  }

  modal.innerHTML = `
    <div class="modal-header">
      <h2>${jobIcon} ${currentJob} (${formatNumber(ids.length)})</h2>
      <button class="modal-close" id="closeModal">&times;</button>
    </div>
    <div class="people-list">${peopleHtml}</div>
    ${
      totalPages > 1
        ? `
      <div class="pagination">
        <button id="prevPage" ${currentPage === 0 ? "disabled" : ""}>◀ Previous</button>
        <span>Page ${currentPage + 1} / ${formatNumber(totalPages)}</span>
        <button id="nextPage" ${currentPage >= totalPages - 1 ? "disabled" : ""}>Next ▶</button>
      </div>
    `
        : ""
    }
  `;

  document.getElementById("closeModal")?.addEventListener("click", closeModal);
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      renderJobList();
    }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderJobList();
    }
  });

  modal.querySelectorAll(".person-card").forEach((card) => {
    card.addEventListener("click", () => {
      const pid = parseInt((card as HTMLElement).dataset.personId!);
      navigationHistory.push({ type: "detail", personId: pid });
      showPersonDetail(pid);
    });
  });
}

function showPersonDetail(personId: number) {
  if (!currentPopulation) return;
  const { people } = currentPopulation;
  const person = people[personId];
  if (!person) return;

  const name = getPersonName(person);
  let statsHtml = "";

  if (person.job !== "Child") {
    const rng = mulberry32(currentSeed + personId * 9973);
    const stats = generateCthulhuStats(person, rng);
    const foundryText = formatStatsForFoundry(person, stats);
    statsHtml = `
      <div class="family-section">
        <div class="sheet-header">
          <h4>📊 Cthulhu Sheet</h4>
          <button class="copy-btn" id="copyBtn">📋 Copy for Foundry VTT</button>
        </div>
        <div class="stats-sheet" id="statsSheet">${foundryText}</div>
      </div>
    `;
  }

  let familyHtml = "";
  if (person.spouseId !== null) {
    const spouse = people[person.spouseId];
    const spouseGayBadge = person.isGay ? " 🏳️‍🌈" : "";
    const spouseTone = aiRels.get(relKey(person.id, spouse.id));
    const spouseToneHtml = spouseTone
      ? ` <span class="rel-tone">${spouseTone}</span>`
      : "";
    familyHtml += `
      <div class="family-section">
        <h4>💑 Spouse${spouseGayBadge}</h4>
        <div class="family-members">
          <div class="family-member" data-person-id="${spouse.id}">
            ${spouse.gender === "male" ? "👨" : "👩"} ${getPersonName(spouse)}
            <span class="relation-type">(${spouse.age} y.o., ${spouse.job || "None"})</span>${spouseToneHtml}
          </div>
        </div>
      </div>
    `;
  }

  if (person.parentIds.length > 0) {
    const parentsHtml = person.parentIds
      .map((id) => {
        const p = people[id];
        const tone = aiRels.get(relKey(person.id, p.id));
        const toneHtml = tone ? ` <span class="rel-tone">${tone}</span>` : "";
        return `<div class="family-member" data-person-id="${p.id}">${p.gender === "male" ? "👨" : "👩"} ${getPersonName(p)} <span class="relation-type">(${p.age} y.o., ${p.job || "None"})</span>${toneHtml}</div>`;
      })
      .join("");
    familyHtml += `<div class="family-section"><h4>👨‍👩‍👦 Parents</h4><div class="family-members">${parentsHtml}</div></div>`;
  }

  if (person.siblingIds.length > 0) {
    const siblingsHtml = person.siblingIds
      .map((id) => {
        const s = people[id];
        const tone = aiRels.get(relKey(person.id, s.id));
        const toneHtml = tone ? ` <span class="rel-tone">${tone}</span>` : "";
        return `<div class="family-member" data-person-id="${s.id}">${s.gender === "male" ? "👨" : "👩"} ${getPersonName(s)} <span class="relation-type">(${s.age} y.o., ${s.job || "None"})</span>${toneHtml}</div>`;
      })
      .join("");
    familyHtml += `<div class="family-section"><h4>👫 Siblings</h4><div class="family-members">${siblingsHtml}</div></div>`;
  }

  if (person.childrenIds.length > 0) {
    const childrenHtml = person.childrenIds
      .map((id) => {
        const c = people[id];
        const tone = aiRels.get(relKey(person.id, c.id));
        const toneHtml = tone ? ` <span class="rel-tone">${tone}</span>` : "";
        return `<div class="family-member" data-person-id="${c.id}">${c.gender === "male" ? "👦" : "👧"} ${getPersonName(c)} <span class="relation-type">(${c.age} y.o., ${c.job || "None"})</span>${toneHtml}</div>`;
      })
      .join("");
    familyHtml += `<div class="family-section"><h4>👶 Children</h4><div class="family-members">${childrenHtml}</div></div>`;
  }

  if (!familyHtml && !statsHtml) {
    familyHtml = `<p style="color: #888; margin-top: 1rem;">Single with no known family</p>`;
  }

  let jobIcon = "👤";
  for (const cat of Object.values(cthulhuData.jobs)) {
    const found = cat.jobs.find((j) => j.name === person.job);
    if (found) {
      jobIcon = found.icon;
      break;
    }
  }

  const gayBadge = person.isGay ? ' <span class="badge-gay">🏳️‍🌈</span>' : "";
  const genderLabel = person.gender === "male" ? "Male" : "Female";

  modal.innerHTML = `
    <div class="modal-header">
      <h2>${person.gender === "male" ? "👨" : "👩"} ${name}${gayBadge}</h2>
      <button class="modal-close" id="closeModal">&times;</button>
    </div>
    <button class="back-btn" id="backBtn">← Back</button>
    <div class="person-detail">
      <div class="person-detail-header">
        ${makeAvatarHtml(person, 100, true)}
        <div class="info">
          <div class="info-primary">
            <strong>Age:</strong> ${person.age} y.o.<br>
            <strong>Job:</strong> ${jobIcon} ${person.job || "None"}<br>
            <strong>Family:</strong> ${cthulhuData.lastNames[person.lastNameIdx]}<br>
            <strong>Gender:</strong> ${genderLabel}${person.isGay ? " 🏳️\u200d🌈" : ""}
          </div>
          ${(() => {
            const ai = aiData.get(person.id);
            if (!ai) return "";
            const extras =
              ai.extraSecrets
                ?.map((s) => `<span class="ai-inline-secret">🔒 ${s}</span>`)
                .join("") ?? "";
            const secretHtml = ai.secret
              ? `<span class="ai-inline-secret">🔒 ${ai.secret}</span>`
              : "";
            return `<div class="info-secondary"><span class="ai-inline-traits">${ai.traits}</span>${secretHtml}${extras}</div>`;
          })()}
        </div>
      </div>
      ${(() => {
        const membership = getCultMembership(currentCults, person.id);
        if (!membership) return "";
        const { cult, member } = membership;
        const rankMeta = RANK_META[member.rank];
        const contactsHtml = member.contacts
          .map((cid) => {
            const cp = people[cid];
            if (!cp) return "";
            const cm = cult.members.find((m) => m.personId === cid)!;
            const cmMeta = RANK_META[cm.rank];
            return `<div class="family-member" data-person-id="${cid}">${cmMeta.emoji} ${getPersonName(cp)} <span class="relation-type">(${cm.rank})</span></div>`;
          })
          .join("");
        return `<div class="ai-character-section" style="display:block">
          <h4>⛧ ${cult.name}</h4>
          <div class="cult-modal-rank">${rankMeta.emoji} <strong>${member.rank}</strong> — ${rankMeta.description}</div>
          <div class="cult-modal-flavour">${cult.flavour}</div>
          ${member.contacts.length > 0 ? `<div class="family-section" style="margin-top:0.8rem"><h4>🔗 Known members</h4><div class="family-members">${contactsHtml}</div></div>` : ""}
        </div>`;
      })()}
      ${statsHtml}
      ${familyHtml}
    </div>
  `;

  document.getElementById("closeModal")?.addEventListener("click", closeModal);
  document.getElementById("backBtn")?.addEventListener("click", () => {
    navigationHistory.pop();
    const prev = navigationHistory[navigationHistory.length - 1];
    if (prev.type === "list") renderJobList();
    else showPersonDetail(prev.personId);
  });

  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const statsSheet = document.getElementById("statsSheet");
      if (statsSheet) {
        navigator.clipboard.writeText(statsSheet.textContent || "").then(() => {
          copyBtn.textContent = "✅ Copied!";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = "📋 Copy for Foundry VTT";
            copyBtn.classList.remove("copied");
          }, 2000);
        });
      }
    });
  }

  modal.querySelectorAll(".family-member").forEach((member) => {
    member.addEventListener("click", () => {
      const pid = parseInt((member as HTMLElement).dataset.personId!);
      navigationHistory.push({ type: "detail", personId: pid });
      showPersonDetail(pid);
    });
  });
}

async function doGenerate() {
  // Clear AI data and cults whenever the population is regenerated
  aiData = new Map();
  aiRels = new Map();
  aiDataFromCache = false;
  currentCults = [];
  nextCultId = 0;
  cultSeed = currentSeed;
  renderCults();

  generatingEl.classList.add("active");
  shufflePhotosWithSeed(currentSeed);

  try {
    currentPopulation = await generatePopulation(
      totalPopulation,
      currentSeed,
      async (text, percent) => {
        progressText.textContent = text;
        progressFill.style.width = `${percent}%`;
        await new Promise((r) => setTimeout(r, 10));
      },
    );

    // Auto-fill from cache before rendering so cards show traits immediately
    const cached = fillFromCache(
      currentPopulation.people,
      currentSeed,
      MAX_ADULTS,
    );
    if (cached) {
      aiData = cached;
      aiDataFromCache = true;
    } else {
      // fallback: give every adult a basic secret drawn from the cult normal
      // pool so the UI never shows huge swaths of blank characters when the
      // cache is too small or AI hasn't been run yet.  This intentionally
      // reuses CULT_NORMAL_SECRETS; the entries are mundane enough and help
      // maintain atmosphere.
      aiData = new Map();
      const adults = currentPopulation.people
        .filter((p) => p.job !== "Child")
        .slice(0, MAX_ADULTS);
      const tmpRng = mulberry32(currentSeed ^ 0xabcdef);
      for (const p of adults) {
        const secret =
          CULT_NORMAL_SECRETS[
            Math.floor(tmpRng() * CULT_NORMAL_SECRETS.length)
          ];
        aiData.set(p.id, { traits: "", secret, extraSecrets: [] });
      }
    }

    renderCategories();
    renderTownMapPrototype({
      svgEl: townMapSvgEl,
      legendEl: townMapLegendEl,
      statsEl: townMapStatsEl,
      hoverEl: townMapHoverEl,
      scaleEl: townMapScaleEl,
      population: totalPopulation,
      seed: currentSeed,
      people: currentPopulation.people,
      getPersonName,
      onPersonClick: openPersonFromMap,
    });
    updateCacheStatus();
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => {
      generatingEl.classList.remove("active");
      progressFill.style.width = "0%";
    }, 500);
  }
}

// ── Cult secrets enrichment ──────────────────────────────────────────────────

/**
 * Apply extra secrets to cult members via the aiData map.
 * - Hierophant: +1 supernatural secret drawn from the cache/pool
 * - Archons/Acolytes: +1 normal secret
 * - Initiates: 50% chance +1 normal secret
 *
 * We append directly to the AIPersonData already in aiData.
 * If the person has no AI data yet we create a stub with empty traits/secret.
 */
function enrichCultSecrets(cult: Cult): void {
  for (const m of cult.members) {
    let data = aiData.get(m.personId);
    if (!data) {
      // No AI data yet — create a minimal placeholder so secrets are visible
      data = { traits: "", secret: "", extraSecrets: [] };
      aiData.set(m.personId, data);
    }
    if (!data.extraSecrets) data.extraSecrets = [];

    const rng = mulberry32(currentSeed ^ (m.personId * 0xbaba5678));

    // if the person has no primary secret yet, give one now so the slot
    // in the UI is never blank (fixes empty‑secret bug)
    if (!data.secret) {
      const base =
        CULT_NORMAL_SECRETS[Math.floor(rng() * CULT_NORMAL_SECRETS.length)];
      data.secret = `⚗ ${base}`;
    }

    if (m.rank === "Hierophant") {
      // Draw a supernatural secret from a small built-in pool
      const supExtra =
        CULT_SUPERNATURAL_SECRETS[
          Math.floor(rng() * CULT_SUPERNATURAL_SECRETS.length)
        ];
      data.extraSecrets.push(`⛧ ${supExtra}`);
    } else if (m.rank === "Archon" || m.rank === "Acolyte") {
      const normalExtra =
        CULT_NORMAL_SECRETS[Math.floor(rng() * CULT_NORMAL_SECRETS.length)];
      data.extraSecrets.push(`⛧ ${normalExtra}`);
    } else {
      // Initiate: 50% chance
      if (rng() < 0.5) {
        const normalExtra =
          CULT_NORMAL_SECRETS[Math.floor(rng() * CULT_NORMAL_SECRETS.length)];
        data.extraSecrets.push(`⛧ ${normalExtra}`);
      }
    }
  }
}

/** Supernatural secrets specific to cult leadership. */
const CULT_SUPERNATURAL_SECRETS = [
  "Performs the Rite of Dreaming nightly to receive visions",
  "Has heard the true name of the god beneath the harbour",
  "Carries a bound servitor in a sealed silver case",
  "Has gazed into the Shining Trapezohedron and survived",
  "Dictated passages of the Necronomicon from memory",
  "Has crossed the boundary of sleep and not fully returned",
  "Receives instructions from an entity in the space between stars",
  "Completed the Thirteenth Rite and carries the mark",
  "Conversed with a Deep One in the tidal caves",
  "Knows the location of a gate and how to open it",
  "Was briefly possessed and remembers what the god saw",
  "Trades secrets with a thing that wears a dead man's face",
];

/** Normal secrets specific to cult membership. */
const CULT_NORMAL_SECRETS = [
  "Procures sacrificial materials through an unwitting fence",
  "Maintains a coded ledger of cult payments and favours",
  "Recruited a new member without the leader's blessing",
  "Carries blasphemous literature hidden in a prayer book",
  "Has witnessed a rite that cannot be unseen",
  "Supplies the cult's meeting house in exchange for protection",
  "Must deliver a package monthly to a man in the waterfront",
  "Agreed to dispose of a body — and did",
  "Stole a minor relic for the cult against a member's wishes",
  "Burns a coded candle in the window each full moon",
  "Has been assigned to watch a specific townsperson",
  "Passes coded messages via the classifieds column",
  "Stores forbidden objects in a rented storage room",
  "Was blackmailed into joining and now believes in the cause",
  "Photographs police movements for the cult's use",
];

// ── Cult rendering ────────────────────────────────────────────────────────────

const cultsContainerEl = document.getElementById(
  "cultsContainer",
) as HTMLDivElement;

function renderCults(): void {
  if (!currentPopulation) return;
  const { people } = currentPopulation;

  if (currentCults.length === 0) {
    cultsContainerEl.innerHTML = "";
    cultsContainerEl.style.display = "none";
    return;
  }

  cultsContainerEl.style.display = "block";
  cultsContainerEl.innerHTML = currentCults
    .map((cult) => {
      const byRank = new Map<string, number[]>();
      for (const m of cult.members) {
        if (!byRank.has(m.rank)) byRank.set(m.rank, []);
        byRank.get(m.rank)!.push(m.personId);
      }

      const rankSections = (
        ["Hierophant", "Archon", "Acolyte", "Initiate"] as const
      )
        .filter((r) => byRank.has(r))
        .map((rank) => {
          const meta = RANK_META[rank];
          const pills = byRank
            .get(rank)!
            .map((pid) => {
              const p = people[pid];
              if (!p) return "";
              const name = getPersonName(p);
              const genderGlyph = p.gender === "male" ? "♂" : "♀";
              return `<span class="cult-pill cult-pill-${rank.toLowerCase()}" data-person-id="${pid}" title="${rank}">${meta.emoji}${genderGlyph} ${name}</span>`;
            })
            .join("");
          return `<div class="cult-rank-row"><span class="cult-rank-label">${meta.emoji} ${meta.plural}</span>${pills}</div>`;
        })
        .join("");

      return `<div class="cult-card">
        <div class="cult-header">
          <span class="cult-name">⛧ ${cult.name}</span>
          <span class="cult-size">${cult.members.length} members</span>
        </div>
        <div class="cult-flavour">${cult.flavour}</div>
        ${rankSections}
      </div>`;
    })
    .join("");

  // Pills are clickable — open person modal
  cultsContainerEl.querySelectorAll(".cult-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const pid = parseInt((pill as HTMLElement).dataset.personId!);
      navigationHistory = [{ type: "detail", personId: pid }];
      modalOverlay.classList.add("active");
      showPersonDetail(pid);
    });
  });
}

// Slider logic
function sliderToPopulation(val: number) {
  if (val <= 500) return val * 10;
  return 5000 + (val - 500) * 9900;
}
function populationToSlider(pop: number) {
  if (pop <= 5000) return Math.round(pop / 10);
  return 500 + Math.round((pop - 5000) / 9900);
}

let generateTimeout: any = null;

popSlider.addEventListener("input", (e) => {
  const val = parseInt((e.target as HTMLInputElement).value);
  totalPopulation = sliderToPopulation(val);
  popInput.value = totalPopulation.toString();
  updateTitleWord(totalPopulation);
  clearTimeout(generateTimeout);
  generateTimeout = setTimeout(() => doGenerate(), 300);
});

popInput.addEventListener("input", (e) => {
  let pop = parseInt((e.target as HTMLInputElement).value) || 1;
  pop = Math.max(1, Math.min(5000000, pop));
  totalPopulation = pop;
  popSlider.value = populationToSlider(pop).toString();
  updateTitleWord(totalPopulation);
  clearTimeout(generateTimeout);
  generateTimeout = setTimeout(() => doGenerate(), 500);
});

popInput.addEventListener("blur", (e) => {
  let pop = parseInt((e.target as HTMLInputElement).value) || 1;
  (e.target as HTMLInputElement).value = Math.max(
    1,
    Math.min(5000000, pop),
  ).toString();
});

regenerateBtn.addEventListener("click", () => {
  currentSeed = parseInt(seedInput.value) || 12345;
  doGenerate();
});

randomSeedBtn.addEventListener("click", () => {
  currentSeed = Math.floor(Math.random() * 1000000);
  seedInput.value = currentSeed.toString();
  doGenerate();
});

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ── AI settings modal ────────────────────────────────────────────────────
function closeAiSettings(): void {
  aiKeyInput.value = ""; // never leave key text in the DOM
  aiSettingsOverlay.classList.remove("active");
}

aiSettingsBtn.addEventListener("click", () => {
  aiKeyInput.value = ""; // never pre-fill with the stored key
  aiKeyInput.placeholder = localStorage.getItem("openrouter_api_key")
    ? "Key saved — enter a new key to replace"
    : "sk-or-v1-…";
  aiSettingsOverlay.classList.add("active");
  setTimeout(() => aiKeyInput.focus(), 50);
});
document.getElementById("aiKeySaveBtn")?.addEventListener("click", () => {
  const key = aiKeyInput.value.trim();
  if (key) localStorage.setItem("openrouter_api_key", key);
  closeAiSettings();
});
document.getElementById("aiKeyRemoveBtn")?.addEventListener("click", () => {
  localStorage.removeItem("openrouter_api_key");
  closeAiSettings();
});
document
  .getElementById("aiKeyCancelBtn")
  ?.addEventListener("click", closeAiSettings);
aiSettingsOverlay.addEventListener("click", (e) => {
  if (e.target === aiSettingsOverlay) closeAiSettings();
});

// ── Populate AI Data button ───────────────────────────────────────────────
populateAiBtn.addEventListener("click", async () => {
  if (!currentPopulation) {
    console.warn(
      "[App] populateAiBtn clicked but no currentPopulation exists.",
    );
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[App] No API key found. Opening settings.");
    aiKeyInput.value = "";
    aiSettingsOverlay.classList.add("active");
    return;
  }

  console.info("[App] Initializing AI population data...");
  aiController = new AbortController();
  aiProgressFill.style.width = "0%";
  aiProgressText.textContent = "Starting…";
  aiProgressOverlay.classList.add("active");
  populateAiBtn.disabled = true;

  try {
    const result = await populateAIData(
      currentPopulation.people,
      currentSeed,
      getPersonName,
      apiKey,
      (done, total, status) => {
        const pct = total > 0 ? (done / total) * 100 : 0;
        aiProgressFill.style.width = `${pct}%`;
        aiProgressText.textContent = status;
        console.debug(
          `[App] AI Progress: ${done}/${total} (${pct.toFixed(1)}%) - ${status}`,
        );
      },
      aiController.signal,
    );

    console.info(
      `[App] AI Data generation complete. ${result.people.size} people, ${result.rels.size} rels.`,
    );
    aiData = result.people;
    aiRels = result.rels;

    // Persist newly generated traits and secrets to the growing cache
    const { traitsAdded, secretsAdded } = appendToCache(result);
    aiDataFromCache = false;
    updateCacheStatus();
    console.info(
      `[App] AI cache updated: +${traitsAdded} traits, +${secretsAdded} secrets.`,
    );

    aiProgressFill.style.width = "100%";
    aiProgressText.textContent = `✅ Done — ${aiData.size} characters enriched.`;
    setTimeout(() => {
      console.debug("[App] Closing AI progress overlay.");
      aiProgressOverlay.classList.remove("active");
    }, 1800);
  } catch (e) {
    const err = e as Error;
    console.error("[App] AI data population failed:", err);
    if (err.name === "AbortError") {
      aiProgressText.textContent = "Cancelled.";
    } else {
      aiProgressText.textContent = `❌ ${err.message}`;
    }
    setTimeout(() => aiProgressOverlay.classList.remove("active"), 3500);
  } finally {
    populateAiBtn.disabled = false;
    aiController = null;
    console.debug("[App] AI population process finished.");
  }
});

document.getElementById("aiCancelBtn")?.addEventListener("click", () => {
  aiController?.abort();
});

// ── Create Cult button ────────────────────────────────────────────────────────
createCultBtn.addEventListener("click", () => {
  if (!currentPopulation) return;
  const adults = currentPopulation.people.filter((p) => p.job !== "Child");
  const excluded = allCultMemberIds(currentCults);
  const newCult = generateCult(
    nextCultId,
    adults,
    excluded,
    totalPopulation,
    cultSeed + nextCultId * 77,
  );
  if (newCult) {
    currentCults.push(newCult);
    nextCultId++;
    enrichCultSecrets(newCult);
    renderCults();
  }
});

// Initial generation
currentSeed = parseInt(seedInput.value) || 12345;
totalPopulation = parseInt(popInput.value) || 1000;
updateTitleWord(totalPopulation);
doGenerate();

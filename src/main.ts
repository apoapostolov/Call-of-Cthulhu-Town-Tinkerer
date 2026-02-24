import './style.css';
import { generatePopulation, generateCthulhuStats, mulberry32 } from './logic';
import type { Person, Stats } from './logic';
import { cthulhuData } from './data';

let currentPopulation: { people: Person[]; jobIndex: Record<string, number[]> } | null = null;
let currentSeed = 12345;
let totalPopulation = 1000;

let currentJob: string | null = null;
let currentPage = 0;
const PEOPLE_PER_PAGE = 50;
let navigationHistory: any[] = [];

const popSlider = document.getElementById('popSlider') as HTMLInputElement;
const popInput = document.getElementById('popInput') as HTMLInputElement;
const seedInput = document.getElementById('seedInput') as HTMLInputElement;
const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
const randomSeedBtn = document.getElementById('randomSeedBtn') as HTMLButtonElement;
const categoriesEl = document.getElementById('categories') as HTMLDivElement;
const summaryEl = document.getElementById('summary') as HTMLDivElement;
const generatingEl = document.getElementById('generating') as HTMLDivElement;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;
const progressText = document.getElementById('progressText') as HTMLParagraphElement;
const modalOverlay = document.getElementById('modalOverlay') as HTMLDivElement;
const modal = document.getElementById('modal') as HTMLDivElement;

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString("en-US");
}

function getPersonName(p: Person): string {
  const fn = p.gender === "male" ? cthulhuData.firstNamesMale : cthulhuData.firstNamesFemale;
  return fn[p.firstNameIdx] + " " + cthulhuData.lastNames[p.lastNameIdx];
}

function makeAvatarHtml(person: Person, _size = 48, isLarge = false): string {
  const emoji = person.gender === "male" ? "👨" : "👩";
  const placeholderCls = isLarge ? "person-avatar-placeholder-large" : "person-avatar-placeholder";
  return `<div class="${placeholderCls}">${emoji}</div>`;
}

function formatStatsForFoundry(person: Person, stats: Stats): string {
  let text = `Name: ${getPersonName(person)}\n`;
  text += `Age: ${person.age} | Job: ${person.job || 'None'}\n`;
  text += `STR: ${stats.STR} | CON: ${stats.CON} | SIZ: ${stats.SIZ} | DEX: ${stats.DEX} | APP: ${stats.APP}\n`;
  text += `INT: ${stats.INT} | POW: ${stats.POW} | EDU: ${stats.EDU} | SAN: ${stats.SAN}\n`;
  text += `HP: ${stats.HP} | MP: ${stats.MP} | Luck: ${stats.Luck}\n`;
  text += `DB: ${stats.DB} | Build: ${stats.Build} | MOV: ${stats.MOV} | Dodge: ${stats.Dodge}\n\n`;
  
  if (Object.keys(stats.Skills).length > 0) {
    text += `Skills:\n`;
    for (const [skill, val] of Object.entries(stats.Skills)) {
      text += `- ${skill}: ${val}%\n`;
    }
    text += `\n`;
  }
  
  if (stats.Attacks.length > 0) {
    text += `Attacks:\n`;
    for (const attack of stats.Attacks) {
      text += `- ${attack}\n`;
    }
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
      (a, b) => (jobIndex[b.name]?.length || 0) - (jobIndex[a.name]?.length || 0)
    );
    
    for (const job of sortedJobs) {
      const count = jobIndex[job.name]?.length || 0;
      const active = totalPopulation >= job.threshold;
      if (!active && count === 0) continue;
      
      const displayName = job.name;
      const displayThreshold = formatNumber(job.threshold);
      jobsHtml += `<div class="job ${active && count > 0 ? "" : "inactive"}" data-job="${job.name}">
        <span class="job-name"><span>${job.icon}</span><span>${displayName}</span><span class="threshold">(${displayThreshold}+)</span></span>
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
      const spName = sp.gender === "female" ? cthulhuData.firstNamesFemale[sp.firstNameIdx] : cthulhuData.firstNamesMale[sp.firstNameIdx];
      relations.push(`💑 ${spName}${p.isGay ? ' <span class="badge-gay">🏳️‍🌈</span>' : ""}`);
    }
    if (p.childrenIds.length > 0) relations.push(`👶 ${p.childrenIds.length}`);
    const gayBadge = p.isGay && p.spouseId === null ? ' <span class="badge-gay">🏳️‍🌈</span>' : "";
    
    peopleHtml += `<div class="person-card ${p.gender}${p.isGay ? " gay" : ""}" data-person-id="${p.id}">
      ${makeAvatarHtml(p, 48, false)}
      <div class="person-info">
        <div class="person-name">${name}${gayBadge}</div>
        <div class="person-age">${p.age} y.o.</div>
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
    ${totalPages > 1 ? `
      <div class="pagination">
        <button id="prevPage" ${currentPage === 0 ? "disabled" : ""}>◀ Previous</button>
        <span>Page ${currentPage + 1} / ${formatNumber(totalPages)}</span>
        <button id="nextPage" ${currentPage >= totalPages - 1 ? "disabled" : ""}>Next ▶</button>
      </div>
    ` : ""}
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
        <h4>📊 Cthulhu Sheet</h4>
        <div class="stats-sheet" id="statsSheet">${foundryText}</div>
        <button class="copy-btn" id="copyBtn">📋 Copy for Foundry VTT</button>
      </div>
    `;
  }
  
  let familyHtml = "";
  if (person.spouseId !== null) {
    const spouse = people[person.spouseId];
    const spouseGayBadge = person.isGay ? " 🏳️‍🌈" : "";
    familyHtml += `
      <div class="family-section">
        <h4>💑 Spouse${spouseGayBadge}</h4>
        <div class="family-members">
          <div class="family-member" data-person-id="${spouse.id}">
            ${spouse.gender === "male" ? "👨" : "👩"} ${getPersonName(spouse)} 
            <span class="relation-type">(${spouse.age} y.o., ${spouse.job || 'None'})</span>
          </div>
        </div>
      </div>
    `;
  }
  
  if (person.parentIds.length > 0) {
    const parentsHtml = person.parentIds.map((id) => {
      const p = people[id];
      return `<div class="family-member" data-person-id="${p.id}">${p.gender === "male" ? "👨" : "👩"} ${getPersonName(p)} <span class="relation-type">(${p.age} y.o., ${p.job || 'None'})</span></div>`;
    }).join("");
    familyHtml += `<div class="family-section"><h4>👨‍👩‍👦 Parents</h4><div class="family-members">${parentsHtml}</div></div>`;
  }
  
  if (person.siblingIds.length > 0) {
    const siblingsHtml = person.siblingIds.map((id) => {
      const s = people[id];
      return `<div class="family-member" data-person-id="${s.id}">${s.gender === "male" ? "👨" : "👩"} ${getPersonName(s)} <span class="relation-type">(${s.age} y.o., ${s.job || 'None'})</span></div>`;
    }).join("");
    familyHtml += `<div class="family-section"><h4>👫 Siblings</h4><div class="family-members">${siblingsHtml}</div></div>`;
  }
  
  if (person.childrenIds.length > 0) {
    const childrenHtml = person.childrenIds.map((id) => {
      const c = people[id];
      return `<div class="family-member" data-person-id="${c.id}">${c.gender === "male" ? "👦" : "👧"} ${getPersonName(c)} <span class="relation-type">(${c.age} y.o., ${c.job || 'None'})</span></div>`;
    }).join("");
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
          <strong>Age:</strong> ${person.age} y.o.<br>
          <strong>Job:</strong> ${jobIcon} ${person.job || 'None'}<br>
          <strong>Family:</strong> ${cthulhuData.lastNames[person.lastNameIdx]}<br>
          <strong>Gender:</strong> ${genderLabel}${person.isGay ? " 🏳️‍🌈" : ""}
        </div>
      </div>
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
  generatingEl.classList.add('active');
  
  try {
    currentPopulation = await generatePopulation(totalPopulation, currentSeed, async (text, percent) => {
      progressText.textContent = text;
      progressFill.style.width = `${percent}%`;
      await new Promise(r => setTimeout(r, 10));
    });
    renderCategories();
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => {
      generatingEl.classList.remove('active');
      progressFill.style.width = '0%';
    }, 500);
  }
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
  clearTimeout(generateTimeout);
  generateTimeout = setTimeout(() => doGenerate(), 300);
});

popInput.addEventListener("input", (e) => {
  let pop = parseInt((e.target as HTMLInputElement).value) || 1;
  pop = Math.max(1, Math.min(5000000, pop));
  totalPopulation = pop;
  popSlider.value = populationToSlider(pop).toString();
  clearTimeout(generateTimeout);
  generateTimeout = setTimeout(() => doGenerate(), 500);
});

popInput.addEventListener("blur", (e) => {
  let pop = parseInt((e.target as HTMLInputElement).value) || 1;
  (e.target as HTMLInputElement).value = Math.max(1, Math.min(5000000, pop)).toString();
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

// Initial generation
currentSeed = parseInt(seedInput.value) || 12345;
totalPopulation = parseInt(popInput.value) || 1000;
doGenerate();

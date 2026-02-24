import { cthulhuData, JOB_FEMALE_RATIO, weaponsList, jobSkillProfiles } from './data';

export interface Person {
  id: number;
  firstNameIdx: number;
  lastNameIdx: number;
  gender: 'male' | 'female';
  age: number;
  job: string | null;
  spouseId: number | null;
  childrenIds: number[];
  parentIds: number[];
  siblingIds: number[];
  isGay: boolean;
}

export interface Stats {
  STR: number;
  CON: number;
  SIZ: number;
  DEX: number;
  APP: number;
  INT: number;
  POW: number;
  EDU: number;
  SAN: number;
  HP: number;
  DB: string;
  Build: number;
  MOV: number;
  MP: number;
  Luck: number;
  Attacks: string[];
  Dodge: number;
  Skills: Record<string, number>;
}

// Mulberry32 PRNG
export function mulberry32(a: number) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function generatePopulation(
  totalPopulation: number,
  baseSeed: number,
  onProgress?: (text: string, percent: number) => Promise<void>
): Promise<{ people: Person[]; jobIndex: Record<string, number[]> }> {
  const showProgress = totalPopulation > 10000;
  
  if (showProgress && onProgress) {
    await onProgress("Initializing...", 0);
  }

  const rng = mulberry32(baseSeed);
  const people: Person[] = [];
  const jobIndex: Record<string, number[]> = {};
  const jobCounts: Record<string, number> = {};

  for (const cat of Object.values(cthulhuData.jobs)) {
    for (const job of cat.jobs) {
      if (totalPopulation >= job.threshold) {
        jobCounts[job.name] = Math.max(1, Math.floor(totalPopulation * job.ratio));
        jobIndex[job.name] = [];
      }
    }
  }

  if (showProgress && onProgress) {
    await onProgress("Creating families...", 10);
  }

  let personId = 0;
  let remaining = totalPopulation;

  while (remaining > 0) {
    const familySize = Math.min(remaining, Math.floor(rng() * 5) + 2);
    const lastNameIdx = Math.floor(rng() * cthulhuData.lastNames.length);
    let parent1Id: number | null = null;
    let parent2Id: number | null = null;

    const isSeniorFamily = rng() < 0.08;
    const p1Age = isSeniorFamily ? Math.floor(rng() * 26) + 65 : Math.floor(rng() * 35) + 30;
    const isGayCouple = rng() < 0.03;
    const p1Gender = rng() > 0.5 ? "male" : "female";
    const p1NameIdx = Math.floor(
      rng() * (p1Gender === "male" ? cthulhuData.firstNamesMale : cthulhuData.firstNamesFemale).length
    );

    people.push({
      id: personId,
      firstNameIdx: p1NameIdx,
      lastNameIdx,
      gender: p1Gender,
      age: p1Age,
      job: null,
      spouseId: null,
      childrenIds: [],
      parentIds: [],
      siblingIds: [],
      isGay: isGayCouple,
    });
    parent1Id = personId++;
    remaining--;

    if (remaining > 0 && rng() > 0.15) {
      const p2Age = Math.max(18, p1Age + Math.floor(rng() * 10) - 5);
      const p2Gender = isGayCouple ? p1Gender : p1Gender === "male" ? "female" : "male";
      const p2NameIdx = Math.floor(
        rng() * (p2Gender === "male" ? cthulhuData.firstNamesMale : cthulhuData.firstNamesFemale).length
      );

      people.push({
        id: personId,
        firstNameIdx: p2NameIdx,
        lastNameIdx,
        gender: p2Gender,
        age: p2Age,
        job: null,
        spouseId: parent1Id,
        childrenIds: [],
        parentIds: [],
        siblingIds: [],
        isGay: isGayCouple,
      });
      parent2Id = personId++;
      people[parent1Id].spouseId = parent2Id;
      remaining--;
    }

    const numChildren = Math.min(remaining, Math.max(0, familySize - (parent2Id !== null ? 2 : 1)));
    const childrenIds: number[] = [];

    for (let i = 0; i < numChildren; i++) {
      const childGender = rng() > 0.5 ? "male" : "female";
      const childAge = Math.max(1, p1Age - 18 - Math.floor(rng() * 15));
      const childNames = childGender === "male" ? cthulhuData.firstNamesMale : cthulhuData.firstNamesFemale;
      const childNameIdx = Math.floor(rng() * childNames.length);
      const parentIds = parent2Id !== null ? [parent1Id, parent2Id] : [parent1Id];

      people.push({
        id: personId,
        firstNameIdx: childNameIdx,
        lastNameIdx,
        gender: childGender,
        age: childAge,
        job: null,
        spouseId: null,
        childrenIds: [],
        parentIds,
        siblingIds: [],
        isGay: false,
      });
      childrenIds.push(personId);
      people[parent1Id].childrenIds.push(personId);
      if (parent2Id !== null) people[parent2Id].childrenIds.push(personId);
      personId++;
      remaining--;
    }

    for (const cid of childrenIds) {
      people[cid].siblingIds = childrenIds.filter((id) => id !== cid);
    }
  }

  if (showProgress && onProgress) {
    await onProgress("Assigning jobs...", 60);
  }

  if (!jobIndex["Child"]) jobIndex["Child"] = [];
  if (!jobIndex["Retiree"]) jobIndex["Retiree"] = [];
  if (!jobIndex["Student"]) jobIndex["Student"] = [];
  if (!jobIndex["Housewife"]) jobIndex["Housewife"] = [];

  for (const person of people) {
    if (person.age < 16) {
      person.job = "Child";
      jobIndex["Child"].push(person.id);
    } else if (person.age >= 65) {
      person.job = "Retiree";
      jobIndex["Retiree"].push(person.id);
    }
  }

  const maxStudents = Math.floor(totalPopulation * 0.05);
  let studentCount = 0;
  for (const person of people) {
    if (person.job !== null) continue;
    if (person.age >= 16 && person.age <= 25 && studentCount < maxStudents && rng() < 0.25) {
      person.job = "Student";
      jobIndex["Student"].push(person.id);
      studentCount++;
    }
  }

  const shuffleArr = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const femaleJobSlots: string[] = [];
  const maleJobSlots: string[] = [];

  for (const [jobName, count] of Object.entries(jobCounts)) {
    if (["Child", "Retiree", "Housewife", "Student"].includes(jobName)) continue;
    const femaleRatio = JOB_FEMALE_RATIO[jobName] !== undefined ? JOB_FEMALE_RATIO[jobName] : 0.15;
    const numFemale = Math.round(count * femaleRatio);
    const numMale = count - numFemale;
    for (let i = 0; i < numFemale; i++) femaleJobSlots.push(jobName);
    for (let i = 0; i < numMale; i++) maleJobSlots.push(jobName);
  }

  shuffleArr(femaleJobSlots);
  shuffleArr(maleJobSlots);

  const femaleWorkingAge = people.filter((p) => p.job === null && p.gender === "female" && p.age >= 16 && p.age < 65);
  shuffleArr(femaleWorkingAge);
  const numHousewives = Math.floor(femaleWorkingAge.length * 0.8);
  for (let i = 0; i < numHousewives; i++) {
    femaleWorkingAge[i].job = "Housewife";
    jobIndex["Housewife"].push(femaleWorkingAge[i].id);
  }

  const allWorkingAdults = people.filter((p) => p.job === null && p.age >= 16 && p.age < 65);
  shuffleArr(allWorkingAdults);

  let fSlotIdx = 0;
  let mSlotIdx = 0;

  for (const person of allWorkingAdults) {
    if (person.gender === "female") {
      if (fSlotIdx < femaleJobSlots.length) {
        const job = femaleJobSlots[fSlotIdx++];
        person.job = job;
        if (jobIndex[job]) jobIndex[job].push(person.id);
        else person.job = "No profession";
      } else {
        person.job = "No profession";
      }
    } else {
      if (mSlotIdx < maleJobSlots.length) {
        const job = maleJobSlots[mSlotIdx++];
        person.job = job;
        if (jobIndex[job]) jobIndex[job].push(person.id);
        else person.job = "No profession";
      } else {
        person.job = "No profession";
      }
    }
  }

  for (const person of people.filter((p) => p.job === null)) {
    person.job = "No profession";
  }

  if (showProgress && onProgress) {
    await onProgress("Done!", 100);
  }

  return { people, jobIndex };
}

function roll3D6(rng: () => number) {
  return Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1;
}

function roll2D6Plus6(rng: () => number) {
  return Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1 + 6;
}

function getDamageBonusAndBuild(str: number, siz: number) {
  const total = str + siz;
  if (total <= 64) return { db: "-2", build: -2 };
  if (total <= 84) return { db: "-1", build: -1 };
  if (total <= 124) return { db: "0", build: 0 };
  if (total <= 164) return { db: "+1D4", build: 1 };
  if (total <= 204) return { db: "+1D6", build: 2 };
  return { db: "+2D6", build: 3 };
}

function getMove(str: number, dex: number, siz: number, age: number) {
  let mov = 8;
  if (str < siz && dex < siz) mov = 7;
  else if (str > siz && dex > siz) mov = 9;
  if (age >= 40) mov -= 1;
  if (age >= 50) mov -= 1;
  if (age >= 60) mov -= 1;
  if (age >= 70) mov -= 1;
  if (age >= 80) mov -= 1;
  return Math.max(1, mov);
}

export function generateCthulhuStats(person: Person, rng: () => number): Stats {
  let str = roll3D6(rng) * 5;
  let con = roll3D6(rng) * 5;
  let siz = roll2D6Plus6(rng) * 5;
  let dex = roll3D6(rng) * 5;
  let app = roll3D6(rng) * 5;
  let int = roll2D6Plus6(rng) * 5;
  let pow = roll3D6(rng) * 5;
  let edu = roll2D6Plus6(rng) * 5;
  let luck = roll3D6(rng) * 5;

  const profile = jobSkillProfiles[person.job || ""] || jobSkillProfiles["_default"];
  if (profile.statBonus) {
    if (profile.statBonus.FOR) str = Math.min(99, str + profile.statBonus.FOR);
    if (profile.statBonus.CON) con = Math.min(99, con + profile.statBonus.CON);
    if (profile.statBonus.DEX) dex = Math.min(99, dex + profile.statBonus.DEX);
    if (profile.statBonus.INT) int = Math.min(99, int + profile.statBonus.INT);
    if (profile.statBonus.POU) pow = Math.min(99, pow + profile.statBonus.POU);
    if (profile.statBonus.EDU) edu = Math.min(99, edu + profile.statBonus.EDU);
    if (profile.statBonus.APP) app = Math.min(99, app + profile.statBonus.APP);
  }

  if (person.age >= 15 && person.age <= 19) {
    str -= 5;
    siz -= 5;
    edu -= 5;
    luck = Math.max(luck, roll3D6(rng) * 5);
  } else if (person.age >= 20 && person.age <= 39) {
    edu += Math.floor(rng() * 2) > 0 ? 5 : 0;
  } else if (person.age >= 40 && person.age <= 49) {
    edu += Math.floor(rng() * 3) > 0 ? 10 : 5;
    str -= 5;
    con -= 5;
    dex -= 5;
    app -= 5;
  } else if (person.age >= 50 && person.age <= 59) {
    edu += Math.floor(rng() * 4) > 0 ? 15 : 10;
    str -= 10;
    con -= 10;
    dex -= 10;
    app -= 10;
  } else if (person.age >= 60 && person.age <= 69) {
    edu += Math.floor(rng() * 4) > 0 ? 20 : 15;
    str -= 15;
    con -= 15;
    dex -= 15;
    app -= 15;
  } else if (person.age >= 70 && person.age <= 79) {
    edu += Math.floor(rng() * 4) > 0 ? 25 : 20;
    str -= 20;
    con -= 20;
    dex -= 20;
    app -= 20;
  } else if (person.age >= 80) {
    edu += Math.floor(rng() * 4) > 0 ? 30 : 25;
    str -= 25;
    con -= 25;
    dex -= 25;
    app -= 25;
  }

  str = Math.max(15, str);
  con = Math.max(15, con);
  siz = Math.max(15, siz);
  dex = Math.max(15, dex);
  app = Math.max(15, app);
  edu = Math.min(99, edu);

  const hp = Math.floor((con + siz) / 10);
  const mp = Math.floor(pow / 5);
  const san = pow;
  const { db, build } = getDamageBonusAndBuild(str, siz);
  const mov = getMove(str, dex, siz, person.age);

  const skills: Record<string, number> = {};
  if (profile.skills) {
    for (const [skillName, range] of Object.entries(profile.skills)) {
      const [min, max] = range as [number, number];
      skills[skillName] = Math.floor(rng() * (max - min + 1)) + min;
    }
  }
  if (profile.credit) {
    const [min, max] = profile.credit;
    skills["Credit Rating"] = Math.floor(rng() * (max - min + 1)) + min;
  }

  const attacks: string[] = [];
  if (profile.weapons) {
    for (const wName of profile.weapons) {
      const w = weaponsList.find((x) => x.name === wName);
      if (w) {
        let dmg = w.damage;
        if (dmg.includes("+DB")) dmg = dmg.replace("+DB", db !== "0" ? db : "");
        attacks.push(`${wName} (${dmg})`);
      }
    }
  }
  if (attacks.length === 0) {
    attacks.push(`Fist (1D3${db !== "0" ? db : ""})`);
  }

  return {
    STR: str,
    CON: con,
    SIZ: siz,
    DEX: dex,
    APP: app,
    INT: int,
    POW: pow,
    EDU: edu,
    SAN: san,
    HP: hp,
    DB: db,
    Build: build,
    MOV: mov,
    MP: mp,
    Luck: luck,
    Attacks: attacks,
    Dodge: Math.floor(dex / 2),
    Skills: skills,
  };
}

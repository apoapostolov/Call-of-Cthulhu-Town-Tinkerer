/**
 * Cult generation module for Call of Cthulhu 1920s Town Tinkerer.
 *
 * Generates secret occult cults that may be encountered in the town.
 * Cults are rare, size-limited, and have authentic CoC-style hierarchy.
 */

import { mulberry32 } from "./logic.ts";
import type { Person } from "./logic.ts";

// ── Settlement naming ────────────────────────────────────────────────────────

const SETTLEMENT_THRESHOLDS: [number, string][] = [
  [5_000_000, "Megalopolis"],
  [1_000_000, "Metropolis"],
  [300_000, "City"],
  [100_000, "Large City"],
  [50_000, "Capital"],
  [20_000, "Town"],
  [5_000, "Small Town"],
  [2_000, "Borough"],
  [1_000, "Village"],
  [500, "Hamlet"],
  [100, "Settlement"],
  [0, "Homestead"],
];

export function settlementWord(population: number): string {
  for (const [threshold, name] of SETTLEMENT_THRESHOLDS) {
    if (population >= threshold) return name;
  }
  return "Homestead";
}

// ── Cult name word lists ──────────────────────────────────────────────────────

const CULT_ADJECTIVES = [
  "Ancient", "Unseen", "Eternal", "Hollow", "Whispering", "Dreaming",
  "Sunken", "Forbidden", "Crimson", "Black", "Silver", "Iron",
  "Writhing", "Lurking", "Smouldering", "Veiled", "Hidden", "Last",
  "Nameless", "Shattered", "Drowned", "Burning", "Elder", "Outer",
  "Crawling", "Pale", "Bleeding", "Cold", "Wailing", "Endless",
  "Twisted", "Spectral", "Grinning", "Dreadful", "Cursed", "Fading",
  "Sealed", "Howling", "Mournful", "Starless", "Ceaseless", "Blind",
  "Stone", "Salt", "Amber", "Ash", "Bone", "Coiled", "Deep",
  "Dying", "Frenzied", "Glowing", "Hollow", "Hungry", "Ivory",
  "Jagged", "Obsidian", "Omen", "Pale", "Rusted", "Shadow",
  "Shrieking", "Sleeping", "Smiling", "Spiral", "Sunless", "Terrible",
  "Thin", "Thorned", "Trembling", "Unbound", "Unmarked", "Unspoken",
  "Void", "Wandering", "Weeping", "Wrongful", "Yearning", "Yellow",
  "Abyssal", "Cyclopean", "Iridescent", "Fungal", "Brackish", "Miasmic",
];

const CULT_NOUNS = [
  "Order", "Lodge", "Society", "Brotherhood", "Circle", "Covenant",
  "Tower", "Flame", "Gate", "Veil", "Seal", "Hand",
  "Eye", "Crown", "Chalice", "Path", "Vigil", "Tide",
  "Star", "Dream", "Wound", "Throne", "Rite", "Chain",
  "Candle", "Bell", "Tooth", "Claw", "Wing", "Shard",
  "Lamp", "Mask", "Door", "Bridge", "Mirror", "Lens",
  "Fork", "Thread", "Coil", "Root", "Spine", "Void",
  "Pact", "Orison", "Compact", "Conclave", "Tribunal", "Cabal",
  "Sanctum", "Crypt", "Chamber", "Vault", "Nave", "Altar",
  "Abyss", "Gyre", "Spiral", "Chasm", "Rift", "Hollow",
  "Mouth", "Throat", "Tongue", "Skin", "Heart", "Bone",
  "Web", "Knot", "Noose", "Pillar", "Sigil", "Brand",
];

const CULT_SUBJECTS = [
  "of the Deep", "of the Void", "of the Outer Dark", "of the Elder Sign",
  "of the Black Sea", "of the Shrouded Moon", "of the Worm", "of the Pit",
  "of the First Fire", "of the Sleep", "of the White Hand", "of the Grey Tide",
  "of the Endless Night", "of the Crawling Chaos", "of the Blind God",
  "of the Drowned City", "of the Sunken Temple", "of the Living Stars",
  "of the Whispering Wood", "of the Bleeding Stone", "of the Sealed Tomb",
  "of the Dark Harvest", "of the Fading Light", "of the Cold Flame",
  "of the Pale Shore", "of the Black Candle", "of the Broken Altar",
  "of the Smoking Mirror", "of the Lost Brother", "of the Unnamed King",
  "of the Dying Summer", "of the Forgotten River", "of the Salt Graves",
  "of the Twisting Path", "of the Amber Eye", "of the Iron Gate",
  "of the Weeping Bell", "of the Ruined Arch", "of the Hollow Mountain",
  "of the Silver Needle", "of the Ash Circle", "of the Bound Flame",
  "of the Dark Covenant", "of the Empty Throne", "of the Wandering Star",
  "of the Sunless Kingdom", "of the Nameless Herald", "of the Withered Hand",
];

// ── Cult hierarchy titles ────────────────────────────────────────────────────

export type CultRank = "Hierophant" | "Archon" | "Acolyte" | "Initiate";

const RANK_ORDER: CultRank[] = ["Hierophant", "Archon", "Acolyte", "Initiate"];

export const RANK_META: Record<CultRank, {
  plural: string;
  emoji: string;
  description: string;
}> = {
  Hierophant: {
    plural: "Hierophants",
    emoji: "🕯️",
    description: "Supreme leader of the cult — keeper of the true rite",
  },
  Archon: {
    plural: "Archons",
    emoji: "🗝️",
    description: "Senior officers — enforce doctrine and control cells",
  },
  Acolyte: {
    plural: "Acolytes",
    emoji: "📜",
    description: "Trusted servants who have been fully initiated",
  },
  Initiate: {
    plural: "Initiates",
    emoji: "🔮",
    description: "Rank-and-file members who know only partial truths",
  },
};

// ── Cult member ──────────────────────────────────────────────────────────────

export interface CultMember {
  personId: number;
  rank: CultRank;
  /** IDs of members this person is in contact with (same or lower rank) */
  contacts: number[];
}

// ── Cult ─────────────────────────────────────────────────────────────────────

export interface Cult {
  id: number;
  name: string;
  /** Brief flavour tag for what this cult worships / pursues */
  flavour: string;
  members: CultMember[];
}

// ── Size table ───────────────────────────────────────────────────────────────

/** Maximum cult size for a given population.  Rare by design. */
function maxCultSize(population: number): number {
  if (population < 500) return 3;
  if (population < 2_000) return 5;
  if (population < 5_000) return 8;
  if (population < 20_000) return 15;
  if (population < 100_000) return 30;
  if (population < 500_000) return 60;
  return 120;
}

const CULT_FLAVOURS = [
  "seeks to unseal the drowned god beneath the harbour",
  "gathers midnight blood-rites to appease the pale star",
  "collects forbidden tomes from the war's black markets",
  "prepares the way for the return of the Great Old Ones",
  "communes with the dead through stolen aetheric equipment",
  "follows the Yellow Sign handed down from Carcosa",
  "believes the Worm Below grants immortality through corruption",
  "performs mirror-rites to open gaps in the boundary of sleep",
  "venerates the Deep Ones and brokers their influence on land",
  "hides an incomplete Necronomicon copy and fills in the blanks",
  "sells dreams of power to desperate men and harvests the debt",
  "conducts experiments to bind Elder Things from the Plateau of Leng",
  "recruits promising minds for an entity that feeds on intellect",
  "uses the jazz underground to spread a memetic hymn of madness",
  "trades relics looted from Mesopotamian ruins for cult favours",
  "marks chosen members with a brand that slowly awakens a slumbering god",
  "channels the Outer Black through a stolen phonograph recording",
  "worships the god of the drowned and promises resurrection",
  "practices a corruption of Theosophy that ends in human sacrifice",
  "believes the Prohibition era is a sign of the final harvest",
];

// ── Name generation ──────────────────────────────────────────────────────────

function pickRng<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateCultName(rng: () => number): string {
  const style = Math.floor(rng() * 3);
  if (style === 0) {
    // "The [Adjective] [Noun]"
    return `The ${pickRng(CULT_ADJECTIVES, rng)} ${pickRng(CULT_NOUNS, rng)}`;
  } else if (style === 1) {
    // "The [Noun] [of something]"
    return `The ${pickRng(CULT_NOUNS, rng)} ${pickRng(CULT_SUBJECTS, rng)}`;
  } else {
    // "The [Adjective] [Noun] [of something]"
    return `The ${pickRng(CULT_ADJECTIVES, rng)} ${pickRng(CULT_NOUNS, rng)} ${pickRng(CULT_SUBJECTS, rng)}`;
  }
}

// ── Contact network ──────────────────────────────────────────────────────────

/** Each member knows the person above them + a handful of peers / juniors. */
function buildContacts(
  members: CultMember[],
  rng: () => number,
): void {
  const byRank: Record<CultRank, number[]> = {
    Hierophant: [],
    Archon: [],
    Acolyte: [],
    Initiate: [],
  };
  for (const m of members) byRank[m.rank].push(m.personId);

  // map personId → member
  const byId = new Map<number, CultMember>(members.map((m) => [m.personId, m]));

  for (const m of members) {
    const contacts = new Set<number>();
    const rankIdx = RANK_ORDER.indexOf(m.rank);

    // Always knows the hierophant (unless IS the hierophant)
    if (m.rank !== "Hierophant" && byRank.Hierophant.length > 0) {
      contacts.add(byRank.Hierophant[0]);
    }

    // Knows 1–3 peers in the same rank
    const peers = byRank[m.rank].filter((id) => id !== m.personId);
    const peerCount = Math.min(peers.length, 1 + Math.floor(rng() * 3));
    const shuffled = [...peers].sort(() => rng() - 0.5);
    for (let i = 0; i < peerCount; i++) contacts.add(shuffled[i]);

    // Knows 1–2 members of the rank directly below
    if (rankIdx < RANK_ORDER.length - 1) {
      const below = byRank[RANK_ORDER[rankIdx + 1]];
      const belowCount = Math.min(below.length, 1 + Math.floor(rng() * 2));
      const shuffledBelow = [...below].sort(() => rng() - 0.5);
      for (let i = 0; i < belowCount; i++) contacts.add(shuffledBelow[i]);
    }

    // Remove self
    contacts.delete(m.personId);

    m.contacts = [...contacts];
  }

  void byId; // suppress unused warning
}

// ── Main generation function ─────────────────────────────────────────────────

/**
 * Generate one cult from the given adult population.
 * Excludes people already assigned to existing cults.
 */
export function generateCult(
  cultId: number,
  adults: Person[],
  excludedIds: Set<number>,
  population: number,
  seed: number,
): Cult | null {
  const rng = mulberry32(seed ^ (cultId * 0xc0ffee13 + 0xdada));
  const available = adults.filter((p) => !excludedIds.has(p.id));
  if (available.length === 0) return null;

  const maxSize = maxCultSize(population);
  // Pick a size: between 3 and maxSize (skewed toward smaller for rarity)
  const minSize = 3;
  if (available.length < minSize) return null;

  const rawSize = minSize + Math.floor(Math.pow(rng(), 2) * (maxSize - minSize + 1));
  const size = Math.min(rawSize, available.length);

  // Shuffle available pool and take `size` members
  const pool = [...available].sort(() => rng() - 0.5);
  const chosen = pool.slice(0, size);

  // Assign ranks
  const members: CultMember[] = [];
  // 1 Hierophant
  members.push({ personId: chosen[0].id, rank: "Hierophant", contacts: [] });

  // Archons: 1–3, proportional to size
  const archonCount = size <= 5 ? 1 : size <= 12 ? 2 : 3;
  for (let i = 1; i <= archonCount && i < chosen.length; i++) {
    members.push({ personId: chosen[i].id, rank: "Archon", contacts: [] });
  }

  // Acolytes: 1–5, roughly 20% of remaining
  const remaining = chosen.length - 1 - archonCount;
  const acolyteCount = Math.max(0, Math.min(5, Math.floor(remaining * 0.25)));
  for (let i = 0; i < acolyteCount; i++) {
    const idx = 1 + archonCount + i;
    if (idx >= chosen.length) break;
    members.push({ personId: chosen[idx].id, rank: "Acolyte", contacts: [] });
  }

  // Initiates: everyone else
  for (let i = 1 + archonCount + acolyteCount; i < chosen.length; i++) {
    members.push({ personId: chosen[i].id, rank: "Initiate", contacts: [] });
  }

  buildContacts(members, rng);

  return {
    id: cultId,
    name: generateCultName(rng),
    flavour: CULT_FLAVOURS[Math.floor(rng() * CULT_FLAVOURS.length)],
    members,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return the cult member record for a person, if any. */
export function getCultMembership(
  cults: Cult[],
  personId: number,
): { cult: Cult; member: CultMember } | null {
  for (const cult of cults) {
    const member = cult.members.find((m) => m.personId === personId);
    if (member) return { cult, member };
  }
  return null;
}

/** Build a Set of all cult member IDs from all cults. */
export function allCultMemberIds(cults: Cult[]): Set<number> {
  const s = new Set<number>();
  for (const c of cults) for (const m of c.members) s.add(m.personId);
  return s;
}

/**
 * Cult generation module for Call of Cthulhu 1920s Town Tinkerer.
 *
 * Generates secret occult cults that may be encountered in the town.
 * Cults are rare, size-limited, and have authentic CoC-style hierarchy.
 */

import type { Person } from "./logic.ts";
import { mulberry32 } from "./logic.ts";

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

// base adjectives provide flavour; they will be automatically expanded below
const CULT_ADJECTIVES = [
  "Ancient",
  "Unseen",
  "Eternal",
  "Hollow",
  "Whispering",
  "Dreaming",
  "Sunken",
  "Forbidden",
  "Crimson",
  "Black",
  "Silver",
  "Iron",
  "Writhing",
  "Lurking",
  "Smouldering",
  "Veiled",
  "Hidden",
  "Last",
  "Nameless",
  "Shattered",
  "Drowned",
  "Burning",
  "Elder",
  "Outer",
  "Crawling",
  "Pale",
  "Bleeding",
  "Cold",
  "Wailing",
  "Endless",
  "Twisted",
  "Spectral",
  "Grinning",
  "Dreadful",
  "Cursed",
  "Fading",
  "Sealed",
  "Howling",
  "Mournful",
  "Starless",
  "Ceaseless",
  "Blind",
  "Stone",
  "Salt",
  "Amber",
  "Ash",
  "Bone",
  "Coiled",
  "Deep",
  "Dying",
  "Frenzied",
  "Glowing",
  "Hollow",
  "Hungry",
  "Ivory",
  "Jagged",
  "Obsidian",
  "Omen",
  "Pale",
  "Rusted",
  "Shadow",
  "Shrieking",
  "Sleeping",
  "Smiling",
  "Spiral",
  "Sunless",
  "Terrible",
  "Thin",
  "Thorned",
  "Trembling",
  "Unbound",
  "Unmarked",
  "Unspoken",
  "Void",
  "Wandering",
  "Weeping",
  "Wrongful",
  "Yearning",
  "Yellow",
  "Abyssal",
  "Cyclopean",
  "Iridescent",
  "Fungal",
  "Brackish",
  "Miasmic",
];

// generate variations until we have at least 5× as many words
(function augmentAdjectives() {
  const base = [...CULT_ADJECTIVES];
  const suffixes = [
    "ed","ing","ous","ic","al","ive","ant","ent","ian","ary","less","ish","ar","ly","uous","arian","esque"
  ];
  for (const w of base) {
    for (const s of suffixes) {
      if (CULT_ADJECTIVES.length >= base.length * 5) return;
      const candidate = w + s;
      if (!CULT_ADJECTIVES.includes(candidate)) CULT_ADJECTIVES.push(candidate);
    }
  }
})();

const CULT_NOUNS = [
  "Order",
  "Lodge",
  "Society",
  "Brotherhood",
  "Circle",
  "Covenant",
  "Tower",
  "Flame",
  "Gate",
  "Veil",
  "Seal",
  "Hand",
  "Eye",
  "Crown",
  "Chalice",
  "Path",
  "Vigil",
  "Tide",
  "Star",
  "Dream",
  "Wound",
  "Throne",
  "Rite",
  "Chain",
  "Candle",
  "Bell",
  "Tooth",
  "Claw",
  "Wing",
  "Shard",
  "Lamp",
  "Mask",
  "Door",
  "Bridge",
  "Mirror",
  "Lens",
  "Fork",
  "Thread",
  "Coil",
  "Root",
  "Spine",
  "Void",
  "Pact",
  "Orison",
  "Compact",
  "Conclave",
  "Tribunal",
  "Cabal",
  "Sanctum",
  "Crypt",
  "Chamber",
  "Vault",
  "Nave",
  "Altar",
  "Abyss",
  "Gyre",
  "Spiral",
  "Chasm",
  "Rift",
  "Hollow",
  "Mouth",
  "Throat",
  "Tongue",
  "Skin",
  "Heart",
  "Bone",
  "Web",
  "Knot",
  "Noose",
  "Pillar",
  "Sigil",
  "Brand",
];

// augment nouns with prefixes/suffixes and "of ..." variants to reach 5× length
(function augmentNouns() {
  const base = [...CULT_NOUNS];
  const prefixes = [
    "Bone","Blood","Night","Moon","Star","Skull","Ritual","Grave","Ash","Mist","Storm","Echo","Crypt","Phantom","Shade","Wraith","Specter","Shadow","Void","Abyss","Chaos","Sanctum","Temple","Gate","Hex","Rune","Sigil","Crown","Throne","Blade","Torch","Lantern","Mask","Veil","Shroud","Gloom","Tide","Fang","Howl","Hearth","Spire","Vortex","Cyclone","Frost","Flame","Blaze","Dusk","Dawn","Eclipse","Oblivion","Ankh","Pyramid","Scarab","Spider","Web","Ghoul","Witch","Warlock","Curse","Fever","Plague","Grimoire","Codex","Tome","Scroll","Quill","Ink","Grim","Frost","Salt","Sorrow"
  ];
  const suffixes = [
    "","s","es"," of Doom"," of Night"," of the Abyss"," of Ashes"," of Bones"," of Shadows"," of Echoes"," of Flames"," of Frost"," of Silence"," of Sorrow"," of Ruin"," of Rot"," of Decay"," of the End"," of the Beginning"," of the Forgotten"," of the Damned"," of the Cursed"," of the Dead"," of the Living"," of the Buried"," of the Sealed"," of the Forbidden"," of the Lost"," of the Broken"," of the Hollow"," of the Shattered"," of the Fallen"," of the Unseen"," with Teeth"," with Eyes"," with No Eyes"," with Tongues"," with Wings"," with Claws"," with Fangs"," with Fire"," with Ice"," with Blood"," with Bone"," with Soul"," with Shadow"," of Secrets"," of Lies"," of Whispers"
  ];

  for (const p of prefixes) {
    for (const s of suffixes) {
      if (CULT_NOUNS.length >= base.length * 5) return;
      const candidate = p + s;
      if (candidate && !CULT_NOUNS.includes(candidate)) CULT_NOUNS.push(candidate);
    }
  }
})();

const CULT_SUBJECTS = [
  "of the Deep",
  "of the Void",
  "of the Outer Dark",
  "of the Elder Sign",
  "of the Black Sea",
  "of the Shrouded Moon",
  "of the Worm",
  "of the Pit",
  "of the First Fire",
  "of the Sleep",
  "of the White Hand",
  "of the Grey Tide",
  "of the Endless Night",
  "of the Crawling Chaos",
  "of the Blind God",
  "of the Drowned City",
  "of the Sunken Temple",
  "of the Living Stars",
  "of the Whispering Wood",
  "of the Bleeding Stone",
  "of the Sealed Tomb",
  "of the Dark Harvest",
  "of the Fading Light",
  "of the Cold Flame",
  "of the Pale Shore",
  "of the Black Candle",
  "of the Broken Altar",
  "of the Smoking Mirror",
  "of the Lost Brother",
  "of the Unnamed King",
  "of the Dying Summer",
  "of the Forgotten River",
  "of the Salt Graves",
  "of the Twisting Path",
  "of the Amber Eye",
  "of the Iron Gate",
  "of the Weeping Bell",
  "of the Ruined Arch",
  "of the Hollow Mountain",
  "of the Silver Needle",
  "of the Ash Circle",
  "of the Bound Flame",
  "of the Dark Covenant",
  "of the Empty Throne",
  "of the Wandering Star",
  "of the Sunless Kingdom",
  "of the Nameless Herald",
  "of the Withered Hand",
];

// expand subjects by combining nouns with simple prefixes until 5× length
(function augmentSubjects() {
  const base = [...CULT_SUBJECTS];
  const rng = mulberry32(0x12345678);
  const prefixes = [
    "of the",
    "from the",
    "beyond the",
    "beneath the",
    "above the",
    "within the",
    "under the",
    "inside the",
    "at the edge of the",
  ];
  while (CULT_SUBJECTS.length < base.length * 5) {
    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    const noun = CULT_NOUNS[Math.floor(rng() * CULT_NOUNS.length)];
    const subj = `${prefix} ${noun}`;
    if (!CULT_SUBJECTS.includes(subj)) CULT_SUBJECTS.push(subj);
  }
})();

// ── Cult hierarchy titles ────────────────────────────────────────────────────

export type CultRank = "Hierophant" | "Archon" | "Acolyte" | "Initiate";

const RANK_ORDER: CultRank[] = ["Hierophant", "Archon", "Acolyte", "Initiate"];

export const RANK_META: Record<
  CultRank,
  {
    plural: string;
    emoji: string;
    description: string;
  }
> = {
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

  // additional motivations (expanded by request)
  "feeds the sacrificial altar with jazz musicians to summon a phantom conductor",
  "buries a radio in the bay to trap the voice of a drowned prophet",
  "etches stars onto strangers' skin to map a celestial labyrinth",
  "burns entire farms under a blood moon to please a ravenous deity",
  "whispers forbidden equations to the city sewage to make it speak",
  "curates a gallery of portraits that slowly rot, each containing a hidden sigil",
  "liberates children and trains them to chant an ancient machine code",
  "keeps a diary of every lie told in town, using it as fuel for an eldritch engine",
  "strangles anyone who mentions their real name, believing it too powerful",
  "sends pigeons carrying teeth to some invisible masters",
  "paints murals that move when unobserved, aimed at awakening street corners",
  "locks themselves in subway tunnels to listen to mechanical chants",
  "sacrifices old automobiles to an oil god that resides below the roads",
  "records the sound of silence and plays it backwards at midnight",
  "drinks ink from censored books to absorb forgotten words",
  "seeks to stitch a human heart into an antique watch to control time",
  "throws coins into a dry fountain that suddenly begins to weep blood",
  "binds promises with a song only children can hear, cursing them to obey",
  "collects shadows of strangers to weave a garment for a sleeping god",
  "brews tea from bones and feeds it to the town's pets as offerings",
  "writes demands on banknotes that appear in other people's pockets",
  "leaves tiny altars in phone booths where nobody answers",
  "dips fingers in rainwater and paints invisible sigils on the moon",
  "erases the faces of neighbors from photographs to erase themselves",
  "hides skulls in musical instruments to vaudeville an ancient spirit",
  "climbs telephone poles at dusk to whisper to the wires",
  "trains ravens to speak the names of those to be claimed by the dark tide",
  "sacrifices their own reflection under moonlight to breed a mirror demon",
  "feeds coins to a tree rumored to be a petrified god",
  "whispered confessions into wells, listening for an answer not yet heard",
  "cultivates a fungus that only grows on lies, spreading it through town",
  "digs up every cemetery for teeth to melt into silver idols",
  "replaces salt in kitchens with ground bone from an unmarked grave",
  "writes scripture in the margins of newspapers that changes the headlines",
  "forces newborns to wear bracelets of iron to keep them from being stolen by some under-city thing",
  "paints eyes on the backs of chairs to watch for interdimensional visitors",
  "boils ocean water to make a potion that keeps tides at bay forever",
  "cooks meals using whispers captured in jars to summon gluttonous spirits",
  "plugs phonographs with hair taken from the dead to record their dreams",
  "locks ears with wax, hearing only the voice of an invisible master",
  "plants uprooted tombstones in city parks to create new gateways",
  "sends post cards written in a dead language that cause readers to vanish",
  "trades organs at speakeasies for kisses from beautiful strangers",
  "keeps a ledger of everyone who has died in a tragic fall, using it to balance the scales",
  "teaches rats to recite incantations while dancing on barrels",
  "paints the town's water towers with symbols that bleed when it rains",
  "feeds the congregations' sermons to a creature living in the attic",
  "records the heartbeat of a newborn and buries it beneath a crosswalk",
  "forces wedding couples to exchange vows in a dead tongue",
  "feeds library books to a fire that speaks in the voice of a drowned poet",
  "builds a carousel of bones that spins only at dead hour",
  "sends telegraphs to a non-existent address that always replies",
  "leaves fresh flowers on train tracks for an invisible train of the dead",
  "plays organ music at midnight in an abandoned warehouse to call a ghost ship",
  "writes instructions in invisible ink on human skin, causing involuntary acts",
  "brews coffee with ground glass to sharpen the mind for spectral vision",
  "uses a gramophone to trap voices of the damned and release them at will",
  "orders the construction of a stone idol that grows a new eye every full moon",
  "feeds milk to a phantom child that only appears near the river",
  "casts shadows into jars and sells them to suffocating affluent clients",
  "presses fingers into wet plaster to create faces that whisper secrets",
  "cuts streetlights at midnight to let a storm of stars into the alleys",
  "dyes their hair with blood to attract the attention of a hairless god",
  "collects lost gloves and strings them together to fashion a rope to the sky",
  "sows seeds of dead flowers, expecting them to bloom into eyes",
  "writes advice columns to the dead in the newspaper, answering only to the chosen",
  "sells dreams of the future at a carnival that never leaves town",
  "paints crescents on rooftops expecting to harvest them at the solstice",
  "binds lovers to pillars with barbed wire to feed an ancient lich",
  "hangs portraits upside-down in taverns until the eyes bleed ink",
  "fills the local fountain with molasses to trap the city’s goose-spirit",
  "records the sounds of train whistles to summon a phantom locomotive",
  "hides secret keys in vending machines that open doors to other worlds",
  "puts bones in bread to make it taste of winter and lead men to sleep forever",
  "etches runes into the soles of shoes to make passersby walk to their doom",
  "prints false maps and distributes them to travelers, leading them into voids",
  "paints stars on ceiling tiles hoping one will fall through into hands",
  "molds wax figures of judges and litigates their will into law",
  "dances on graves to stir the dust into whispers that guide the faithful",
  "stores tears in crystal bottles and sells them at a black market fair",
  "spreads ashes of a witch in the town bakery flour to poison the bread",
  "watches the city from inside a barrel, charting the movement of dark currents",
  "chants into the cracks in sidewalks, believing a god lives below",
  "operates an elevator that only goes down to a floor that was never built",
  "siphons blood from the courthouse bell to keep a judgement spirit awake",
  "plays a piano scraped with fingernails to calm a restless demon beneath the floor",
  "sews buttons from human eyes onto coats to create a people with sightless gazes",
  "hangs clocks backwards to turn time against the living",
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
function buildContacts(members: CultMember[], rng: () => number): void {
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

  const rawSize =
    minSize + Math.floor(Math.pow(rng(), 2) * (maxSize - minSize + 1));
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

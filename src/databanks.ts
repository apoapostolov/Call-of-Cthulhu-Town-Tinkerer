const STREET_ROOTS = [
  "Church",
  "French",
  "Miskatonic",
  "Water",
  "Elm",
  "Garrison",
  "Main",
  "Station",
  "Pickman",
  "College",
  "North",
  "South",
  "West",
  "East",
  "Mill",
  "Wharf",
  "Kingsport",
  "Cedar",
  "Oak",
  "Federal",
  "Adams",
  "Jefferson",
  "Washington",
  "Franklin",
  "Maple",
  "Pine",
  "River",
  "Depot",
  "Foundry",
  "Canal",
  "Harbor",
  "School",
  "Market",
  "Bell",
  "Chapel",
  "Quarry",
  "Rail",
  "Telegraph",
  "Lantern",
  "Prospect",
  "Union",
  "Beacon",
  "Summit",
  "Willow",
  "Ash",
  "Birch",
  "Liberty",
  "Pearl",
  "Hawthorne",
  "Tremont",
  "Lexington",
  "Concord",
  "Baker",
  "Mason",
  "Dock",
  "Bridge",
  "High",
  "Lowell",
  "Carver",
  "Broad",
];

const STREET_SUFFIXES = [
  "Street",
  "Avenue",
  "Road",
  "Lane",
  "Terrace",
  "Way",
  "Court",
  "Place",
  "Row",
  "Parade",
  "Drive",
  "Walk",
  "Square",
  "Hill",
  "Passage",
];

const TRAIT_TEMPERAMENTS = [
  "stoic",
  "charming",
  "nervous",
  "earnest",
  "boastful",
  "patient",
  "wry",
  "dutiful",
  "ambitious",
  "curious",
  "stern",
  "jovial",
  "pious",
  "calculating",
  "impulsive",
  "melancholic",
  "disciplined",
  "guarded",
  "warm",
  "aloof",
  "methodical",
  "polite",
  "hot-tempered",
  "timid",
  "proud",
  "cautious",
  "resourceful",
  "sentimental",
  "brisk",
  "sarcastic",
  "humble",
  "gregarious",
  "reserved",
  "idealistic",
  "pragmatic",
  "suspicious",
  "gracious",
  "blunt",
  "stubborn",
  "restless",
];

const TRAIT_FLAWS = [
  "vindictive",
  "greedy",
  "jealous",
  "reckless",
  "superstitious",
  "vain",
  "deceitful",
  "spiteful",
  "resentful",
  "cowardly",
  "paranoid",
  "gossip-prone",
  "petty",
  "obsessive",
  "neurotic",
  "temperamental",
  "controlling",
  "self-righteous",
  "manipulative",
  "bitter",
  "secretive",
  "smug",
  "workaholic",
  "vengeful",
  "opportunistic",
  "fatalistic",
  "combative",
  "callous",
  "moody",
  "abrasive",
  "overbearing",
  "fickle",
  "unforgiving",
  "evasive",
  "dishonest",
  "ruthless",
  "insecure",
  "codependent",
  "frivolous",
  "argumentative",
];

const TRAIT_QUIRKS = [
  "chain-smoking",
  "always overdressed",
  "keeps meticulous ledgers",
  "hums funeral hymns",
  "never removes gloves",
  "quotes scripture",
  "collects newspaper clippings",
  "speaks too softly",
  "avoids eye contact",
  "polishes spectacles constantly",
  "counts steps aloud",
  "fidgets with coins",
  "writes in tiny script",
  "always carries peppermint",
  "misquotes poetry",
  "taps cane when thinking",
  "keeps odd hours",
  "smells of turpentine",
  "laughs at wrong moments",
  "wears mourning black",
  "squints at bright lamps",
  "never sits with back exposed",
  "locks every drawer twice",
  "hoards matchbooks",
  "drinks coffee incessantly",
  "collects railway tickets",
  "keeps a silver flask",
  "talks to stray cats",
  "never misses mass",
  "sniffs snuff before meetings",
  "keeps pressed flowers",
  "writes letters never sent",
  "refuses handshakes",
  "scratches notes onto cuffs",
  "always arrives early",
  "whittles pocket charms",
  "walks with military posture",
  "wears mismatched cufflinks",
  "annotates every book",
  "sleeps in short shifts",
];

const SECRET_ACTIONS = [
  "smuggles",
  "embezzles",
  "forges",
  "blackmails",
  "extorts",
  "siphons",
  "hides",
  "hoards",
  "launders",
  "plants",
  "burned",
  "buried",
  "stole",
  "fenced",
  "betrayed",
  "framed",
  "poisoned",
  "bribed",
  "silenced",
  "faked",
  "shakes down",
  "sells",
  "supplies",
  "pilfers",
  "rewrites",
  "destroys",
  "reroutes",
  "mislabels",
  "runs",
  "conceals",
  "counterfeits",
  "pays off",
  "threatens",
  "impersonates",
  "accepts",
  "keeps",
  "feeds",
  "organizes",
  "sabotages",
  "swaps",
];

const SECRET_OBJECTS = [
  "police evidence",
  "ration alcohol",
  "church funds",
  "union dues",
  "morphine vials",
  "laudanum bottles",
  "stolen bonds",
  "forged deeds",
  "illegal ballots",
  "private letters",
  "gambling books",
  "bootleg whiskey",
  "tax ledgers",
  "charity donations",
  "hospital morphine",
  "company payroll",
  "jury rolls",
  "dock manifests",
  "mortuary tags",
  "charred remains",
  "war medals",
  "counterfeit coupons",
  "burial permits",
  "witness statements",
  "city permits",
  "warehouse keys",
  "court transcripts",
  "pawned heirlooms",
  "stolen jewelry",
  "union blacklist",
  "blackmail photos",
  "falsified licenses",
  "fire insurance claims",
  "bank drafts",
  "customs stamps",
  "railway invoices",
  "sabotage tools",
  "smuggling routes",
  "speakeasy records",
  "adoption papers",
];

const SECRET_CONTEXTS = [
  "for a local syndicate",
  "to cover gambling debts",
  "under mayoral protection",
  "to protect a sibling",
  "for a federal informer",
  "after the strike riots",
  "since the influenza year",
  "to fund a second household",
  "for a rival parish",
  "with police cooperation",
  "behind the union hall",
  "through the rail depot",
  "via church charity drives",
  "for a hidden lover",
  "through city contracts",
  "to bury a war crime",
  "for a smuggling ring",
  "under false identity",
  "with the coroner's clerk",
  "using forged signatures",
  "to silence a witness",
  "with mob approval",
  "through the night market",
  "by threatening debtors",
  "for protection money",
  "with dock foreman help",
  "to avoid prison",
  "to sabotage a rival",
  "through courthouse contacts",
  "for political leverage",
  "to hide family shame",
  "with a paid lookout",
  "using church basements",
  "for wartime profiteers",
  "to evade federal raids",
  "after a fatal accident",
  "for a forbidden affair",
  "to maintain social status",
  "with a bribed registrar",
  "since prohibition began",
];

const SUPERNATURAL_VERBS = [
  "hears",
  "sees",
  "dreams of",
  "summons",
  "feeds",
  "binds",
  "keeps",
  "speaks with",
  "tracks",
  "serves",
  "carries",
  "follows",
  "records",
  "trades with",
  "draws",
  "hides",
  "protects",
  "awakens",
  "consults",
  "inherits",
  "channels",
  "whispers to",
  "sings for",
  "maps",
  "hunts",
  "feeds notes to",
  "measures",
  "borrows time from",
  "convinces",
  "invites",
];

const SUPERNATURAL_OBJECTS = [
  "the drowned choir",
  "a trench ghost",
  "a glass-eyed saint",
  "the midnight ferryman",
  "the attic constellation",
  "a river thing",
  "a mask that remembers",
  "a speaking photograph",
  "the copper idol",
  "the church bell spirit",
  "a coal-pit shadow",
  "a namesless child",
  "the yellow archivist",
  "a bone oracle",
  "the black lighthouse",
  "a clockwork revenant",
  "the chapel underhill",
  "a starved angel",
  "the ink familiar",
  "a whisper engine",
  "the judge in mirrors",
  "a drowned navigator",
  "the train-yard watcher",
  "a scarab choir",
  "the second moon",
  "the cemetery porter",
  "a candleless flame",
  "the theater phantom",
  "a fever saint",
  "the patient in cellars",
  "an obedient nightjar",
  "the glass moth swarm",
  "the watcher beneath wharf",
  "the brass homunculus",
  "a stitched prophet",
  "the violet eclipse",
  "a harbor leviathan",
  "the chapel's double",
  "a devouring psalm",
  "the librarian of bones",
];

const SUPERNATURAL_CONTEXTS = [
  "during rainstorms",
  "at second midnight",
  "in the old boiler room",
  "beneath church stairs",
  "near the river locks",
  "after jazz rehearsals",
  "inside burial tunnels",
  "when bells stop",
  "during eclipses",
  "behind the station clocks",
  "through cracked mirrors",
  "on market day",
  "under the courthouse",
  "in hospital basements",
  "before dawn trains",
  "inside the counting house",
  "on the quarry road",
  "at the last pew",
  "where gaslamps fail",
  "inside a sealed locker",
  "on moonless Thursdays",
  "in fog over marshes",
  "under flood sirens",
  "inside mausoleum vaults",
  "behind theater curtains",
  "during power cuts",
  "at abandoned mills",
  "above the mortuary",
  "in the rector's study",
  "after every funeral",
  "near the lighthouse steps",
  "inside dry wells",
  "in ledger margins",
  "at the city archive",
  "under bridge timbers",
  "inside pantry walls",
  "on windless nights",
  "by the customs yard",
  "in the telegraph office",
  "inside locked trunks",
];

function uniquePush(target: string[], item: string, seen: Set<string>): void {
  const normalized = item.trim().replace(/\s+/g, " ");
  if (!normalized) return;
  if (seen.has(normalized)) return;
  seen.add(normalized);
  target.push(normalized);
}

function buildStreetBank(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const root of STREET_ROOTS) {
    for (const suffix of STREET_SUFFIXES) {
      uniquePush(out, `${root} ${suffix}`, seen);
    }
  }
  return out;
}

function buildTraitBank(targetSize = 12000): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of TRAIT_TEMPERAMENTS) {
    for (const f of TRAIT_FLAWS) {
      for (const q of TRAIT_QUIRKS) {
        uniquePush(out, `${t}, ${f}, ${q}`, seen);
        if (out.length >= targetSize) return out;
      }
    }
  }
  return out;
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

function buildNormalSecretBank(targetSize = 15000): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of SECRET_ACTIONS) {
    for (const obj of SECRET_OBJECTS) {
      for (const ctx of SECRET_CONTEXTS) {
        uniquePush(out, sentenceCase(`${v} ${obj} ${ctx}`), seen);
        if (out.length >= targetSize) return out;
      }
    }
  }
  return out;
}

function buildSupernaturalSecretBank(targetSize = 5000): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of SUPERNATURAL_VERBS) {
    for (const obj of SUPERNATURAL_OBJECTS) {
      for (const ctx of SUPERNATURAL_CONTEXTS) {
        uniquePush(out, sentenceCase(`${v} ${obj} ${ctx}`), seen);
        if (out.length >= targetSize) return out;
      }
    }
  }
  return out;
}

export const STREET_NAME_BANK = buildStreetBank();
export const TRAIT_BANK = buildTraitBank();
export const NORMAL_SECRET_BANK = buildNormalSecretBank();
export const SUPERNATURAL_SECRET_BANK = buildSupernaturalSecretBank();

const INDUSTRIAL_FACILITY_STEMS = [
  "Textile Mill",
  "Foundry",
  "Rail Freight Yard",
  "Machine Works",
  "Canning Plant",
  "Packing House",
  "Soap Works",
  "Ship Chandlery",
  "Coal Depot",
  "Ice Works",
  "Brickworks",
  "Tannery",
  "Printing Works",
  "Warehouse",
  "Timber Yard",
  "Steam Laundry Plant",
  "Boiler Works",
  "Cable Works",
  "Glassworks",
  "Fish Processing Shed",
];

const INDUSTRIAL_FACILITY_MODIFIERS = [
  "No. 1",
  "No. 2",
  "Annex",
  "North Block",
  "South Block",
  "East Block",
  "West Block",
  "Company Works",
];

const SOCIAL_FACILITY_STEMS = [
  "St. Matthew Church",
  "St. Agnes Chapel",
  "City Statehouse",
  "County Courthouse",
  "Municipal Hospital",
  "Charity Hospital",
  "Public Library",
  "Town Newspaper Office",
  "Telegraph Office",
  "Union Hall",
  "Cemetery Grounds",
  "Mortuary Chapel",
  "Public Schoolhouse",
  "Girls Academy",
  "Boys Grammar School",
  "Railway Station Hall",
  "Post Office",
  "City Archive",
  "Fire Brigade House",
  "Police Precinct House",
  "Masonic Lodge Hall",
  "Veterans Hall",
  "Public Bath House",
  "Orphanage Home",
  "Poor Relief Office",
];

const SOCIAL_FACILITY_MODIFIERS = [
  "Main Building",
  "Annex",
  "North Wing",
  "South Wing",
  "East Wing",
  "West Wing",
];

function buildNamedBank(stems: string[], modifiers: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const stem of stems) {
    uniquePush(out, stem, seen);
    for (const mod of modifiers) {
      uniquePush(out, `${stem} ${mod}`, seen);
    }
  }
  return out;
}

export const INDUSTRIAL_FACILITY_BANK = buildNamedBank(
  INDUSTRIAL_FACILITY_STEMS,
  INDUSTRIAL_FACILITY_MODIFIERS,
);

export const SOCIAL_FACILITY_BANK = buildNamedBank(
  SOCIAL_FACILITY_STEMS,
  SOCIAL_FACILITY_MODIFIERS,
);

export interface CacheDatabank {
  traits: string[];
  normalSecrets: string[];
  supernaturalSecrets: string[];
}

export const INTERNAL_CACHE_DATABANK: CacheDatabank = {
  traits: TRAIT_BANK,
  normalSecrets: NORMAL_SECRET_BANK,
  supernaturalSecrets: SUPERNATURAL_SECRET_BANK,
};

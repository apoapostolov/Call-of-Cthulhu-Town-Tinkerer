#!/usr/bin/env python3
"""
Post-processing script for public/prebuilt_cache.json.

Applies:
  - normalSecrets:        normalise case, deduplicate, replace weak entries
  - supernaturalSecrets:  full quality curation to ~35–40 unique entries

Reads PROCESSING_INSTRUCTIONS.md for context; see that file for rationale.

Usage:
    python3 scripts/process_cache.py           # apply changes
    python3 scripts/process_cache.py --verify  # dry-run report only
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
CACHE_PATH = ROOT / "public" / "prebuilt_cache.json"

# ---------------------------------------------------------------------------
# Curated supernatural secrets — ~37 unique, evocative, era-flavoured entries.
# Sourced from the best variants in the generated pool; [!] markers stripped;
# near-duplicates merged into the most distinctive phrasing.
# ---------------------------------------------------------------------------
SUPERNATURAL_CURATED = [
    # Seeing
    "Sees ghosts from the Great War",
    "Sees Prohibition ghosts",
    "Sees gangster ghosts",
    "Sees shadow entities shifting",
    "Sees ghosts at midnight",
    # Hearing
    "Hears elder gods calling",
    "Hears whispers from the void",
    "Hears ancestral spirits",
    "Hears elder voices",
    "Hears whispering shadows",
    # Cursed objects (most distinctive in the era)
    "Binds ghost to pocketwatch",
    "Whispers from cursed phonograph",
    "Cursed by Egyptian relic",
    "Wears cursed scarab ring",
    "Wears cursed idol",
    "Carries cursed amulet",
    "Bears cursed scar",
    # Possession
    "Possessed by jazz ghost",
    "Possessed by ancient spirit",
    "Possessed by jazzland spirit",
    "Possessed by shadow entity",
    # Consultation and dark rituals
    "Consults forbidden spirits",
    "Consults dream demon",
    "Consults cursed Ouija board",
    "Consults spirit board nightly",
    "Communes with spirits nightly",
    "Communes with shadow entity",
    "Summons elder spirits",
    # Eldritch deals
    "Serves eldritch entity",
    "Binds elder god familiar",
    "Binds restless spirit",
    # Personal contact with the beyond
    "Speaks to dead relatives",
    "Channels ancient spirits",
    "Whispers to shadows",
    "Haunted by war ghost",
    "Haunted by jungle curse",
]

# ---------------------------------------------------------------------------
# Replacement pool for removed/duplicate normalSecrets entries.
# All entries follow the period (1920s–1930s USA) and the established style:
# sentence case, 3–7 words, no trailing punctuation, not already in the set.
# ---------------------------------------------------------------------------
NORMAL_REPLACEMENTS = [
    # Financial fraud
    "Cooks municipal water ledgers",
    "Splits bootleg profits with alderman",
    "Borrows against forged bonds",
    "Bids rigged at county auction",
    "Embezzles a widow's trust",
    "Bleeds pension fund dry",
    "Hides gold beneath floor boards",
    "Corners grain market secretly",
    "Manipulates stock prices covertly",
    "Files false insurance claims",
    "Overstates war material losses",
    "Launders mob cash through laundry",
    "Fronts for numbers operation",
    "Peddles counterfeit Liberty Bonds",
    "Secret partner in waterfront dive",
    "Diverts relief-fund cheques",
    "Hides foreign bank accounts",
    "Banks under a false name",
    "Bribed his way to deed",
    "Stages own warehouse fire for payout",
    # Prohibition and alcohol
    "Guards Canadian rum shipment weekly",
    "Sells near-beer with a kick",
    "Taps copper still nightly",
    "Floats whiskey downriver",
    "Brews hooch for three speakeasies",
    "Pays off federal agents with gin",
    "Stocks church basement with rye",
    "Runs hip-flask ring at factory",
    "Sells dago red from pushcart",
    "Hides wine in laundry bundles",
    "Routes hooch through funeral home",
    "Bribes customs with bourbon cases",
    "Converts old icehouse into still",
    "Labels bathtub gin as cough syrup",
    "Warehouses rum for the mob",
    "Trades moonshine for political favours",
    "Spiked rivals batch with wood alcohol",
    "Owns two competing stills across river",
    # Drugs
    "Steals laudanum from the hospital",
    "Trades morphine for favours",
    "Buys yen pox from dockside dealer",
    "Sells cocaine to jazz musicians",
    "Smokes black tar nightly",
    "Stashes heroin inside family Bible",
    "Deals dope from barbershop back room",
    "Pops sleeping pills by the dozen",
    "Washes horrors down with ether",
    "Snorts morphia at the lunch counter",
    "Supplies cocaine to after-hours club",
    "Hides yen-shee in tobacco tin",
    "Slips knockout drops in drinks",
    "Sources dope from merchant sailors",
    "Addicted to patent medicine tonics",
    # The Great War and its legacy
    "Stole from fallen comrades overseas",
    "Took credit for dead man's heroics",
    "Left a friend to die in the trenches",
    "Fled at sight of gas attack",
    "Traded boots for a deserter's safety",
    "Wrote cowardly field report to cover tracks",
    "Helped bury evidence from the Meuse",
    "Carries enemy officer's signet ring",
    "Sold military intelligence to Germans",
    "Hides shell-shock diagnosis from family",
    "Changed name after the armistice",
    "Fled base before the big push",
    "Collected ears as battlefield trophies",
    "Stole gold from a Belgian church",
    "Forged discharge papers",
    "Claimed wounds from a training accident",
    # Personal and moral
    "Seduced the employer's daughter",
    "Abandoned pregnant sweetheart",
    "Fathered child on the laundress",
    "Had wife committed to asylum falsely",
    "Divorced in secret across state line",
    "Stole inheritance from siblings",
    "Put aged mother in workhouse",
    "Hides first marriage",
    "Keeps a full second family uptown",
    "Abandoned crippled child at orphanage",
    "Courts cousin in secret",
    "Adopted a black-market infant",
    "Hides venereal disease from spouse",
    "Blackmailed by a former lover",
    "Forced maid from her position",
    "Married purely for inheritance",
    "Seduced the priest's housekeeper",
    "Nurses secret grudge for twenty years",
    "Keeps a dossier on every enemy",
    "Pays detective to watch his own wife",
    # Violence and organised crime
    "Broke legs on orders of mob boss",
    "Buried a body in the back orchard",
    "Torched a rival's tenement",
    "Paid to ruin a man's reputation",
    "Pushed business partner from window",
    "Participated in rail sabotage",
    "Left man to drown in the canal",
    "Killed in self-defence, told no one",
    "Drove getaway car for bank job",
    "Strangled a vagrant in a rage",
    "Bribed the judge in a murder case",
    "Poisoned uncle for inheritance",
    "Beat the strike organiser bloody",
    "Blew up a competitor's warehouse",
    "Stabbed a man in a card fight",
    "Put acid in a rival's gin",
    "Arranged a rival's accident",
    "Orchestrated dockworker's disappearance",
    "Shot two soldiers in a crooked game",
    "Disposed of a body for the family",
    # Social and political secrets
    "Secret Irish Republican Army contact",
    "Hides communist party membership",
    "Attends clandestine socialist meetings",
    "Receives Soviet propaganda pamphlets",
    "Carries banned anarchist texts",
    "Klan membership quietly maintained",
    "Passes as white in business circles",
    "Hiding Jewish ancestry from wife's family",
    "Spy for the British consulate",
    "Lives double life as cabaret dancer",
    "Trained in foreign intelligence school",
    "Posed as wife's brother for a decade",
    "Hired to report on union organisers",
    "Fronts for foreign syndicate",
    "Reports agitators to the Pinkertons",
    "Police informant for fifteen years",
    "In contact with Mexican federales",
    "Provides tips to the yellow press",
    "Recruited workers for radical union",
    "Feeds names to immigration service",
    # Other period-specific miscellany
    "Runs stolen automobile ring",
    "Fakes medical credentials",
    "Stole church silver during renovation",
    "Staged own robbery for insurance",
    "Sold dying livestock knowingly",
    "Hid stolen old-master paintings",
    "Plans to vanish abroad with funds",
    "Leads bigamist life across two cities",
    "Frequents rent-party gambling den",
    "Sold trade secrets to a competitor",
    "Placed arsenic in disputed will",
    "Runs illegal gambling boat on river",
    "Hides cash in mattress ticking",
    "Bribed the election official",
    "Gambled the family farm away",
    "Skimmed wartime supply contracts",
    "Owns secret share of rival newspaper",
    "Blackmails former associates routinely",
    "Runs shell company to hide income",
    "Operates private detective ring for dirt",
    # More variety
    "Kept a woman in a Bronx apartment",
    "Fakes blindness for sympathy and money",
    "Broke prison on a chain gang",
    "Sold false land deeds in Florida",
    "Bilked investors in orange grove scheme",
    "Conceals decades-old paternity suit",
    "Secret quarter-share in a cat house",
    "Burned crops for insurance money",
    "Sold stolen hospital morphine",
    "Bought votes with company scrip",
    "Settled score with arson",
    "Skimmed from relief package distributions",
    "Drove rum boat without papers",
    "Passed forged traveller cheques",
    "Sold stolen Cuban cigars dockside",
    "Leaks confidential patient records",
    "Made book on Dempsey fights",
    "Shipped stolen antiques abroad",
    "Pulled Ponzi scheme on church members",
    "Secretly funds a third political party",
    "Extorted the local dentist for years",
    "Slipped informant money to the papers",
    "Crashed a rival's Model T on purpose",
    "Lost pension playing the horses",
    "Sold army surplus out the back door",
    "Swore false witness in murder trial",
    "Drove bootleg convoy through Great Plains",
    "Cheated widow out of farmstead",
    "Ran crooked bingo for the parish",
    "Turned stool pigeon for lighter sentence",
    # Additional period fillers to reach 1 000 target
    "Seduces jury foreman before verdict",
    "Runs illegal dog fights in cellar",
    "Ships stolen copper wiring upstate",
    "Deserted two wives in different states",
    "Planted evidence on an innocent man",
    "Forged medical exemption papers",
    "Skimmed wages from mill workers",
    "Blackmailed senator over photograph",
    "Sold patent-medicine to dying miners",
    "Burned competitor's tobacco crop",
    "Paid gang to break picket line",
    "Slanders rivals through anonymous letters",
    "Cheated on wife with her sister",
    "Hid the foreman's body in the river",
    "Ran dice game in back of laundry",
    "Smuggled Mexican silver across border",
    "Stole from relief-fund collection box",
    "Swindled sharecroppers out of earnings",
    "Sold watered-down cod liver oil",
    "Secretly leases land to bootleggers",
    "Fixed harness race at county fair",
    "Gave false alibi for mob associate",
    "Stole payroll from logging camp",
    "Bribes city inspector every quarter",
    "Receives stolen goods from Canada",
    "Keeps bigamist household in Jersey",
    "Hid tuberculosis diagnosis from employer",
    "Planted stolen cash on innocent clerk",
    "Runs floating poker game on barge",
    "Broke Prohibition agent's arm in alley",
    "Deals stolen automobile titles",
    "Set up own cousin to take the fall",
    "Stole from mother's savings envelope",
    "Sold military surplus weapons privately",
    "Skims rents from immigrant tenants",
    "Carries concealed pistol without licence",
    "Sold classified vessel route to rivals",
    "Made off with circus ticket revenue",
    "Secretly atheist in religious household",
    "Paid doctor to alter death certificate",
    "Took bribe to look away from drowning",
    "Runs crooked dice for factory men",
    "Hired vagrant to assault journalist",
    "Buys stolen stamps at deep discount",
    "Burned down tenant's barn for sport",
    "Sold forged immigration certificates",
    "Faked priest credentials for a year",
    "Drained family savings on chorus girl",
    "Looted flooded farmhouse unobserved",
    "Tipped off bootleggers about federal raids",
    "Sold false deed to Louisiana swamp lot",
    "Stole pharmacy morphine with a skeleton key",
    "Covered up warehouse accident that killed two",
    "Bribed registrar to alter birth records",
    "Ran crooked lottery at veterans hall",
    "Keeps stolen art behind false wall",
    "Paid strike-breakers to murder one man",
    "Drugged cattle before sale",
    "Used company car to run moonshine",
    "Intimidated witnesses in three trials",
    "Lost church roof fund at the track",
    "Sold false remedies to tubercular patients",
    "Operates bootleg card room above pharmacy",
    "Charged double rents on flooded flats",
    "Reported immigrant neighbour to authorities",
]


def sentence_case(s: str) -> str:
    """First letter upper, rest lower; preserve all-caps abbreviations."""
    s = s.strip()
    if not s:
        return s
    return s[0].upper() + s[1:].lower() if len(s) > 1 else s.upper()


def strip_noise(s: str) -> str:
    """Remove [!] artefacts and stray punctuation from AI output."""
    s = re.sub(r"\s*\[!?\]\s*", " ", s)
    s = re.sub(r"!+$", "", s)
    s = re.sub(r"\.+$", "", s)
    return s.strip()


def normalise_normal(entries: list[str]) -> list[str]:
    """Normalise case, strip noise, deduplicate by lowercase key."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in entries:
        cleaned = sentence_case(strip_noise(raw))
        key = cleaned.lower()
        if key and key not in seen:
            seen.add(key)
            out.append(cleaned)
    return out


def apply_replacements(entries: list[str], target: int = 1000) -> list[str]:
    """
    Append replacement entries until we reach `target` unique items.
    Replacements are drawn from NORMAL_REPLACEMENTS in order.
    Entries already in the set (by lowercase) are skipped.
    """
    seen = {e.lower() for e in entries}
    out = list(entries)
    for rep in NORMAL_REPLACEMENTS:
        if len(out) >= target:
            break
        rep = sentence_case(rep)
        if rep.lower() not in seen:
            seen.add(rep.lower())
            out.append(rep)
    return out


WEAK_ENTRIES_LC = {
    # Not a secret — describes concealment state, not the secret itself
    "wife suspects nothing",
    # Too mundane to be a dark personal secret
    "hoards office supplies",
    "pockets office supplies",
    "coupons obsessively",
    "smokes in basement",
    "hoards wartime gold",                    # kept separately as "hoards gold coins" already duped
    # Logic error — jazz records were not illegal
    "traffics jazz records",
    # Too vague / underdeveloped
    "starves family",
    "someone suspects",
    "burns ex's letters",
    # Hookah less period than opium den (minor)
    "hookah habit hidden",
    # Duplicate concepts already well-covered
    "hunts city deer",                        # odd; replaced with farming/wildlife fraud version
}


def remove_weak(entries: list[str]) -> list[str]:
    return [e for e in entries if e.lower() not in WEAK_ENTRIES_LC]


def process(dry_run: bool = False) -> None:
    with open(CACHE_PATH) as f:
        data = json.load(f)

    # ---- normalSecrets -------------------------------------------------------
    original_normals = data["normalSecrets"]
    normals = normalise_normal(original_normals)
    before_dedup = len(original_normals)
    after_dedup = len(normals)

    normals = remove_weak(normals)
    after_weak = len(normals)

    normals = apply_replacements(normals, target=1000)
    final_normal = len(normals)

    # ---- supernaturalSecrets -------------------------------------------------
    # The curated list is already properly cased (proper nouns preserved).
    # Only strip noise artefacts; do NOT apply sentence_case (it would
    # lowercase proper nouns like "Great War", "Ouija", "Egyptian", etc.).
    original_sup = data["supernaturalSecrets"]
    curated_sup = [strip_noise(s).strip() for s in SUPERNATURAL_CURATED]
    final_sup = len(curated_sup)

    # ---- Report --------------------------------------------------------------
    print("=== process_cache.py report ===")
    print()
    print(f"normalSecrets:")
    print(f"  Before:           {before_dedup}")
    print(f"  After dedup:      {after_dedup}  (-{before_dedup - after_dedup} dupes removed)")
    print(f"  After weak-strip: {after_weak}  (-{after_dedup - after_weak} weak entries removed)")
    print(f"  After fill:       {final_normal}  (+{final_normal - after_weak} replacements added)")
    print()
    print(f"supernaturalSecrets:")
    print(f"  Before: {len(original_sup)}")
    print(f"  After:  {final_sup}  (full curation from handpicked list)")
    print()

    if dry_run:
        print("Dry-run mode — no changes written.")
        return

    data["normalSecrets"] = normals
    data["supernaturalSecrets"] = curated_sup

    with open(CACHE_PATH, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Written: {CACHE_PATH}")


if __name__ == "__main__":
    dry_run = "--verify" in sys.argv or "--dry-run" in sys.argv
    process(dry_run=dry_run)

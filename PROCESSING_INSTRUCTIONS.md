# Post-Processing Instructions for `public/prebuilt_cache.json`

These instructions are for an AI agent (or human) who needs to clean and curate
`public/prebuilt_cache.json` after new batches of AI-generated data have been
appended by the generation script.

---

## File Structure

```json
{
  "traits":               ["string", ...],   // ~1000 entries
  "normalSecrets":        ["string", ...],   // ~1000 entries
  "supernaturalSecrets":  ["string", ...]    // ~35–50 entries (target)
}
```

All three fields are plain arrays of strings. Strings are short phrases in the
style of period fiction NPC flavour — imperative voice or noun-phrase,
**3–8 words**, no trailing punctuation, sentence case only.

---

## 1  `normalSecrets` — Light Era Correction

### Goal
Keep all entries that already feel authentically 1920s–1930s American.
Apply minimal rewording only where an entry feels anachronistic, too modern, too
bland to be a personal *secret*, or is a near-duplicate of another entry.

### Process

**Step 1 — Normalise case.**
Convert every entry to sentence case: first letter uppercase, remainder
lowercase (preserve proper nouns: Great War, Prohibition, etc.).

**Step 2 — Deduplicate.**
After normalisation, remove exact duplicates. Keep the first occurrence.

**Step 3 — Flag and replace weak entries.**
After dedup, review the list for the categories below and replace flagged
entries with period-appropriate alternatives of the same word-count style.

| Category | Examples to flag | Reason |
|---|---|---|
| Not a secret | "Wife suspects nothing" | Describes concealment outcome, not the secret |
| Too mundane | "Hoards office supplies", "Coupons obsessively" | Not a dark personal secret |
| Anachronistic | Any reference to modern technology, modern slang | Shouldn't feel post-1940 |
| Vague/empty | "Starves family", "Burns ex's letters" | Too underdeveloped to be evocative |
| Logic error | "Traffics jazz records" | Jazz records were legal — not a secret |

**Step 4 — Target count.**
End with 900–1 000 unique entries. If deduplication left the pool short, add
fresh entries following the style guide below.

### Era Reference Palette

Draw replacement secrets from these authentic 1920s–1930s contexts:

- **Prohibition** — speakeasies, bathtub gin, rum-running, federal agents, stills
- **The Jazz Age** — jazz dens, flappers, rent parties, Harlem, nightclubs
- **The Great War aftermath** — shell shock, desertion, stolen medals, false heroism
- **Gangland** — the Mob, protection rackets, numbers runners, Tommy guns, fixers
- **Drugs** — laudanum, morphine, cocaine, opium dens, dope peddlers
- **Finance** — Ponzi schemes, bucket shops, margin calls, stock fraud, loan sharks
- **Social vice** — brothels, kept women, bigamy, illegitimate children, blackmail
- **Class/race** — passing as another race, Klan membership, anti-union violence
- **Politics** — Communist Party, anarchist cells, Soviet pamphlets, Pinkertons
- **Violence** — murder for hire, arson, strong-arm debt collection, acid attacks
- **Colonial/exotic** — Egyptian artefacts, Caribbean cults, South American contacts

### Style Guide

```
✓ Steals laudanum from hospital
✓ Buried a body in the orchard
✓ Owns shares in rival coroner
✓ Fathered child on laundress
✓ Fled base before big push
✗ Did something bad             (too vague)
✗ Has financial problems        (not a secret)
✗ Hacks the newspaper           (anachronistic)
```

---

## 2  `supernaturalSecrets` — Full Quality Curation

### Goal
Reduce the pool to **35–50 entries** of high quality.  
Quantity is strictly secondary to quality.

Each kept entry should satisfy **all three tests**:

1. **Unique concept** — not a restatement of another kept entry
2. **Open to interpretation** — could be metaphorical, delusional, or genuinely supernatural
3. **Era-flavoured** — feels like it belongs in 1920s America or the Mythos

### Cluster Consolidation

The generated pool is heavily clustered. For each cluster, keep the single most
evocative variant and discard the rest.

| Cluster | Keep one example | Discard |
|---|---|---|
| "sees/hears ghosts nightly" | "Sees ghosts from the Great War" | All other near-identical "ghosts nightly" variants |
| "consults spirit medium" | "Consults spirit medium weekly" | All other "spirit medium" variants |
| "hears elder whispers" | "Hears elder gods calling" | All other "elder whispers/voices" variants |
| "consults spirit/Ouija board" | "Consults cursed Ouija board" | All other "spirit board" variants |
| "possessed by spirit" | "Possessed by jazz ghost" | Duplicates |
| "summons shadow entities" | "Summons elder spirits" | Duplicates |
| "communes with shadows" | "Communes with shadow entity" | Duplicates |

### Prioritise These Concepts (period-specific highlights)

- **Jazz-age supernatural** — jazz ghosts, jazzland spirits, phonograph whispers
- **War-haunted** — Great War dead, trench apparitions
- **Prohibition-specific** — Prohibition ghosts, gangster wraiths
- **Object-bound** — ghost bound to pocketwatch, cursed phonograph, cursed scarab
- **Archaeological/Colonial** — Egyptian curses, jungle hexes
- **Lovecraftian but subdued** — elder gods, void whispers, shadow entities, eldritch service
- **Mundane-seeming gateways** — spirit boards, dream demons, dream ghosts

### `[!]` Markers

Strip all `[!]` markers and similar noise from every kept entry.  
These were AI annotation artefacts and must not appear in the final data.

### Formatting Rules

```
✓ Sees ghosts from the Great War
✓ Binds ghost to pocketwatch
✓ Whispers from cursed phonograph
✗ Sees ghosts nightly [!]          (has noise marker)
✗ sees shadow entities             (lowercase first letter)
✗ Sees ghosts nightly.             (trailing punctuation)
```

---

## 3  Running the Post-Process

A reference implementation lives at `scripts/process_cache.py`.
Run it from the project root:

```bash
python3 scripts/process_cache.py
```

The script reads `public/prebuilt_cache.json`, applies all transformations in
place, writes the result back, and prints a summary of changes.

After running:

1. Verify the output with `python3 scripts/process_cache.py --verify`
2. Rebuild: `npm run build`
3. Update `DEVELOPMENT_LOG.md`

---

## 4  What NOT to Change

- **`traits`** — do not post-process traits; they are short personality strings
  and are already high quality. The AI generation prompt and filtering handle
  these adequately.
- **Array keys** — do not rename the top-level keys.
- **Item count for `normalSecrets`** — keep close to 1 000; the app uses a
  non-repeating shuffle and a pool smaller than the active population degrades
  the cache check.
- **`supernaturalSecrets` minimum** — never go below 10 entries; the cache
  assignment logic requires at least as many entries as there are supernatural
  characters in the generated population (roughly 1% of adults).

# PROCESSING_DATA_CACHE.md

Guide for maintaining high-volume data caches and internal databanks without context overload.

This project now has built-in databanks for:
- `street names`
- `traits`
- `normal secrets`
- `supernatural secrets`

External JSON cache files are import-only enrichment sources.

---

## 1. Data Model

Canonical shape:

```json
{
  "traits": ["..."],
  "normalSecrets": ["..."],
  "supernaturalSecrets": ["..."]
}
```

Street names are maintained in source databanks, not in this JSON object.

---

## 2. Scale-Safe Processing Strategy

Never ask one model call to review 100k+ entries directly. Use staged, batched pipelines:

1. Normalize
2. Partition
3. Prune duplicates/noise in batches
4. Score and prune weak entries in batches
5. Generate targeted additions in small batches
6. Merge + global dedupe
7. Verify quality constraints

### Batch size recommendations

- Dedup batches: `1,000 - 3,000` rows per call
- Quality pruning batches: `300 - 800` rows per call
- Generation batches: `100 - 300` new candidates per call
- Final merge windows: `5,000 - 10,000` rows per process pass

---

## 3. Normalization Rules

Apply before any AI pruning:

- Trim whitespace
- Collapse repeated spaces
- Remove trailing punctuation for short secret/trait lines
- Standardize comma spacing in traits (`", "`)
- Case normalization:
  - Traits: lowercase descriptors in comma-separated phrase
  - Secrets: sentence case
- Drop empty strings

---

## 4. Duplicate Pruning at 100k+

Use a two-pass method:

### Pass A: Fast deterministic dedupe

- Exact string match dedupe (`Set` / hash)
- Normalized string dedupe (after cleanup rules)

### Pass B: Semantic-near duplicate pruning (AI)

- Chunk entries into windows (e.g. 1,500)
- For each window, ask AI to output only IDs to remove where meaning is near-identical
- Keep one strongest variant per cluster

Important: AI should return compact ID lists, not rewritten full datasets.

---

## 5. Weak/Boring Entry Pruning

Run AI on moderate batches with strict rubric. Remove entries that are:

- Vague (`"has dark past"`)
- Generic or flavorless
- Tautological duplicates
- Anachronistic (post-era wording)
- Non-actionable for play hooks

Require AI response format:

```json
{
  "drop_ids": [12, 48, 77],
  "reason_codes": {
    "12": "vague",
    "48": "anachronistic",
    "77": "duplicate"
  }
}
```

---

## 6. Controlled Expansion (Add +500 to 100k+)

To add a small amount safely:

1. Produce candidates in micro-batches (`100-200`) with strict style prompts
2. Normalize candidates
3. Run deterministic dedupe against full corpus hash set
4. Run AI novelty filter only on survivors against sampled nearest neighbors
5. Keep only net-new, high-signal additions

Do not ask AI to compare all 100k records directly.

---

## 7. Suggested Workflow Commands

Example high-level pipeline:

1. Export source dataset to newline JSON (`id`, `text`)
2. Run deterministic cleanup + exact dedupe script
3. Process semantic dedupe windows with AI
4. Process quality-prune windows with AI
5. Generate candidate additions in small batches
6. Merge + verify counts and constraints
7. Import enriched cache JSON into app (optional)

---

## 8. Quality Constraints by Bank

### Traits

- 2–3 descriptors, comma-separated
- At least one potential flaw/edge
- No full sentences

### Normal secrets

- Compact actionable hook
- Era-compatible wording
- Avoid modern references

### Supernatural secrets

- Distinct concept per line
- Mythos-compatible ambiguity preferred
- Avoid repetitive "sees/hears whispers" clones

### Street names

- Era-appropriate naming conventions
- Avoid modern branded terms

---

## 9. Memory and Context Protection

- Keep each AI call stateless except for rubric and current batch
- Pass only sampled exemplars from global corpus when needed
- Persist intermediate outputs to disk after every batch
- Resume from checkpoints instead of rerunning full pipelines

Recommended checkpoint cadence:

- every semantic dedupe batch
- every quality-prune batch
- every generation batch

---

## 10. Verification Checklist

Before accepting processed data:

- [ ] No empty strings
- [ ] Deterministic dedupe complete
- [ ] Semantic duplicates pruned to acceptable level
- [ ] Style constraints met per bank
- [ ] Output counts align with target sizes
- [ ] Random sample QA reviewed manually
- [ ] Build passes after import

---

## 11. Integration Notes

- Internal databanks are the primary source.
- External JSON is enrichment/import only.
- Keep import pipelines idempotent (safe to rerun).
- Always preserve deterministic generation behavior for the same seed.

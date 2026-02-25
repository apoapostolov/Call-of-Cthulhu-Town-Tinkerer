# PROCESSING_DATA_CACHE.md

## AI Operator Instructions: Updating `src/databanks.ts` Safely at Scale

This document is written for AI agents that must add/prune databank entries without breaking context limits or corrupting source structure.

Primary goals:
- keep `databanks.ts` valid TypeScript
- process huge datasets (100k+ candidates) in bounded batches
- support any-sized add/remove operations
- avoid near-duplicate and low-quality drift

---

## 1. Hard Rules

1. Never load or reason about the full 100k+ candidate corpus in one prompt.
2. Never rewrite `databanks.ts` from scratch unless explicitly asked.
3. Apply deterministic normalization before semantic pruning.
4. Keep edits atomic and auditable: one bank per operation cycle.
5. Preserve export names and schema expected by the app.

---

## 2. Banks in Scope

In `src/databanks.ts`:
- `STREET_NAME_BANK`
- `TRAIT_BANK`
- `NORMAL_SECRET_BANK`
- `SUPERNATURAL_SECRET_BANK`
- `INDUSTRIAL_FACILITY_BANK`
- `SOCIAL_FACILITY_BANK`

Cache-facing bundle:
- `INTERNAL_CACHE_DATABANK`

---

## 3. Batch Protocol (100k-token-safe)

### Stage A: Deterministic normalization

Per line:
- trim
- collapse internal whitespace
- remove empty strings
- normalize comma spacing for traits
- sentence case where applicable (secrets/facility names)

### Stage B: Exact dedupe

- dedupe by normalized text hash
- keep first occurrence (stable)

### Stage C: Semantic prune in chunks

Chunk sizes:
- pruning window: 300–1,000 items
- expansion generation: 100–300 items per batch

For each chunk, AI returns only compact decisions, e.g.:

```json
{
  "drop_ids": [14, 77, 201],
  "reason": {
    "14": "duplicate",
    "77": "near_duplicate",
    "201": "boring"
  }
}
```

Do not request rewritten full arrays in each batch.

### Stage D: Merge + checkpoint

After every batch:
- apply changes to an intermediate JSON checkpoint
- persist to disk
- continue from checkpoint on next batch

---

## 4. Additions: Any Volume

When adding N entries (N can be 10 or 100,000):

1. Split source candidates into fixed batches (`<=300`).
2. Normalize each batch.
3. Exact-dedupe against current global hash set.
4. Semantic novelty prune (batch-local + sampled nearest neighbors from bank).
5. Append accepted candidates to checkpoint.
6. Repeat until done.
7. Final global dedupe pass.

Important: a large add operation is many bounded micro-operations, never one monolithic prompt.

---

## 5. Pruning: Any Volume

When removing boring/duplicate/similar entries at scale:

1. Export bank as chunk files.
2. For each chunk, ask AI only for IDs to remove.
3. Apply removals to checkpoint.
4. Re-run a global similarity pass on surviving items (again chunked).
5. Keep one strongest representative for each near-duplicate cluster.

If a bank shrinks too much, run controlled replenishment in generation batches.

---

## 6. Safe Editing of `databanks.ts`

Preferred method:
1. Process data in JSON checkpoints externally.
2. Once final, patch only the relevant generation arrays/builders in `databanks.ts`.
3. Keep code shape stable (exports and helper function signatures).

Avoid manual large inline edits without checkpoints.

---

## 7. Tooling Added

Use the helper script:

`ts-node scripts/databank_batch_tool.ts`

Commands:

1. Export bank chunks:
```bash
ts-node scripts/databank_batch_tool.ts export <bank> <chunkSize> <outDir>
```

2. Preview prune impact from a line list:
```bash
ts-node scripts/databank_batch_tool.ts prune-preview <bank> <dropListFile>
```

3. Preview add impact from a line list:
```bash
ts-node scripts/databank_batch_tool.ts add-preview <bank> <addListFile>
```

Banks:
- `street`
- `traits`
- `normal_secrets`
- `supernatural_secrets`
- `industrial_facilities`
- `social_facilities`

---

## 8. Quality Rubrics by Bank

### Streets
- period-appropriate naming
- no modern commercial branding
- no obvious duplicates (`Main Street` vs `Main St` should be normalized strategy-aware)

### Traits
- concise descriptor triplets
- include at least one edge/flaw tendency
- avoid sentence-style entries

### Normal secrets
- actionable mystery hook
- period-consistent tone
- no modern slang/tech

### Supernatural secrets
- distinct mythic concept
- avoid repetitive whisper/ghost templates unless strongly differentiated

### Industrial facilities
- 1920s-appropriate industrial infrastructure
- non-residential worker destinations

### Social facilities
- civic/institutional places (church, state, press, medicine, education, mortuary)
- non-residential worker destinations

---

## 9. Output Verification Checklist

Before finalizing edits:
- [ ] TypeScript builds (`npm run build`)
- [ ] No empty entries in updated banks
- [ ] Exact duplicates removed
- [ ] Near-duplicates pruned in sampled QA
- [ ] Export names unchanged
- [ ] `INTERNAL_CACHE_DATABANK` still wired correctly

---

## 10. Failure Recovery

If batch processing fails midway:
- resume from latest checkpoint file
- do not restart from raw corpus
- keep an append-only audit log of accepted/pruned counts per batch

This is required for stable long-running curation jobs.

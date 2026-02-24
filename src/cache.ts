/**
 * Persistent growing cache of AI-generated traits and secrets.
 * Stored in localStorage. Each AI run appends unique new entries.
 * When the pool is large enough to cover the current population,
 * fillFromCache() assigns entries deterministically without an AI call.
 */

import type { AIPersonData, AIResult } from "./ai.ts";
import type { Person } from "./logic.ts";
import { mulberry32 } from "./logic.ts";

const CACHE_KEY = "coc_ai_cache";
/** Stop appending once a single pool reaches this size (~1.5 MB per pool is fine). */
const MAX_POOL = 25000;

interface AICache {
  traits: string[];
  normalSecrets: string[];
  supernaturalSecrets: string[];
}

function emptyCache(): AICache {
  return { traits: [], normalSecrets: [], supernaturalSecrets: [] };
}

function loadCache(): AICache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as Partial<AICache>;
    return {
      traits: Array.isArray(parsed.traits) ? (parsed.traits as string[]) : [],
      normalSecrets: Array.isArray(parsed.normalSecrets)
        ? (parsed.normalSecrets as string[])
        : [],
      supernaturalSecrets: Array.isArray(parsed.supernaturalSecrets)
        ? (parsed.supernaturalSecrets as string[])
        : [],
    };
  } catch {
    return emptyCache();
  }
}

function saveCache(c: AICache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // localStorage quota exceeded — trim oldest 10% from each pool and retry once
    try {
      c.traits = c.traits.slice(-Math.floor(c.traits.length * 0.9));
      c.normalSecrets = c.normalSecrets.slice(
        -Math.floor(c.normalSecrets.length * 0.9),
      );
      c.supernaturalSecrets = c.supernaturalSecrets.slice(
        -Math.floor(c.supernaturalSecrets.length * 0.9),
      );
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      console.warn("AI cache: localStorage full — new entries not persisted.");
    }
  }
}

export interface CacheStats {
  traits: number;
  normal: number;
  supernatural: number;
}

export function getCacheStats(): CacheStats {
  const c = loadCache();
  return {
    traits: c.traits.length,
    normal: c.normalSecrets.length,
    supernatural: c.supernaturalSecrets.length,
  };
}

/**
 * Merge an externally provided cache fragment into the existing stored cache.
 * Used during startup to incorporate a prebuilt cache file shipped with the
 * application. Entries are appended only if they are unique and pools are
 * capped by MAX_POOL. The operation is idempotent.
 */
export function mergeCache(other: Partial<AICache>): void {
  const c = loadCache();
  const traitsSet = new Set(c.traits);
  const normalSet = new Set(c.normalSecrets);
  const supSet = new Set(c.supernaturalSecrets);

  if (Array.isArray(other.traits)) {
    for (const t of other.traits) {
      if (c.traits.length >= MAX_POOL) break;
      const tt = t.trim();
      if (tt && !traitsSet.has(tt)) {
        c.traits.push(tt);
        traitsSet.add(tt);
      }
    }
  }
  if (Array.isArray(other.normalSecrets)) {
    for (const s of other.normalSecrets) {
      if (c.normalSecrets.length >= MAX_POOL) break;
      const ss = s.trim();
      if (ss && !normalSet.has(ss)) {
        c.normalSecrets.push(ss);
        normalSet.add(ss);
      }
    }
  }
  if (Array.isArray(other.supernaturalSecrets)) {
    for (const s of other.supernaturalSecrets) {
      if (c.supernaturalSecrets.length >= MAX_POOL) break;
      const ss = s.trim();
      if (ss && !supSet.has(ss)) {
        c.supernaturalSecrets.push(ss);
        supSet.add(ss);
      }
    }
  }

  saveCache(c);
}

/**
 * Append unique new trait/secret entries from an AI result to the growing cache.
 * Skips duplicates. Respects MAX_POOL ceiling.
 * AIResult must carry supernaturalIds so secrets are saved to the right pool.
 */
export function appendToCache(result: AIResult): {
  traitsAdded: number;
  secretsAdded: number;
} {
  const c = loadCache();
  const traitsSet = new Set(c.traits);
  const normalSet = new Set(c.normalSecrets);
  const supSet = new Set(c.supernaturalSecrets);

  let traitsAdded = 0;
  let secretsAdded = 0;

  for (const [id, data] of result.people.entries()) {
    const trait = data.traits.trim();
    const secret = data.secret.trim();
    const isSup = result.supernaturalIds.has(id);

    if (trait && !traitsSet.has(trait) && c.traits.length < MAX_POOL) {
      c.traits.push(trait);
      traitsSet.add(trait);
      traitsAdded++;
    }

    if (isSup) {
      if (
        secret &&
        !supSet.has(secret) &&
        c.supernaturalSecrets.length < MAX_POOL
      ) {
        c.supernaturalSecrets.push(secret);
        supSet.add(secret);
        secretsAdded++;
      }
    } else {
      if (
        secret &&
        !normalSet.has(secret) &&
        c.normalSecrets.length < MAX_POOL
      ) {
        c.normalSecrets.push(secret);
        normalSet.add(secret);
        secretsAdded++;
      }
    }
  }

  saveCache(c);
  return { traitsAdded, secretsAdded };
}

/** Fisher-Yates shuffle of [0..length-1] using a seeded RNG. */
function shuffleIndices(length: number, seed: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Try to fill every adult in `people` from the cache alone.
 * Returns a fully populated Map<personId, AIPersonData> when the cache is large
 * enough to give every adult a *unique*, non-repeating trait/secret pair.
 * Returns null when the cache is too small.
 *
 * Results are fully deterministic for the same seed — same seed always
 * assigns the same cache entries to the same characters.
 *
 * IMPORTANT: uses the exact same supernatural-set algorithm as ai.ts so that
 * supernatural secrets are assigned to the right characters.
 */
export function fillFromCache(
  people: Person[],
  seed: number,
  maxAdults: number,
): Map<number, AIPersonData> | null {
  const c = loadCache();
  const adults = people.filter((p) => p.job !== "Child").slice(0, maxAdults);
  if (adults.length === 0) return null;

  // Mirror the exact supernatural-selection logic in ai.ts
  const rng = mulberry32(seed ^ 0xdeadbeef); // same constant as ai.ts
  const supCount = Math.max(1, Math.round(adults.length * 0.01));
  const shuffledAdults = [...adults];
  for (let i = shuffledAdults.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledAdults[i], shuffledAdults[j]] = [
      shuffledAdults[j],
      shuffledAdults[i],
    ];
  }
  const supernaturalIds = new Set<number>();
  for (let i = 0; i < supCount; i++) supernaturalIds.add(shuffledAdults[i].id);

  const normalAdults = adults.filter((p) => !supernaturalIds.has(p.id));
  const supAdults = adults.filter((p) => supernaturalIds.has(p.id));

  // Check we have enough unique entries to cover everyone without repetition
  if (
    c.traits.length < adults.length ||
    c.normalSecrets.length < normalAdults.length ||
    c.supernaturalSecrets.length < supAdults.length
  ) {
    return null;
  }

  // Seeded, non-repeating index shuffles — deterministic per seed
  // Use distinct seed salts so the three pools shuffle independently
  const traitIndices = shuffleIndices(c.traits.length, seed ^ 0xc0cdead1);
  const normalSecretIndices = shuffleIndices(
    c.normalSecrets.length,
    seed ^ 0xc0cdead2,
  );
  const supSecretIndices = shuffleIndices(
    c.supernaturalSecrets.length,
    seed ^ 0xc0cdead3,
  );

  const result = new Map<number, AIPersonData>();
  let ti = 0,
    ni = 0,
    si = 0;

  // Sort by id for stable, deterministic assignment order
  const sortedAdults = [...adults].sort((a, b) => a.id - b.id);
  for (const p of sortedAdults) {
    const traits = c.traits[traitIndices[ti++]];
    const secret = supernaturalIds.has(p.id)
      ? c.supernaturalSecrets[supSecretIndices[si++]]
      : c.normalSecrets[normalSecretIndices[ni++]];
    result.set(p.id, { traits, secret });
  }

  return result;
}

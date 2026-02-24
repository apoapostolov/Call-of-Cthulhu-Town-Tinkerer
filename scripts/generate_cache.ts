import fs from "fs";
import path from "path";
import * as cliProgress from "cli-progress";
import { populateAIData } from "../src/ai.ts";
import type { Person } from "../src/logic.ts";

// This script runs in Node and uses the same AI logic as the browser to
// generate a large cache file. Run with an OpenRouter API key in the
// environment:
//
//   OPENROUTER_API_KEY=sk-.. npm run generate-cache
//
// It will create `prebuilt_cache.json` in the project root containing at
// least 1 000 000 traits and 1 000 000 secrets (normal + supernatural).
// The web app loads this file on first startup to seed localStorage, so
// subsequent page loads never need an API call.

// how many unique entries we aim to accumulate in each pool.
// lower this if you want to conserve credits.
// demo size for quick run – bump as needed for real cache
const TARGET = 1_000;

// number of people to send per request (matches web app BATCH_SIZE)
const BATCH = 50;

// maximum number of parallel requests
const CONCURRENCY = 8;

function makePerson(id: number): Person {
  return {
    id,
    job: "Adult",
    age: 30,
    gender: "male",
    spouseId: null,
    parentIds: [],
    childrenIds: [],
    siblingIds: [],
  };
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // __dirname substitute in ESM
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY must be set");
    process.exit(1);
  }

  // load existing cache if present so we can append to previous runs
  const filePath = path.resolve(__dirname, "..", "prebuilt_cache.json");
  let traits: string[] = [];
  let normal: string[] = [];
  let supra: string[] = [];

  // initialize progress bar
  const bar = new cliProgress.SingleBar({
    format: "{percentage}% |{bar}| {value}/{total} entries",
  });
  bar.start(TARGET * 3, 0);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      traits?: string[];
      normalSecrets?: string[];
      supernaturalSecrets?: string[];
    };
    traits = parsed.traits || [];
    normal = parsed.normalSecrets || [];
    supra = parsed.supernaturalSecrets || [];
    console.info(
      `Loaded existing cache (traits=${traits.length}, normal=${normal.length}, supra=${supra.length})`,
    );
  } catch {
    // ignore, we'll start with empty arrays
  }

  let nextId = 1;
  let running = true;

  const saveCache = () => {
    const out = { traits, normalSecrets: normal, supernaturalSecrets: supra };
    fs.writeFileSync(filePath, JSON.stringify(out));
  };

  const worker = async () => {
    while (
      running &&
      (traits.length < TARGET ||
        normal.length < TARGET ||
        supra.length < TARGET)
    ) {
      const people: Person[] = [];
      for (let i = 0; i < BATCH; i++) {
        people.push(makePerson(nextId++));
      }

      const result = await populateAIData(
        people,
        Date.now(),
        (p) => `Person ${p.id}`,
        apiKey,
        () => {},
      );

      for (const [id, data] of result.people.entries()) {
        if (traits.length < TARGET) traits.push(data.traits);
        const isSup = result.supernaturalIds.has(id);
        if (isSup) {
          if (supra.length < TARGET) supra.push(data.secret);
        } else {
          if (normal.length < TARGET) normal.push(data.secret);
        }
      }

      const total = traits.length + normal.length + supra.length;
      bar.update(total);

      console.log(
        `cache sizes: traits=${traits.length} normal=${normal.length} supra=${supra.length}`,
      );

      // persist after each successful batch
      saveCache();
    }
  };

  // launch worker pool
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  console.log("cache generation complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

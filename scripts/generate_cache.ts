import fs from "fs";
import path from "path";
import { populateAIData } from "../src/ai";
import type { Person } from "../src/logic";

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

const TARGET = 100_000;
const BATCH = 50; // same as our BATCH_SIZE constant

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
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY must be set");
    process.exit(1);
  }

  let nextId = 1;
  const traits: string[] = [];
  const normal: string[] = [];
  const supra: string[] = [];

  while (
    traits.length < TARGET ||
    normal.length < TARGET ||
    supra.length < TARGET
  ) {
    const people: Person[] = [];
    for (let i = 0; i < BATCH; i++) {
      people.push(makePerson(nextId++));
    }

    // use current timestamp as seed to vary output each call
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

    console.log(
      `cache sizes: traits=${traits.length} normal=${normal.length} supra=${supra.length}`,
    );
  }

  const out = {
    traits,
    normalSecrets: normal,
    supernaturalSecrets: supra,
  };
  fs.writeFileSync(
    path.resolve(__dirname, "..", "prebuilt_cache.json"),
    JSON.stringify(out),
  );
  console.log("prebuilt_cache.json written");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

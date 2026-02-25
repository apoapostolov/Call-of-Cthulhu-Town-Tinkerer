import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = path.resolve(__dirname, "../prebuilt_cache.json");
const publicPath = path.resolve(__dirname, "../public/prebuilt_cache.json");

interface AICache {
  traits: string[];
  normalSecrets: string[];
  supernaturalSecrets: string[];
}

function normalize(s: string): string {
  // lowercase, trim, remove period at end
  return s.toLowerCase().trim().replace(/\.$/, "");
}

function process() {
  if (!fs.existsSync(rootPath)) {
    console.error("prebuilt_cache.json not found in root.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(rootPath, "utf-8")) as AICache;

  console.log(
    `Original: traits=${data.traits.length}, normal=${data.normalSecrets.length}, supernatural=${data.supernaturalSecrets.length}`,
  );

  // Clean traits
  data.traits = cleanupPool(data.traits, 2);
  // Clean normal secrets
  data.normalSecrets = cleanupPool(data.normalSecrets, 2);
  // Clean supernatural secrets (more strictly)
  data.supernaturalSecrets = cleanupPool(data.supernaturalSecrets, 1);

  // Filter out too short or obviously placeholder ones
  const isGood = (s: string) => s.length > 5 && !/^[.\s]*$/.test(s);
  data.traits = data.traits.filter(isGood);
  data.normalSecrets = data.normalSecrets.filter(isGood);
  data.supernaturalSecrets = data.supernaturalSecrets.filter(isGood);

  console.log(
    `Cleaned: traits=${data.traits.length}, normal=${data.normalSecrets.length}, supernatural=${data.supernaturalSecrets.length}`,
  );

  // Beautify and save to both root and public/
  const out = JSON.stringify(data, null, 2);
  fs.writeFileSync(rootPath, out);
  fs.writeFileSync(publicPath, out);

  console.log("Beautified and saved to project root and public/.");
}

process();

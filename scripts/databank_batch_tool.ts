import fs from "node:fs";
import path from "node:path";
import {
  INDUSTRIAL_FACILITY_BANK,
  NORMAL_SECRET_BANK,
  SOCIAL_FACILITY_BANK,
  STREET_NAME_BANK,
  SUPERNATURAL_SECRET_BANK,
  TRAIT_BANK,
} from "../src/databanks.ts";

type BankKey =
  | "street"
  | "traits"
  | "normal_secrets"
  | "supernatural_secrets"
  | "industrial_facilities"
  | "social_facilities";

const BANKS: Record<BankKey, string[]> = {
  street: STREET_NAME_BANK,
  traits: TRAIT_BANK,
  normal_secrets: NORMAL_SECRET_BANK,
  supernatural_secrets: SUPERNATURAL_SECRET_BANK,
  industrial_facilities: INDUSTRIAL_FACILITY_BANK,
  social_facilities: SOCIAL_FACILITY_BANK,
};

function usage(): never {
  console.error(`Usage:
  ts-node scripts/databank_batch_tool.ts export <bank> <chunkSize> <outDir>
  ts-node scripts/databank_batch_tool.ts prune-preview <bank> <dropListFile>
  ts-node scripts/databank_batch_tool.ts add-preview <bank> <addListFile>

Banks:
  ${Object.keys(BANKS).join("\n  ")}

Input list files: one entry per line; blank lines ignored.`);
  process.exit(1);
}

function getBankOrExit(name: string): string[] {
  const key = name as BankKey;
  const bank = BANKS[key];
  if (!bank) usage();
  return bank;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function readLines(file: string): string[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean);
}

function cmdExport(bank: string[], chunkSize: number, outDir: string): void {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) usage();
  fs.mkdirSync(outDir, { recursive: true });

  let chunkIndex = 0;
  for (let i = 0; i < bank.length; i += chunkSize) {
    const rows = bank.slice(i, i + chunkSize);
    const payload = {
      metadata: {
        chunk_index: chunkIndex,
        start_index: i,
        end_index_exclusive: i + rows.length,
        chunk_size: rows.length,
      },
      items: rows.map((text, j) => ({ id: i + j, text })),
    };
    const file = path.join(outDir, `chunk_${String(chunkIndex).padStart(4, "0")}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    chunkIndex++;
  }

  console.log(
    JSON.stringify(
      {
        exported_items: bank.length,
        chunks: chunkIndex,
        out_dir: outDir,
      },
      null,
      2,
    ),
  );
}

function cmdPrunePreview(bank: string[], dropFile: string): void {
  const drops = new Set(readLines(dropFile));
  const before = bank.length;
  const afterList = bank.filter((x) => !drops.has(normalize(x)));
  const after = afterList.length;
  console.log(
    JSON.stringify(
      {
        before,
        after,
        removed: before - after,
        sample_removed: bank.filter((x) => drops.has(normalize(x))).slice(0, 20),
      },
      null,
      2,
    ),
  );
}

function cmdAddPreview(bank: string[], addFile: string): void {
  const additions = readLines(addFile);
  const existing = new Set(bank.map(normalize));
  const accepted: string[] = [];

  for (const a of additions) {
    const n = normalize(a);
    if (!n || existing.has(n)) continue;
    existing.add(n);
    accepted.push(n);
  }

  console.log(
    JSON.stringify(
      {
        before: bank.length,
        candidates: additions.length,
        accepted: accepted.length,
        after: bank.length + accepted.length,
        sample_accepted: accepted.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

const [, , command, bankName, arg1, arg2] = process.argv;
if (!command || !bankName) usage();

const bank = getBankOrExit(bankName);

if (command === "export") {
  if (!arg1 || !arg2) usage();
  cmdExport(bank, Number(arg1), arg2);
} else if (command === "prune-preview") {
  if (!arg1) usage();
  cmdPrunePreview(bank, arg1);
} else if (command === "add-preview") {
  if (!arg1) usage();
  cmdAddPreview(bank, arg1);
} else {
  usage();
}

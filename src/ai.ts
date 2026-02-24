import type { Person } from "./logic";
import { mulberry32 } from "./logic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const AI_MODEL = "deepseek/deepseek-v3.2";
const BATCH_SIZE = 200;
export const MAX_ADULTS = 5000; // cap to avoid runaway cost
const MAX_RETRIES = 3;

export interface AIPersonData {
  traits: string; // "brave, reckless, greedy"
  secret: string; // "Embezzling from employer"
}

export interface AIResult {
  people: Map<number, AIPersonData>;
  rels: Map<string, string>; // "minId-maxId" -> tone word
  supernaturalIds: Set<number>; // 1% of adults marked for supernatural secrets
}

export function relKey(a: number, b: number): string {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

const SYSTEM_PROMPT = `You generate 1920s Call of Cthulhu RPG NPC data. Rules:
- TRAITS: 2–4 comma-separated personality descriptors. At least 1 must be a flaw or vice.
- SECRET: ≤8 words, terse present tense. Persons marked [!] must have a SUPERNATURAL secret (cultist, sees ghosts, cursed relic, etc.). All others: era-appropriate personal secret (affair, debt, crime, addiction, hidden past).
- RELATIONSHIP WORD: Single evocative word for the emotional dynamic between two people.
Output ONLY valid JSON, no markdown, no explanation:
{"p":[{"i":<id>,"t":"trait1,trait2,trait3","s":"brief secret"},...], "r":[{"a":<id>,"b":<id>,"w":"word"},...]}`;

function buildBatchPrompt(
  batch: Person[],
  getPersonName: (p: Person) => string,
  supernaturalIds: Set<number>,
): string {
  const lines: string[] = [];
  const pairsMap = new Map<string, string>();

  for (const p of batch) {
    const marker = supernaturalIds.has(p.id) ? "[!]" : "";
    const fullName = getPersonName(p);
    const parts = fullName.split(" ");
    const shortName =
      parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : fullName;

    const relParts: string[] = [];
    if (p.spouseId !== null) relParts.push(`w:${p.spouseId}`);
    if (p.parentIds.length) relParts.push(`p:${p.parentIds.join(",")}`);
    if (p.childrenIds.length)
      relParts.push(`c:${p.childrenIds.slice(0, 4).join(",")}`);
    if (p.siblingIds.length)
      relParts.push(`s:${p.siblingIds.slice(0, 3).join(",")}`);

    lines.push(
      `${p.id}|${marker}${shortName}|${p.age}|${p.job ?? "None"}|${p.gender === "male" ? "M" : "F"}|${relParts.join(" ")}`,
    );

    if (p.spouseId !== null) pairsMap.set(relKey(p.id, p.spouseId), "spouse");
    for (const pid of p.parentIds) pairsMap.set(relKey(p.id, pid), "parent");
    for (const sid of p.siblingIds.slice(0, 3))
      pairsMap.set(relKey(p.id, sid), "sibling");
  }

  const pairsStr = [...pairsMap.entries()]
    .map(([k, type]) => {
      const [a, b] = k.split("-");
      return `${a}-${b}(${type})`;
    })
    .join(" ");

  return `PEOPLE (id|marker+name|age|job|sex|relations):\n${lines.join("\n")}\n\nPAIRS (generate "w" tone word for each): ${pairsStr}`;
}

function parseAIResponse(raw: string): { p: unknown[]; r: unknown[] } {
  // Direct JSON
  try {
    return JSON.parse(raw) as { p: unknown[]; r: unknown[] };
  } catch {
    /* fall through */
  }
  // Markdown code block
  const mdMatch = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (mdMatch) {
    try {
      return JSON.parse(mdMatch[1]) as { p: unknown[]; r: unknown[] };
    } catch {
      /* fall through */
    }
  }
  // Bare JSON object anywhere in string
  const curly = raw.indexOf("{");
  const lastCurly = raw.lastIndexOf("}");
  if (curly !== -1 && lastCurly > curly) {
    try {
      return JSON.parse(raw.slice(curly, lastCurly + 1)) as {
        p: unknown[];
        r: unknown[];
      };
    } catch {
      /* fall through */
    }
  }
  throw new Error("Could not parse AI response as JSON");
}

async function callOpenRouterWithRetry(
  prompt: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let response: Response;

    // Compose a per-attempt 90 s timeout with the caller's abort signal so a
    // hanging fetch is never left waiting indefinitely.
    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(
      () =>
        timeoutCtrl.abort(
          new DOMException("Request timed out", "TimeoutError"),
        ),
      90_000,
    );
    if (signal) {
      signal.addEventListener("abort", () => timeoutCtrl.abort(signal.reason), {
        once: true,
      });
    }

    try {
      response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: timeoutCtrl.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Call of Cthulhu Town Tinkerer",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 4096,
        }),
      });
    } catch (networkErr) {
      const err = networkErr as Error;
      // User explicitly cancelled — propagate immediately
      if (err.name === "AbortError" && signal?.aborted) throw networkErr;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err.name === "TimeoutError" || err.name === "AbortError"
        ? new Error("Request timed out — check your connection and try again")
        : new Error(`Network error: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Rate limited — back off and retry
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const wait = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 10000;
      await new Promise((r) => setTimeout(r, Math.max(wait, 5000)));
      continue;
    }

    // Permanent failures — no point retrying
    if (response.status === 401 || response.status === 402) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter ${response.status}: ${(body as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    // Transient server errors
    if (response.status >= 500) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw new Error(`OpenRouter server error ${response.status}`);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter ${response.status}: ${(body as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0].message.content;
  }
  throw new Error("Max retries exceeded");
}

export async function populateAIData(
  people: Person[],
  seed: number,
  getPersonName: (p: Person) => string,
  apiKey: string,
  onProgress: (batchDone: number, batchTotal: number, status: string) => void,
  signal?: AbortSignal,
): Promise<AIResult> {
  // Select 1% of adults to receive supernatural secrets deterministically
  const rng = mulberry32(seed ^ 0xdeadbeef);
  const adults = people.filter((p) => p.job !== "Child").slice(0, MAX_ADULTS);

  const supernaturalCount = Math.max(1, Math.round(adults.length * 0.01));
  const supernaturalIds = new Set<number>();
  const shuffled = [...adults];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (let i = 0; i < supernaturalCount; i++)
    supernaturalIds.add(shuffled[i].id);

  const result: AIResult = {
    people: new Map(),
    rels: new Map(),
    supernaturalIds,
  };

  const batches: Person[][] = [];
  for (let i = 0; i < adults.length; i += BATCH_SIZE) {
    batches.push(adults.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onProgress(
      b,
      batches.length,
      `Batch ${b + 1} / ${batches.length} — requesting…`,
    );

    const prompt = buildBatchPrompt(batches[b], getPersonName, supernaturalIds);
    const raw = await callOpenRouterWithRetry(prompt, apiKey, signal);

    let parsed: { p?: unknown[]; r?: unknown[] };
    try {
      parsed = parseAIResponse(raw);
    } catch (e) {
      console.warn(`Batch ${b + 1} parse failed — skipping`, e);
      continue;
    }

    for (const item of parsed.p ?? []) {
      const it = item as { i?: number; t?: string; s?: string };
      if (
        typeof it.i === "number" &&
        typeof it.t === "string" &&
        typeof it.s === "string"
      ) {
        result.people.set(it.i, {
          traits: it.t.trim(),
          secret: it.s.trim(),
        });
      }
    }

    for (const item of parsed.r ?? []) {
      const it = item as { a?: number; b?: number; w?: string };
      if (
        typeof it.a === "number" &&
        typeof it.b === "number" &&
        typeof it.w === "string"
      ) {
        result.rels.set(relKey(it.a, it.b), it.w.trim());
      }
    }
  }

  onProgress(batches.length, batches.length, "Complete");
  return result;
}

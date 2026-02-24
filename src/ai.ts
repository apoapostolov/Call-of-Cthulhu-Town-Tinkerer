import type { Person } from "./logic.ts";
import { mulberry32 } from "./logic.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const AI_MODEL = "x-ai/grok-4.1-fast"; // switched to a still-fast free variant
const BATCH_SIZE = 50;
const CONCURRENCY_LIMIT = 5; // Number of parallel requests to OpenRouter
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

const SYSTEM_PROMPT = `You generate 1920s‑era character data suitable for tabletop games.
Rules:
- TRAITS: 2–3 comma-separated personality descriptors. At least one must be a flaw, vice, or eccentricity.
- SECRET: ≤6 words, terse present tense. 99% of characters should have a completely mundane, era-appropriate secret (affair, debt, crime, addiction, hidden past, etc.). Only 1% may be marked [!] and then the secret should be supernatural in nature (cult member, sees ghosts, cursed relic, etc.), but nothing needs to be Call‑of‑Cthulhu‑specific as long as it fits 1920s pulp atmosphere. Do not make all secrets supernatural.
- RELATIONSHIP WORD: Single evocative word capturing the emotional tone between two people.

CRITICAL: Output ONLY valid JSON. No markdown backticks, no preamble, no tail. Keep values extremely short to avoid truncation.
The JSON must strictly match this structure:
{"p":[{"i":<id>,"t":"trait1,trait2","s":"secret"},...], "r":[{"a":<id>,"b":<id>,"w":"word"},...]}`;

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
  const clean = (s: string) => {
    // Basic repair for trailing commas in arrays/objects
    return s.replace(/,\s*([\]}])/g, "$1");
  };

  // Direct JSON
  try {
    return JSON.parse(clean(raw)) as { p: unknown[]; r: unknown[] };
  } catch {
    /* fall through */
  }

  // Markdown code block
  const mdMatch = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (mdMatch) {
    try {
      return JSON.parse(clean(mdMatch[1])) as { p: unknown[]; r: unknown[] };
    } catch {
      /* fall through */
    }
  }

  // Bare JSON object anywhere in string
  const curly = raw.indexOf("{");
  const lastCurly = raw.lastIndexOf("}");
  if (curly !== -1 && lastCurly > curly) {
    const candidate = raw.slice(curly, lastCurly + 1);
    try {
      return JSON.parse(clean(candidate)) as { p: unknown[]; r: unknown[] };
    } catch {
      /* fall through */
    }
  }

  console.error("[AI] parseAIResponse failed. Raw content preview:", {
    start: raw.slice(0, 200),
    end: raw.slice(-200),
    length: raw.length,
    isTruncated: !raw.trim().endsWith("}"),
  });
  throw new Error(
    raw.length > 10000 && !raw.trim().endsWith("}")
      ? "AI response looks truncated (too many NPCs in batch?)"
      : "Could not parse AI response as JSON",
  );
}

async function callOpenRouterWithRetry(
  prompt: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
  console.debug(
    `[AI] callOpenRouterWithRetry: Starting fetch. Prompt length: ${prompt.length}`,
  );
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      console.warn(
        `[AI] callOpenRouterWithRetry: Signal aborted before attempt ${attempt + 1}`,
      );
      throw new DOMException("Aborted", "AbortError");
    }

    console.debug(
      `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1}/${MAX_RETRIES}`,
    );
    let response: Response;

    // Compose a per-attempt 90 s timeout with the caller's abort signal so a
    // hanging fetch is never left waiting indefinitely.
    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(
        `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1} timed out after 90s`,
      );
      timeoutCtrl.abort(new DOMException("Request timed out", "TimeoutError"));
    }, 90_000);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          console.debug(
            `[AI] callOpenRouterWithRetry: Parent signal aborted during attempt ${attempt + 1}`,
          );
          timeoutCtrl.abort(signal.reason);
        },
        {
          once: true,
        },
      );
    }

    try {
      response = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: timeoutCtrl.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            typeof window !== "undefined" ? window.location.origin : "",
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
      console.debug(
        `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1} received response. Status: ${response.status}`,
      );
    } catch (networkErr) {
      const err = networkErr as Error;
      console.error(
        `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1} network error:`,
        err,
      );
      // User explicitly cancelled — propagate immediately
      if (err.name === "AbortError" && signal?.aborted) throw networkErr;
      if (attempt < MAX_RETRIES - 1) {
        const waitTime = 2000 * (attempt + 1);
        console.info(
          `[AI] callOpenRouterWithRetry: Retrying in ${waitTime}ms...`,
        );
        await new Promise((r) => setTimeout(r, waitTime));
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
      console.warn(
        `[AI] callOpenRouterWithRetry: Rate limited (429). Waiting ${wait}ms...`,
      );
      await new Promise((r) => setTimeout(r, Math.max(wait, 5000)));
      continue;
    }

    // Permanent failures — no point retrying
    if (response.status === 401 || response.status === 402) {
      const body = await response.json().catch(() => ({}));
      const errMsg =
        (body as { error?: { message?: string } })?.error?.message ??
        response.statusText;
      console.error(
        `[AI] callOpenRouterWithRetry: Permanent error ${response.status}: ${errMsg}`,
      );
      throw new Error(`OpenRouter ${response.status}: ${errMsg}`);
    }

    // Transient server errors
    if (response.status >= 500) {
      console.warn(
        `[AI] callOpenRouterWithRetry: Server error ${response.status}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        const waitTime = 3000 * (attempt + 1);
        console.info(
          `[AI] callOpenRouterWithRetry: Retrying in ${waitTime}ms...`,
        );
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }
      throw new Error(`OpenRouter server error ${response.status}`);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errMsg =
        (body as { error?: { message?: string } })?.error?.message ??
        response.statusText;
      console.error(
        `[AI] callOpenRouterWithRetry: HTTP error ${response.status}: ${errMsg}`,
      );
      throw new Error(`OpenRouter ${response.status}: ${errMsg}`);
    }

    console.debug(
      `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1} succeeded. Reading response body...`,
    );
    const rawData = await response.text();
    console.debug(
      `[AI] callOpenRouterWithRetry: Attempt ${attempt + 1} read ${rawData.length} bytes. Parsing JSON...`,
    );

    let data: any;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.error(
        "[AI] callOpenRouterWithRetry: Failed to parse OpenRouter envelope JSON:",
        e,
      );
      throw new Error("Invalid JSON envelope from OpenRouter");
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error(
        "[AI] callOpenRouterWithRetry: Unexpected response structure (no content):",
        data,
      );
      throw new Error("OpenRouter returned an empty or malformed message");
    }

    console.debug(
      `[AI] callOpenRouterWithRetry: Successfully retrieved content (${content.length} chars).`,
    );
    return content;
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

  let batchesDone = 0;
  const queue = [...batches.entries()];

  const worker = async () => {
    while (queue.length > 0) {
      if (signal?.aborted) break;
      const entry = queue.shift();
      if (!entry) break;
      const [bIndex, batch] = entry;

      console.info(
        `[AI] populateAIData: Starting batch ${bIndex + 1}/${batches.length}`,
      );
      const prompt = buildBatchPrompt(batch, getPersonName, supernaturalIds);

      try {
        const raw = await callOpenRouterWithRetry(prompt, apiKey, signal);
        console.debug(
          `[AI] populateAIData: Batch ${bIndex + 1} response received (${raw.length} bytes)`,
        );

        let parsed: { p?: unknown[]; r?: unknown[] };
        try {
          parsed = parseAIResponse(raw);
        } catch (e) {
          console.error(
            `[AI] populateAIData: Batch ${bIndex + 1} parse failed:`,
            e,
          );
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

        batchesDone++;
        onProgress(
          batchesDone,
          batches.length,
          `Batch ${batchesDone} / ${batches.length} done...`,
        );
      } catch (err) {
        console.error(
          `[AI] populateAIData: Batch ${bIndex + 1} critical failure:`,
          err,
        );
        throw err; // Propagate to main catch block
      }
    }
  };

  // Launch parallel workers
  const numWorkers = Math.min(CONCURRENCY_LIMIT, batches.length);
  console.info(
    `[AI] populateAIData: Launching ${numWorkers} parallel workers.`,
  );
  await Promise.all(
    Array(numWorkers)
      .fill(null)
      .map(() => worker()),
  );

  onProgress(batches.length, batches.length, "Complete");
  return result;
}

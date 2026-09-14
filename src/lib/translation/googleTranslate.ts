// Machine translation via Google Translate's public web endpoint (no API
// key — the same one the translate.google.com page itself calls). Batches
// many short strings (ingredient names, step text, ...) into as few HTTP
// requests as possible: joined with newlines, Google's response comes back
// as one translated segment per line, in order, so a whole recipe usually
// costs a single request.

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
// Keep well under URL/length limits some intermediaries impose.
const MAX_CHUNK_CHARS = 3500;
const RETRY_DELAYS_MS = [400, 1200];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Google's free endpoint occasionally returns 429 under bursty traffic (e.g.
// a batch of recipes translated in quick succession) — worth a couple of
// short retries before giving up, rather than failing the whole request.
async function fetchTranslation(params: URLSearchParams): Promise<unknown> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    if (res.ok) return res.json();
    lastStatus = res.status;
    if (res.status !== 429 || attempt === RETRY_DELAYS_MS.length) break;
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
  throw new Error(`Translation request failed (${lastStatus})`);
}

async function translateSingle(text: string, targetCode: string, sourceCode: string): Promise<string> {
  const params = new URLSearchParams({ client: "gtx", sl: sourceCode, tl: targetCode, dt: "t", q: text });
  const data = await fetchTranslation(params);
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  return segments
    .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
    .join("")
    .trim();
}

async function translateChunk(lines: string[], targetCode: string, sourceCode: string): Promise<string[]> {
  const joined = lines.join("\n");
  const params = new URLSearchParams({ client: "gtx", sl: sourceCode, tl: targetCode, dt: "t", q: joined });
  const data = await fetchTranslation(params);
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
  const parts = segments.map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "").replace(/\n+$/, "") : ""));

  if (parts.length === lines.length) return parts;

  // Google occasionally merges/splits lines unpredictably on a joined
  // request — fall back to one request per line so the result is at least
  // correctly aligned, even though it costs more round trips.
  return Promise.all(lines.map((line) => translateSingle(line, targetCode, sourceCode)));
}

// Translates a list of strings, preserving order and length exactly (empty
// strings pass through untranslated). `sourceCode` defaults to English,
// since every recipe in this app is authored in English.
export async function translateBatch(
  texts: string[],
  targetCode: string,
  sourceCode = "en"
): Promise<string[]> {
  const cleaned = texts.map((t) => t.replace(/\r?\n+/g, " ").trim());
  const nonEmpty = cleaned
    .map((text, index) => ({ text, index }))
    .filter((item) => item.text.length > 0);
  if (nonEmpty.length === 0) return cleaned;

  const chunks: { text: string; index: number }[][] = [];
  let current: { text: string; index: number }[] = [];
  let currentChars = 0;
  for (const item of nonEmpty) {
    if (current.length > 0 && currentChars + item.text.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(item);
    currentChars += item.text.length + 1;
  }
  if (current.length > 0) chunks.push(current);

  const result = [...cleaned];
  for (const chunk of chunks) {
    const translated = await translateChunk(
      chunk.map((c) => c.text),
      targetCode,
      sourceCode
    );
    chunk.forEach((item, i) => {
      result[item.index] = translated[i] ?? item.text;
    });
  }
  return result;
}

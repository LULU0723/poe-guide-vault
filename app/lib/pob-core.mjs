// Dependency-free, DOM-free core for decoding Path of Building export codes.
// Lives as plain ESM so it runs unchanged in the browser AND in `node --test`.
// The DOM-dependent XML parsing + guide mapping lives in ./pob.ts.

/** The seven fixed progression stages, matching the reader app's stage ids/names. */
export const STAGE_IDS = ["overview", "campaign", "maps", "low", "mid", "high", "end"];
export const STAGE_NAMES = ["總覽", "劇情", "初入輿圖", "低預算", "中預算", "高預算", "終局"];

/** Decode a URL-safe / standard base64 string to bytes (browser + Node). */
export function base64ToBytes(b64) {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Inflate a PoB export code into its raw XML string.
 * PoB codes are base64(zlib(xml)); zlib maps to DecompressionStream("deflate").
 * @param {string} code
 * @returns {Promise<string>}
 */
export async function inflatePob(code) {
  const trimmed = (code || "").trim();
  if (!trimmed) throw new Error("EMPTY");
  const bytes = base64ToBytes(trimmed);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  const xml = new TextDecoder("utf-8").decode(buf);
  if (!xml.includes("<PathOfBuilding")) throw new Error("NOT_POB");
  return xml;
}

/** Strip PoB inline colour markup: ^0-^9 palette codes and ^xRRGGBB custom colours. */
export function stripPobColors(s) {
  if (!s) return "";
  return s.replace(/\^x[0-9A-Fa-f]{6}|\^[0-9]/g, "").replace(/　/g, " ").trim();
}

/**
 * Infer which of the 7 stages a PoB set (tree/skill/item) belongs to, from its title.
 * Returns "" when no rule matches (caller decides where unassigned sets land).
 * @param {string} rawTitle
 * @returns {string}
 */
export function inferStageId(rawTitle) {
  const t = stripPobColors(rawTitle).toLowerCase();
  if (!t) return "";
  // Trust the descriptive tier WORD only. Authors' "{n}" set numbers are
  // build-specific and mean different tiers in different builds (even from the
  // same author), so they must never drive staging — a set literally titled
  // "Early ... {9}" is early, not endgame. Anything without a clear word stays
  // unassigned so the caller can flag it instead of silently guessing wrong.
  if (/\b(summary|overview)\b/.test(t)) return "overview";
  if (/\bearly\b|pre-early|da anoint/.test(t)) return "maps";
  if (/\bmid\b|bitter heresy|doctrine/.test(t)) return "mid";
  if (/\blate\b|upgraded|flesh and flame|svalinn|option [12]\b/.test(t)) return "end";
  if (/lvling|leveling|campaign/.test(t) || /\bact\b/.test(t)) return "campaign";
  return "";
}

// Browser-side Path of Building decoding: turns a PoB export code into a draft
// guide the reader app can import. The deterministic layer of the pipeline —
// every gem/item/tree here is copied verbatim from the PoB XML, never guessed,
// so the only work left for a human/LLM afterwards is translation.
//
// DOM-free primitives (inflate, colour-strip, stage inference) live in
// ./pob-core.mjs so they can be unit-tested under `node --test`.

import { inflatePob, stripPobColors, inferStageId, STAGE_IDS, STAGE_NAMES } from "./pob-core.mjs";

export type DraftSkill = { name: string; color: "blue" | "red" | "green" };
export type DraftSkillGroup = { slot: string; label: string; gems: DraftSkill[] };
export type DraftGear = { slot: string; current: string; next: string; note: string };
export type DraftProgression = { type: "passive"; name: string; detail: string };
export type DraftStage = {
  id: string; name: string; summary: string;
  skills: DraftSkillGroup[]; gear: DraftGear[]; progression: DraftProgression[]; notes: string;
};
export type DraftGuide = {
  id: string; title: string; version: string; archetype: string; updated: string;
  pob: string; source: string; stages: DraftStage[];
};
export type DecodeSummary = {
  trees: number; skillSets: number; itemSets: number; gemPlacements: number; unassigned: number;
};
export type DecodeResult = { guide: DraftGuide; summary: DecodeSummary };

type ParsedGroup = { slot: string; label: string; gems: string[] };
type ParsedSkillSet = { name: string; stage: string; groups: ParsedGroup[] };
type ParsedItemSet = { name: string; stage: string; slots: { slot: string; item: string }[] };
type ParsedTree = { name: string; stage: string; nodeCount: number };

const uid = () => Math.random().toString(36).slice(2, 9);
const attr = (el: Element, name: string) => el.getAttribute(name) || "";

/** Resolve the display name of a PoB `<Item>` element (the line after "Rarity:"). */
function itemName(text: string): string {
  const lines = text.trim().split(/\r?\n/);
  const i = lines.findIndex(l => l.startsWith("Rarity:"));
  const name = i >= 0 && lines[i + 1] ? lines[i + 1] : lines[0] || "?";
  return stripPobColors(name.trim());
}

/** Parse the decoded PoB XML into stage-tagged skill/item/tree sets. Browser only (DOMParser). */
export function parsePobXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("BAD_XML");

  const build = doc.querySelector("PathOfBuilding > Build");
  const archetype = build
    ? [attr(build, "ascendClassName"), attr(build, "className")].filter(Boolean)[0] || ""
    : "";

  const itemsEl = doc.querySelector("PathOfBuilding > Items");
  const pool = new Map<string, string>();
  itemsEl?.querySelectorAll(":scope > Item").forEach(it => {
    pool.set(attr(it, "id"), itemName(it.textContent || ""));
  });

  const trees: ParsedTree[] = [];
  doc.querySelectorAll("PathOfBuilding > Tree > Spec").forEach((sp, i) => {
    const nodes = attr(sp, "nodes").split(",").filter(Boolean);
    const name = stripPobColors(attr(sp, "title")) || `天賦樹 ${i + 1}`;
    trees.push({ name, nodeCount: nodes.length, stage: inferStageId(attr(sp, "title")) });
  });

  const skills: ParsedSkillSet[] = [];
  doc.querySelectorAll("PathOfBuilding > Skills > SkillSet").forEach((ss, i) => {
    const groups: ParsedGroup[] = [];
    ss.querySelectorAll(":scope > Skill").forEach(sk => {
      const gems: string[] = [];
      sk.querySelectorAll(":scope > Gem").forEach(g => {
        const n = attr(g, "nameSpec");
        if (n) gems.push(n);
      });
      if (gems.length) {
        groups.push({ slot: stripPobColors(attr(sk, "slot")), label: stripPobColors(attr(sk, "label")), gems });
      }
    });
    skills.push({ name: stripPobColors(attr(ss, "title")) || `技能組 ${i + 1}`, stage: inferStageId(attr(ss, "title")), groups });
  });

  const items: ParsedItemSet[] = [];
  itemsEl?.querySelectorAll(":scope > ItemSet").forEach((s, i) => {
    const slots: { slot: string; item: string }[] = [];
    s.querySelectorAll(":scope > Slot").forEach(slot => {
      const itemId = attr(slot, "itemId");
      if (itemId && itemId !== "0" && pool.has(itemId)) {
        slots.push({ slot: stripPobColors(attr(slot, "name")), item: pool.get(itemId) || "?" });
      }
    });
    items.push({ name: stripPobColors(attr(s, "title")) || `裝備組 ${i + 1}`, stage: inferStageId(attr(s, "title")), slots });
  });

  const notes = stripPobColors(doc.querySelector("PathOfBuilding > Notes")?.textContent || "");
  return { archetype, trees, skills, items, notes };
}

/** Decode a PoB export code straight into an importable draft guide. */
export async function decodePobToGuide(
  code: string,
  meta: { title?: string; source?: string; version?: string } = {},
): Promise<DecodeResult> {
  const xml = await inflatePob(code);
  const parsed = parsePobXml(xml);

  const stages: DraftStage[] = STAGE_IDS.map((id, i) => ({
    id, name: STAGE_NAMES[i], summary: "", skills: [], gear: [], progression: [], notes: "",
  }));
  const stageOf = (id: string) => stages.find(s => s.id === id) || stages[2]; // fallback: 初入輿圖
  const fallback = (s: string) => s || "maps";
  let unassigned = 0;
  let gemPlacements = 0;

  // Author's PoB Notes → overview stage (verbatim, only stripped of colour codes).
  stages[0].notes = parsed.notes;

  for (const t of parsed.trees) {
    if (!t.stage) unassigned++;
    stageOf(fallback(t.stage)).progression.push({ type: "passive", name: t.name, detail: `${t.nodeCount} 點配置` });
  }

  for (const set of parsed.skills) {
    if (!set.stage) unassigned++;
    const target = stageOf(fallback(set.stage));
    for (const g of set.groups) {
      gemPlacements += g.gems.length;
      const label = [set.name, g.label].filter(Boolean).join(" · ");
      // Colour isn't stored in the PoB code; default blue and let the user recolour.
      target.skills.push({ slot: g.slot, label, gems: g.gems.map(name => ({ name, color: "blue" as const })) });
    }
  }

  for (const set of parsed.items) {
    if (!set.stage) unassigned++;
    const target = stageOf(fallback(set.stage));
    for (const sl of set.slots) {
      target.gear.push({ slot: sl.slot, current: sl.item, next: "", note: set.name });
    }
  }

  const guide: DraftGuide = {
    id: `pob-${uid()}`,
    title: meta.title?.trim() || (parsed.archetype ? `${parsed.archetype} · PoB 匯入` : "PoB 匯入攻略"),
    version: meta.version?.trim() || "",
    archetype: parsed.archetype,
    updated: new Date().toISOString().slice(0, 10),
    pob: code.trim(),
    source: meta.source?.trim() || "PoB 匯入",
    stages,
  };

  return {
    guide,
    summary: {
      trees: parsed.trees.length,
      skillSets: parsed.skills.length,
      itemSets: parsed.items.length,
      gemPlacements,
      unassigned,
    },
  };
}

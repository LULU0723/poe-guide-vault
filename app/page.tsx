"use client";
/* eslint-disable @next/next/no-img-element -- guide images are user-pasted data URLs */

import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { decodePob, buildGuide, translateGuide, type DecodeResult, type ParsedPob, type Glossary } from "./lib/pob";

const stageOptions: [string, string][] = [["overview", "總覽"], ["campaign", "劇情"], ["maps", "初入輿圖"], ["low", "低預算"], ["mid", "中預算"], ["high", "高預算"], ["end", "終局"]];
const kindLabel = (k: string) => k === "skill" ? "技能" : k === "item" ? "裝備" : "天賦";

type Skill = { name: string; color: "blue" | "red" | "green" };
type ChecklistItem = { id: string; text: string; required?: boolean; unlockMessage?: string };
type Variant = { id: string; name: string; description: string };
type SkillSwap = { id: string; remove: string; add: string; when: string; variantIds?: string[] };
type SkillGroup = { id: string; slot: string; label: string; gems: Skill[]; variantIds?: string[] };
type Gear = { slot: string; current: string; next: string; note: string; variantIds?: string[] };
type Spectre = { id: string; name: string; count: number; role: string; acquisition: string; replaces: string; variantIds?: string[] };
type Warning = { id: string; severity: "info" | "warning" | "danger"; category: string; title: string; localizedText: string; recommendation: string; sourceText?: string };
type Progression = { id: string; type: "ascendancy" | "passive" | "anointment" | "tattoo"; name: string; detail: string };
type GuideSection = { id: string; type: "craft" | "map-mods" | "mechanic" | "faq" | "playstyle" | "bossing"; title: string; content: string };
type Stage = {
  id: string; name: string; summary: string; goals: ChecklistItem[]; conditions: ChecklistItem[];
  skills: SkillGroup[]; swaps: SkillSwap[]; gear: Gear[]; spectres: Spectre[]; warnings: Warning[];
  progression: Progression[]; sections: GuideSection[]; notes: string; image?: string;
};
type Guide = { id: string; title: string; version: string; archetype: string; updated: string; pob: string; source: string; pros: string[]; cons: string[]; coreMechanics: string[]; requiredItems: string[]; recommendedItems: string[]; variants: Variant[]; stages: Stage[] };

const stageNames = ["總覽", "劇情", "初入輿圖", "低預算", "中預算", "高預算", "終局"];
const uid = () => Math.random().toString(36).slice(2, 9);
const normalizeChecks = (items: Array<string | ChecklistItem> = []) => items.map(item => typeof item === "string" ? { id: uid(), text: item, required: true } : { ...item, id: item.id || uid(), text: item.text || "" });
const normalizeGuide = (input: Guide): Guide => ({
  ...input,
  pros: input.pros || [], cons: input.cons || [], coreMechanics: input.coreMechanics || [], requiredItems: input.requiredItems || [], recommendedItems: input.recommendedItems || [], variants: input.variants || [],
  stages: (input.stages || []).map(stage => ({ ...stage,
    goals: normalizeChecks(stage.goals as unknown as Array<string | ChecklistItem>), conditions: normalizeChecks(stage.conditions as unknown as Array<string | ChecklistItem>),
    gear: stage.gear || [], swaps: stage.swaps || [], spectres: stage.spectres || [], warnings: stage.warnings || [], progression: stage.progression || [], sections: stage.sections || [], notes: stage.notes || "",
    skills: (stage.skills || []).map((group, index) => Array.isArray(group) ? { id: uid(), slot: index === 0 ? "胸甲" : "未指定", label: index === 0 ? "主力技能" : `技能組 ${index + 1}`, gems: group as Skill[] } : { ...group, id: group.id || uid(), slot: group.slot || "未指定", label: group.label || `技能組 ${index + 1}`, gems: group.gems || [] })
  }))
});
const emptyStage = (name: string, i: number): Stage => ({ id: `stage-${i}`, name, summary: "點擊編輯模式，填寫這個階段的目標。", goals: [], conditions: [], skills: [], swaps: [], gear: [], spectres: [], warnings: [], progression: [], sections: [], notes: "" });

const starterGuide: Guide = normalizeGuide({
  id: "carrion-329", title: "毒食腐魔像＋殭屍", version: "3.29", archetype: "死靈師 · 混沌毒傷", updated: "2026-07-20", pob: "", source: "Helm Breaker / Maxroll",
  pros:["單體與防禦表現穩定","能從拓荒逐步投資到終局"], cons:["早期清圖較依賴召集","需要管理中毒機率與輔助幽魂"], coreMechanics:["召喚物物理轉混沌並疊加中毒","取得額外魔像上限後轉食腐魔像．清洗"], requiredItems:["六連核心胸甲"], recommendedItems:["聚魂石","高品質深淵珠寶"], variants:[{id:"bone-offering",name:"骸骨奉獻格擋版",description:"偏向防禦與格擋。"},{id:"late-svalinn",name:"斯瓦林終局版",description:"終局高防禦分支。"}],
  stages: [
    { id:"overview", name:"總覽", summary:"以赦免完成劇情，進入輿圖後逐步轉成食腐魔像與殭屍共同輸出的毒／混沌召喚流。", goals:["用赦免穩定完成劇情與前期輿圖","準備召喚物中毒、嘲諷與生命偷取珠寶","依裝備進度切換部落／清洗食腐魔像"], conditions:["召喚物中毒機率最終達到 100%","主力召喚寶石優先取得 21/0","抗性超過上限 15% 以抵銷曝曬"], skills:[[{name:"召喚食腐魔像．清洗",color:"blue"},{name:"多重打擊輔助",color:"red"},{name:"召喚物傷害輔助",color:"blue"},{name:"虛空操縱輔助",color:"green"}]], gear:[{slot:"胸甲",current:"稀有六連",next:"冥使之體",note:"核心混沌傷害來源"},{slot:"腰帶",current:"稀有冥河腰帶",next:"夜惡降臨",note:"放入兩顆優質蒼白之凝"}], notes:"召喚物寶石等級通常比品質重要；21/0 優先於 20/20。" },
    { id:"campaign", name:"劇情", summary:"使用赦免作為主力，食腐魔像、殭屍與幽魂提供輔助。", goals:["完成三次昇華試煉","抗性接近 75%","保留高等級召喚物寶石"], conditions:["取得兩隻激怒酋長作為輔助幽魂","準備一件便宜六連胸甲"], skills:[[{name:"瓦爾赦免",color:"blue"},{name:"物理轉閃電輔助",color:"blue"},{name:"施法迴響輔助",color:"blue"},{name:"召喚物傷害輔助",color:"blue"}]], gear:[{slot:"武器",current:"召喚物法杖",next:"＋1召喚物技能法杖",note:"不要犧牲抗性與生命"},{slot:"鞋子",current:"生命／抗性鞋",next:"烏勒爾之骨",note:"價格合理再買"}], notes:"第二章舊田野取得激怒酋長。" },
    { id:"maps", name:"初入輿圖", summary:"先穩定黃圖，蒐集轉食腐魔像所需的珠寶與六連。", goals:["取得稀有六連胸甲","補齊嘲諷與偷取深淵珠寶","取得觸發插槽法術的法杖"], conditions:["食腐魔像寶石等級足夠","召喚物生存不會頻繁死亡"], skills:[[{name:"殭屍復甦",color:"blue"},{name:"食腐魔像．部落",color:"blue"},{name:"多重打擊輔助",color:"red"},{name:"中毒機率輔助",color:"green"}]], gear:[{slot:"胸甲",current:"稀有六連",next:"六連冥使之體",note:"價格過高就延後"},{slot:"腰帶",current:"稀有腰帶",next:"夜惡降臨",note:"強化深淵珠寶"}], notes:"不要拿剛買的 1 級召喚物寶石直接進輿圖。" },
    { id:"low", name:"低預算", summary:"完成毒食腐魔像的基本循環，優先投資能直接成立傷害的核心物品。", goals:["召喚物中毒機率達 100%","取得六連冥使之體","建立四隻輔助幽魂前的過渡組合"], conditions:["深淵珠寶總中毒機率足夠","幻化守衛合計寶石等級至少 15"], skills:[[{name:"食腐魔像．部落",color:"blue"},{name:"殭屍復甦",color:"blue"},{name:"虛空操縱輔助",color:"green"},{name:"殘暴輔助",color:"red"}]], gear:[{slot:"項鍊",current:"稀有技能項鍊",next:"惡咒護符",note:"前期可塗 Testudo"},{slot:"藥劑",current:"防禦藥劑",next:"魯米的靈藥",note:"補足格擋"}], notes:"中毒達 100% 後才移除中毒機率輔助。" },
    { id:"mid", name:"中預算", summary:"轉成食腐魔像．清洗，補齊魔像珠寶、星團與四隻輔助幽魂。", goals:["取得聚魂石與原始力量","兩顆 Feasting Fiends 大型星團","完成四幽魂配置"], conditions:["聚魂石提供額外魔像數量","完美督軍到手後再調整小型星團"], skills:[[{name:"食腐魔像．清洗",color:"blue"},{name:"多重打擊輔助",color:"red"},{name:"集會輔助",color:"blue"},{name:"虛空操縱輔助",color:"green"}]], gear:[{slot:"項鍊",current:"惡咒護符",next:"星塵",note:"提高寶石等級與品質"},{slot:"珠寶",current:"稀有深淵珠寶",next:"聚魂石／原始珠寶",note:"支撐清洗魔像"}], notes:"幽魂：激怒酋長、完美森林戰士、完美守護者烏龜、完美督軍。" },
    { id:"high", name:"高預算", summary:"強化毒傷、最大抗性與永久召喚物生存，開始挑戰高難度頭目。", goals:["取得阿曼納姆的邪眼","手套與鞋子補深淵插槽","尋找＋2召喚物寶石腐化冥使之體"], conditions:["幻化守衛寶石 21 級後再打 Uber","單體頭目切換日耀神殿主神"], skills:[[{name:"食腐魔像．清洗",color:"blue"},{name:"覺醒多重打擊",color:"red"},{name:"集會輔助",color:"blue"},{name:"召喚物傷害輔助",color:"blue"}]], gear:[{slot:"胸甲",current:"六連冥使之體",next:"＋2召喚物寶石腐化",note:"最重要的腐化詞"},{slot:"珠寶",current:"優質蒼白之凝",next:"阿曼納姆的邪眼",note:"大幅提升毒傷"}], notes:"T17 憎惡地圖王在中預算以前建議跳過。" },
    { id:"end", name:"終局", summary:"依目標選擇極限傷害或高防禦配置；高額投資前先確認不轉其他召喚流派。", goals:["完成雙腐化核心裝備","處理 Uber Sirus 腐化之血","依需求選擇斯瓦林防禦方案"], conditions:["永久召喚物能承受 Uber 技能","對召喚與聚號保持手動操作"], skills:[[{name:"食腐魔像．清洗",color:"blue"},{name:"覺醒多重打擊",color:"red"},{name:"集會輔助",color:"blue"},{name:"虛空操縱輔助",color:"green"}]], gear:[{slot:"項鍊",current:"星塵",next:"烏爾尼多之誓",note:"極限寶石配置"},{slot:"盾牌",current:"高格擋稀有盾",next:"斯瓦林",note:"可選高防禦方案"}], notes:"召集應手動用於集火與躲避 Uber 大招。" }
  ]
} as unknown as Guide);

export default function Home() {
  const [guides, setGuides] = useState<Guide[]>([starterGuide]);
  const [guideId, setGuideId] = useState(starterGuide.id);
  const [stageId, setStageId] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [pendingImport, setPendingImport] = useState<Guide[] | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>( {} );
  const [ready, setReady] = useState(false);
  const [pobOpen, setPobOpen] = useState(false);
  const [pobCode, setPobCode] = useState("");
  const [pobTitle, setPobTitle] = useState("");
  const [pobSource, setPobSource] = useState("");
  const [pobBusy, setPobBusy] = useState(false);
  const [pobError, setPobError] = useState("");
  const [pobParsed, setPobParsed] = useState<ParsedPob | null>(null);
  const [pobOverrides, setPobOverrides] = useState<Record<string, string>>({});
  const [pobResult, setPobResult] = useState<DecodeResult | null>(null);
  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const glossaryRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate a device-local vault after mount */
  useEffect(() => {
    /* Local-only vault state is intentionally hydrated after mount. */
    setReady(true);
    try {
      const saved = localStorage.getItem("poe-guide-vault");
      const progress = localStorage.getItem("poe-guide-progress");
      const variants = localStorage.getItem("poe-guide-variants");
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length) { const normalized = parsed.map(normalizeGuide); setGuides(normalized); setGuideId(normalized[0].id); setStageId(normalized[0].stages[0].id); } }
      if (progress) setChecked(JSON.parse(progress));
      if (variants) setSelectedVariants(JSON.parse(variants));
      const gloss = localStorage.getItem("poe-glossary");
      if (gloss) setGlossary(JSON.parse(gloss));
    } catch { /* keep starter data */ }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { if (ready) localStorage.setItem("poe-guide-vault", JSON.stringify(guides)); }, [guides, ready]);
  useEffect(() => { if (ready) localStorage.setItem("poe-guide-progress", JSON.stringify(checked)); }, [checked, ready]);
  useEffect(() => { if (ready) localStorage.setItem("poe-guide-variants", JSON.stringify(selectedVariants)); }, [selectedVariants, ready]);

  const guide = guides.find(g => g.id === guideId) ?? guides[0];
  const stage = guide?.stages.find(s => s.id === stageId) ?? guide?.stages[0];
  const progress = useMemo(() => {
    if (!guide) return 0;
    const keys = guide.stages.flatMap(s => [
      ...s.goals.map(item => `${guide.id}-${s.id}-goal-${item.id}`),
      ...s.conditions.map(item => `${guide.id}-${s.id}-condition-${item.id}`),
    ]);
    return keys.length ? Math.round(keys.filter(k => checked[k]).length / keys.length * 100) : 0;
  }, [guide, checked]);

  const patchGuide = (patch: Partial<Guide>) => setGuides(gs => gs.map(g => g.id === guide.id ? { ...g, ...patch } : g));
  const patchStage = (patch: Partial<Stage>) => patchGuide({ stages: guide.stages.map(s => s.id === stage.id ? { ...s, ...patch } : s) });
  const textList = (value: string) => value.split("\n").map(x => x.trim()).filter(Boolean);
  const patchChecks = (kind: "goals" | "conditions", value: string) => { const existing = stage[kind]; const next = textList(value).map((text, i) => existing[i]?.text === text ? existing[i] : { id: uid(), text, required: true }); patchStage({ [kind]: next }); };
  const activeVariant = selectedVariants[guide.id] || "";
  const applies = (variantIds?: string[]) => !variantIds?.length || !activeVariant || variantIds.includes(activeVariant);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ format:"poe-guide-v3", guides }, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `poe-guides-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { try { const raw = JSON.parse(String(reader.result)); const next = Array.isArray(raw) ? raw : raw.guides; if (!Array.isArray(next) || !next.length || next.some((g: Guide) => !g.id || !g.title || !Array.isArray(g.stages))) throw new Error(); setPendingImport(next.map(normalizeGuide)); } catch { alert("無法讀取：檔案不是有效的攻略庫 JSON。"); } }; reader.readAsText(file); e.target.value = "";
  };
  const applyImport = (mode: "add" | "merge" | "replace") => {
    if (!pendingImport) return;
    let result: Guide[];
    if (mode === "replace") result = pendingImport;
    else if (mode === "merge") { const incoming = new Map(pendingImport.map(g => [g.id, g])); result = [...guides.map(g => incoming.get(g.id) || g), ...pendingImport.filter(g => !guides.some(old => old.id === g.id))]; }
    else result = [...guides, ...pendingImport.map(g => guides.some(old => old.id === g.id) ? { ...g, id: `${g.id}-${uid()}` } : g)];
    setGuides(result); setGuideId(result[0].id); setStageId(result[0].stages[0].id); setPendingImport(null);
  };
  const openPobImport = () => { setPobCode(""); setPobTitle(""); setPobSource(""); setPobError(""); setPobParsed(null); setPobOverrides({}); setPobResult(null); setPobOpen(true); };
  const runPobDecode = async () => {
    setPobBusy(true); setPobError(""); setPobResult(null); setPobParsed(null); setPobOverrides({});
    try {
      const parsed = await decodePob(pobCode);
      setPobParsed(parsed);
      setPobResult(buildGuide(parsed, { title: pobTitle, source: pobSource }));
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setPobError(code === "EMPTY" ? "請先貼上 PoB 匯出代碼。" : code === "NOT_POB" ? "這段代碼不是有效的 PoB 匯出（無法解出 Path of Building 內容）。" : code === "BAD_XML" ? "PoB 內容解析失敗，代碼可能不完整。" : "解碼失敗：請確認貼上的是完整的 PoB 匯出代碼（不是 pobb.in 網址）。");
    } finally { setPobBusy(false); }
  };
  // Reassign every set with this name (skill/item/tree share it) to one stage, then rebuild.
  const reassignSet = (name: string, stage: string) => {
    if (!pobParsed) return;
    const next = { ...pobOverrides };
    for (const kind of ["skill", "item", "tree"]) { if (stage) next[`${kind}:${name}`] = stage; else delete next[`${kind}:${name}`]; }
    setPobOverrides(next);
    setPobResult(buildGuide(pobParsed, { title: pobTitle, source: pobSource }, next));
  };
  const loadGlossary = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const gl: Glossary = { gems: raw.gems || {}, uniques: raw.uniques || {}, itemBases: raw.itemBases, spectres: raw.spectres };
        if (!Object.keys(gl.gems).length) throw new Error();
        setGlossary(gl);
        try { localStorage.setItem("poe-glossary", JSON.stringify(gl)); } catch { /* quota: keep in memory only */ }
      } catch { alert("無法讀取：這不是有效的 glossary.json（需包含 gems 對照表）。"); }
    };
    reader.readAsText(file); e.target.value = "";
  };
  const glossaryCount = glossary ? Object.keys(glossary.gems).length + Object.keys(glossary.uniques).length : 0;
  const createFromPob = () => {
    if (!pobParsed) return;
    // Rebuild simplified (one full layout per stage) with the confirmed stage mapping,
    // then apply the local glossary if loaded. All deterministic — no LLM here.
    const built = buildGuide(pobParsed, { title: pobTitle, source: pobSource }, pobOverrides, { simplify: true });
    if (glossary) translateGuide(built.guide, glossary);
    const guide = normalizeGuide({ ...built.guide, pob: pobCode.trim() } as unknown as Guide);
    setGuides(gs => [...gs, guide]); setGuideId(guide.id); setStageId(guide.stages[0].id);
    setPobOpen(false); setPobResult(null); setPobParsed(null); setShowLibrary(false);
  };
  const newGuide = () => {
    const id = uid(); const fresh: Guide = { id, title:"未命名攻略", version:"3.29", archetype:"尚未設定流派", updated:new Date().toISOString().slice(0,10), pob:"", source:"", pros:[], cons:[], coreMechanics:[], requiredItems:[], recommendedItems:[], variants:[], stages:stageNames.map(emptyStage) };
    setGuides(gs => [...gs, fresh]); setGuideId(id); setStageId(fresh.stages[0].id); setShowLibrary(false); setEditing(true);
  };
  const deleteGuide = (id: string) => { if (guides.length === 1) { alert("攻略庫至少需要保留一份攻略。"); return; } const target = guides.find(g => g.id === id); if (!target || !confirm(`確定刪除「${target.title}」？此動作無法復原。`)) return; const next = guides.filter(g => g.id !== id); setGuides(next); if (guideId === id) { setGuideId(next[0].id); setStageId(next[0].stages[0].id); } };
  const duplicateGuide = (source: Guide) => { const copy = normalizeGuide(JSON.parse(JSON.stringify(source))); copy.id = `${source.id}-copy-${uid()}`; copy.title = `${source.title}（複製）`; setGuides(gs => [...gs, copy]); };
  const pasteImage = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/")); if (!image) return;
    e.preventDefault(); const file = image.getAsFile(); if (!file) return; const reader = new FileReader(); reader.onload = () => patchStage({ image:String(reader.result) }); reader.readAsDataURL(file);
  };

  if (!guide || !stage) return null;
  const stageIndex = guide.stages.findIndex(s => s.id === stage.id);
  // Sets the heuristic couldn't place, de-duplicated by name (skill/item/tree share a name).
  const pobFlagged = pobResult ? Array.from(new Map(pobResult.sets.filter(s => !s.assigned).map(s => [s.name, s])).values()) : [];
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setShowLibrary(true)}><span className="brand-mark">◇</span><span>流亡攻略庫</span></button>
        <div className="top-actions">
          <button className="ghost" onClick={openPobImport}>貼 PoB</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>匯入</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={importData}/>
          <button className="ghost" onClick={exportData}>匯出</button>
          <button className={editing ? "primary active" : "primary"} onClick={() => setEditing(v => !v)}>{editing ? "完成編輯" : "編輯模式"}</button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="guide-switcher"><span className="eyebrow">目前攻略</span><button onClick={() => setShowLibrary(true)}>{guide.title}<span>⌄</span></button></div>
        <nav aria-label="攻略階段">{guide.stages.map((s, i) => <button key={s.id} className={s.id===stage.id?"stage active":"stage"} onClick={() => setStageId(s.id)}><span className="stage-number">{String(i).padStart(2,"0")}</span><span>{s.name}</span><i>{s.goals.filter(item=>checked[`${guide.id}-${s.id}-goal-${item.id}`]).length}/{s.goals.length}</i></button>)}</nav>
        <button className="new-guide" onClick={newGuide}>＋ 新增攻略</button>
      </aside>

      <section className="workspace">
        <div className="guide-header">
          <div>{editing ? <><input className="title-input" value={guide.title} onChange={e=>patchGuide({title:e.target.value})}/><input className="meta-input" value={guide.archetype} onChange={e=>patchGuide({archetype:e.target.value})}/></> : <><div className="title-line"><h1>{guide.title}</h1><span className="version">{guide.version}</span></div><p>{guide.archetype}　·　來源：{guide.source || "個人整理"}</p></>}</div>
          <div className="progress"><div className="progress-ring" style={{"--p":`${progress*3.6}deg`} as React.CSSProperties}><span>{progress}%</span></div><div><small>目前階段</small><strong>{stage.name}</strong></div></div>
        </div>
        {(guide.variants.length > 0 || editing) && <div className="variant-bar"><div><small>配置方案</small>{editing ? <button className="inline-button" onClick={()=>patchGuide({variants:[...guide.variants,{id:`variant-${uid()}`,name:"新方案",description:""}]})}>＋ 新增方案</button> : <select value={activeVariant} onChange={e=>setSelectedVariants(v=>({...v,[guide.id]:e.target.value}))}><option value="">顯示共通配置</option>{guide.variants.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select>}</div>{guide.variants.map((v,i)=>editing?<div className="variant-edit" key={v.id}><input value={v.name} aria-label="方案名稱" onChange={e=>patchGuide({variants:guide.variants.map((x,n)=>n===i?{...x,name:e.target.value}:x)})}/><input value={v.description} aria-label="方案說明" onChange={e=>patchGuide({variants:guide.variants.map((x,n)=>n===i?{...x,description:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchGuide({variants:guide.variants.filter((_,n)=>n!==i)})}>刪除</button></div>:activeVariant===v.id?<p key={v.id}>{v.description}</p>:null)}</div>}
        <div className="timeline">{guide.stages.map((s,i)=><button key={s.id} className={s.id===stage.id?"active":""} onClick={()=>setStageId(s.id)}><span>{i < stageIndex ? "✓" : i+1}</span>{s.name}</button>)}</div>

        <div className="dashboard">
          {stageIndex===0&&<article className="card overview-card"><div className="card-heading"><span className="icon">◇</span><div><small>BUILD OVERVIEW</small><h2>流派速覽</h2></div></div>
            {editing?<div className="overview-editor"><label>核心機制<textarea value={guide.coreMechanics.join("\n")} onChange={e=>patchGuide({coreMechanics:textList(e.target.value)})}/></label><label>優點<textarea value={guide.pros.join("\n")} onChange={e=>patchGuide({pros:textList(e.target.value)})}/></label><label>缺點<textarea value={guide.cons.join("\n")} onChange={e=>patchGuide({cons:textList(e.target.value)})}/></label><label>必要物品<textarea value={guide.requiredItems.join("\n")} onChange={e=>patchGuide({requiredItems:textList(e.target.value)})}/></label><label>建議物品<textarea value={guide.recommendedItems.join("\n")} onChange={e=>patchGuide({recommendedItems:textList(e.target.value)})}/></label></div>:<div className="overview-columns"><section><h3>核心機制</h3>{guide.coreMechanics.map(x=><p key={x}>{x}</p>)}</section><section><h3 className="good">優點</h3>{guide.pros.map(x=><p key={x}>＋ {x}</p>)}</section><section><h3 className="bad">缺點</h3>{guide.cons.map(x=><p key={x}>－ {x}</p>)}</section><section><h3>必要／建議物品</h3>{guide.requiredItems.map(x=><p key={x}><b>必要</b> {x}</p>)}{guide.recommendedItems.map(x=><p key={x}><span>建議</span> {x}</p>)}</section></div>}
          </article>}
          <article className="card goals-card"><div className="card-heading"><span className="icon">◎</span><div><small>STEP {stageIndex+1}</small><h2>目前目標</h2></div></div>
            {editing ? <><textarea value={stage.summary} onChange={e=>patchStage({summary:e.target.value})}/><label className="field-label">每行一個目標</label><textarea value={stage.goals.map(x=>x.text).join("\n")} onChange={e=>patchChecks("goals",e.target.value)}/></> : <><p className="summary">{stage.summary}</p><ul className="checklist">{stage.goals.map(g=>{const k=`${guide.id}-${stage.id}-goal-${g.id}`;return <li key={k}><label><input type="checkbox" checked={!!checked[k]} onChange={()=>setChecked(c=>({...c,[k]:!c[k]}))}/><span>{g.text}</span></label></li>})}</ul></>}
          </article>

          <article className="card conditions-card"><div className="card-heading"><span className="icon">✓</span><div><small>READY CHECK</small><h2>轉型條件</h2></div></div>
            {editing ? <><label className="field-label">每行一個條件</label><textarea value={stage.conditions.map(x=>x.text).join("\n")} onChange={e=>patchChecks("conditions",e.target.value)}/>{stage.conditions.map((g,i)=><div className="unlock-edit" key={g.id}><span>{g.text}</span><input placeholder="完成後提示（選填）" value={g.unlockMessage||""} onChange={e=>patchStage({conditions:stage.conditions.map((x,n)=>n===i?{...x,unlockMessage:e.target.value}:x)})}/></div>)}</> : <><ul className="checklist">{stage.conditions.map(g=>{const k=`${guide.id}-${stage.id}-condition-${g.id}`;return <li key={k}><label><input type="checkbox" checked={!!checked[k]} onChange={()=>setChecked(c=>({...c,[k]:!c[k]}))}/><span>{g.text}</span></label>{checked[k]&&g.unlockMessage&&<p className="unlock-message">✓ {g.unlockMessage}</p>}</li>})}</ul></>}
            <div className="condition-score"><strong>{stage.conditions.filter(item=>checked[`${guide.id}-${stage.id}-condition-${item.id}`]).length}<span> / {stage.conditions.length}</span></strong><small>符合條件</small></div>
          </article>

          <article className="card skills-card"><div className="card-heading"><span className="icon">⌁</span><div><small>GEM LINKS BY ITEM</small><h2>技能連線</h2></div></div>
            {stage.skills.length ? stage.skills.map((group,i)=>({group,i})).filter(({group})=>editing||applies(group.variantIds)).map(({group,i})=><div className="skill-group" key={group.id}><div className="skill-group-head">{editing?<><input value={group.slot} aria-label="裝備部位" onChange={e=>patchStage({skills:stage.skills.map((x,n)=>n===i?{...x,slot:e.target.value}:x)})}/><input value={group.label} aria-label="技能組名稱" onChange={e=>patchStage({skills:stage.skills.map((x,n)=>n===i?{...x,label:e.target.value}:x)})}/><input value={(group.variantIds||[]).join(",")} aria-label="適用方案 ID" placeholder="方案 ID（選填）" onChange={e=>patchStage({skills:stage.skills.map((x,n)=>n===i?{...x,variantIds:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)}:x)})}/><button className="danger-small" onClick={()=>patchStage({skills:stage.skills.filter((_,n)=>n!==i)})}>刪除技能組</button></>:<><strong>{group.slot}</strong><span>{group.label}</span></>}</div><div className="gems">{group.gems.map((s,x)=>editing?<span className="gem-edit" key={x}><select value={s.color} onChange={e=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.map((gem,gi)=>gi===x?{...gem,color:e.target.value as Skill["color"]}:gem)}:row)})}><option value="blue">藍</option><option value="red">紅</option><option value="green">綠</option></select><input value={s.name} onChange={e=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.map((gem,gi)=>gi===x?{...gem,name:e.target.value}:gem)}:row)})}/><button aria-label={`移除 ${s.name}`} onClick={()=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.filter((_,gi)=>gi!==x)}:row)})}>×</button></span>:<span className={`gem ${s.color}`} key={x}><i>{s.color==="blue"?"B":s.color==="red"?"R":"G"}</i>{s.name}</span>)}</div>{editing&&<button className="inline-button" onClick={()=>patchStage({skills:stage.skills.map((row,n)=>n===i?{...row,gems:[...row.gems,{name:"新寶石",color:"blue"}]}:row)})}>＋ 新增寶石</button>}</div>) : <p className="empty">尚未填寫技能連線。</p>}
            {editing && <button className="inline-button" onClick={()=>patchStage({skills:[...stage.skills,{id:uid(),slot:"裝備部位",label:"技能組名稱",gems:[]}]})}>＋ 新增技能組</button>}
          </article>

          <article className="card swaps-card"><div className="card-heading"><span className="icon">⇄</span><div><small>CONDITIONAL SWAPS</small><h2>寶石替換</h2></div></div>
            {stage.swaps.map((s,i)=>({s,i})).filter(({s})=>editing||applies(s.variantIds)).map(({s,i})=>editing?<div className="row-editor swap-editor" key={s.id}><input value={s.remove} placeholder="移除寶石" onChange={e=>patchStage({swaps:stage.swaps.map((x,n)=>n===i?{...x,remove:e.target.value}:x)})}/><span>→</span><input value={s.add} placeholder="換入寶石" onChange={e=>patchStage({swaps:stage.swaps.map((x,n)=>n===i?{...x,add:e.target.value}:x)})}/><input value={s.when} placeholder="使用時機" onChange={e=>patchStage({swaps:stage.swaps.map((x,n)=>n===i?{...x,when:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({swaps:stage.swaps.filter((_,n)=>n!==i)})}>刪除</button></div>:<div className="swap-item" key={s.id}><strong>{s.when}</strong><span>{s.remove}</span><b>→</b><span>{s.add}</span></div>)}
            {!stage.swaps.length&&!editing&&<p className="empty">這個階段沒有情境替換。</p>}{editing&&<button className="inline-button" onClick={()=>patchStage({swaps:[...stage.swaps,{id:uid(),remove:"",add:"",when:""}]})}>＋ 新增替換</button>}
          </article>

          <article className="card spectre-card"><div className="card-heading"><span className="icon">♟</span><div><small>SPECTRE ROSTER</small><h2>幽魂配置</h2></div></div>
            <div className="spectre-list">{stage.spectres.map((s,i)=>editing?<div className="row-editor spectre-editor" key={s.id}><input value={s.name} placeholder="幽魂名稱" onChange={e=>patchStage({spectres:stage.spectres.map((x,n)=>n===i?{...x,name:e.target.value}:x)})}/><input type="number" min="1" value={s.count} aria-label="數量" onChange={e=>patchStage({spectres:stage.spectres.map((x,n)=>n===i?{...x,count:Number(e.target.value)||1}:x)})}/><input value={s.role} placeholder="功能" onChange={e=>patchStage({spectres:stage.spectres.map((x,n)=>n===i?{...x,role:e.target.value}:x)})}/><input value={s.acquisition} placeholder="取得方式" onChange={e=>patchStage({spectres:stage.spectres.map((x,n)=>n===i?{...x,acquisition:e.target.value}:x)})}/><input value={s.replaces} placeholder="取代對象" onChange={e=>patchStage({spectres:stage.spectres.map((x,n)=>n===i?{...x,replaces:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({spectres:stage.spectres.filter((_,n)=>n!==i)})}>刪除</button></div>:<div className="spectre-item" key={s.id}><span className="spectre-count">×{s.count}</span><div><strong>{s.name}</strong><p>{s.role}</p><small>{s.acquisition}{s.replaces&&` · 取代：${s.replaces}`}</small></div></div>)}</div>
            {!stage.spectres.length&&!editing&&<p className="empty">這個階段尚未指定幽魂陣容。</p>}{editing&&<button className="inline-button" onClick={()=>patchStage({spectres:[...stage.spectres,{id:uid(),name:"",count:1,role:"",acquisition:"",replaces:""}]})}>＋ 新增幽魂</button>}
          </article>

          <article className="card warnings-card"><div className="card-heading"><span className="icon">!</span><div><small>ZH-TW WARNINGS</small><h2>繁中詞綴與危險內容</h2></div></div>
            {stage.warnings.map((w,i)=>editing?<div className="warning-editor" key={w.id}><select value={w.severity} onChange={e=>patchStage({warnings:stage.warnings.map((x,n)=>n===i?{...x,severity:e.target.value as Warning["severity"]}:x)})}><option value="info">資訊</option><option value="warning">注意</option><option value="danger">危險</option></select><input value={w.title} placeholder="標題" onChange={e=>patchStage({warnings:stage.warnings.map((x,n)=>n===i?{...x,title:e.target.value}:x)})}/><input value={w.localizedText} placeholder="繁中遊戲文字" onChange={e=>patchStage({warnings:stage.warnings.map((x,n)=>n===i?{...x,localizedText:e.target.value}:x)})}/><input value={w.recommendation} placeholder="處理建議" onChange={e=>patchStage({warnings:stage.warnings.map((x,n)=>n===i?{...x,recommendation:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({warnings:stage.warnings.filter((_,n)=>n!==i)})}>刪除</button></div>:<div className={`warning-item ${w.severity}`} key={w.id}><strong>{w.title}</strong><p>{w.localizedText}</p><span>{w.recommendation}</span></div>)}
            {!stage.warnings.length&&!editing&&<p className="empty">這個階段沒有特別警告。</p>}{editing&&<button className="inline-button" onClick={()=>patchStage({warnings:[...stage.warnings,{id:uid(),severity:"warning",category:"general",title:"",localizedText:"",recommendation:""}]})}>＋ 新增警告</button>}
          </article>

          <article className="card progression-card"><div className="card-heading"><span className="icon">⌘</span><div><small>CHARACTER PROGRESSION</small><h2>昇華、天賦與刺青</h2></div></div>
            {stage.progression.map((p,i)=>editing?<div className="row-editor progression-editor" key={p.id}><select value={p.type} onChange={e=>patchStage({progression:stage.progression.map((x,n)=>n===i?{...x,type:e.target.value as Progression["type"]}:x)})}><option value="ascendancy">昇華</option><option value="passive">天賦</option><option value="anointment">塗油</option><option value="tattoo">刺青</option></select><input value={p.name} placeholder="名稱" onChange={e=>patchStage({progression:stage.progression.map((x,n)=>n===i?{...x,name:e.target.value}:x)})}/><input value={p.detail} placeholder="時機與效果" onChange={e=>patchStage({progression:stage.progression.map((x,n)=>n===i?{...x,detail:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({progression:stage.progression.filter((_,n)=>n!==i)})}>刪除</button></div>:<div className="progression-item" key={p.id}><span>{({ascendancy:"昇華",passive:"天賦",anointment:"塗油",tattoo:"刺青"} as const)[p.type]}</span><div><strong>{p.name}</strong><p>{p.detail}</p></div></div>)}
            {!stage.progression.length&&!editing&&<p className="empty">尚未整理這個階段的角色調整。</p>}{editing&&<button className="inline-button" onClick={()=>patchStage({progression:[...stage.progression,{id:uid(),type:"passive",name:"",detail:""}]})}>＋ 新增角色調整</button>}
          </article>

          <article className="card sections-card"><div className="card-heading"><span className="icon">≡</span><div><small>DETAILED GUIDE</small><h2>製作、操作與 FAQ</h2></div></div>
            {stage.sections.map((s,i)=>editing?<div className="section-editor" key={s.id}><select value={s.type} onChange={e=>patchStage({sections:stage.sections.map((x,n)=>n===i?{...x,type:e.target.value as GuideSection["type"]}:x)})}><option value="craft">製作</option><option value="map-mods">地圖詞綴</option><option value="mechanic">機制</option><option value="faq">FAQ</option><option value="playstyle">操作</option><option value="bossing">頭目</option></select><input value={s.title} placeholder="標題" onChange={e=>patchStage({sections:stage.sections.map((x,n)=>n===i?{...x,title:e.target.value}:x)})}/><textarea value={s.content} placeholder="詳細內容" onChange={e=>patchStage({sections:stage.sections.map((x,n)=>n===i?{...x,content:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({sections:stage.sections.filter((_,n)=>n!==i)})}>刪除</button></div>:<details key={s.id}><summary><span>{s.type}</span>{s.title}</summary><p>{s.content}</p></details>)}
            {!stage.sections.length&&!editing&&<p className="empty">尚未加入詳細章節。</p>}{editing&&<button className="inline-button" onClick={()=>patchStage({sections:[...stage.sections,{id:uid(),type:"mechanic",title:"",content:""}]})}>＋ 新增折疊章節</button>}
          </article>

          <article className="card gear-card"><div className="card-heading"><span className="icon">↗</span><div><small>UPGRADES</small><h2>裝備升級</h2></div></div>
            <div className="gear-table"><div className="gear-head"><span>部位</span><span>目前</span><span></span><span>下一步</span><span></span></div>{stage.gear.map((g,i)=>({g,i})).filter(({g})=>editing||applies(g.variantIds)).map(({g,i})=><div className="gear-row" key={i}>{editing?<><input value={g.slot} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,slot:e.target.value}:x)})}/><input value={g.current} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,current:e.target.value}:x)})}/><span>→</span><input value={g.next} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,next:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({gear:stage.gear.filter((_,n)=>n!==i)})}>刪除</button></>:<><strong>{g.slot}</strong><span>{g.current}<small>{g.note}</small></span><b>→</b><span>{g.next}</span><span></span></>}</div>)}</div>
            {editing && <button className="inline-button" onClick={()=>patchStage({gear:[...stage.gear,{slot:"部位",current:"目前裝備",next:"下一步裝備",note:""}]})}>＋ 新增裝備列</button>}
          </article>

          <article className="card notes-card"><div className="card-heading"><span className="icon">✎</span><div><small>PERSONAL NOTES</small><h2>個人筆記與圖片</h2></div></div>
            {editing ? <textarea className="notes-input" value={stage.notes} placeholder="輸入筆記；也可以直接在這張卡片貼上剪貼簿圖片。" onChange={e=>patchStage({notes:e.target.value})} onPaste={pasteImage}/> : <p className="notes-copy">{stage.notes || "這個階段還沒有筆記。"}</p>}
            {stage.image && <div className="pasted-image"><img src={stage.image} alt="攻略補充圖片"/><button onClick={()=>patchStage({image:undefined})}>移除圖片</button></div>}
          </article>

          <article className="card links-card"><div className="card-heading"><span className="icon">↗</span><div><small>REFERENCES</small><h2>PoB 與來源</h2></div></div>
            {editing ? <div className="link-fields"><label>PoB／pobb.in<input value={guide.pob} onChange={e=>patchGuide({pob:e.target.value})}/></label><label>攻略來源<input value={guide.source} onChange={e=>patchGuide({source:e.target.value})}/></label><label>版本<input value={guide.version} onChange={e=>patchGuide({version:e.target.value})}/></label></div> : <div className="link-list">{guide.pob ? <a href={guide.pob} target="_blank">開啟 PoB ↗</a>:<span>尚未加入 PoB 連結</span>}<span>來源：{guide.source||"個人整理"}</span><span>最後更新：{guide.updated}</span></div>}
          </article>
        </div>
      </section>

      {showLibrary && <div className="modal-backdrop" onMouseDown={()=>setShowLibrary(false)}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>MY BUILD LIBRARY</small><h2>選擇攻略</h2></div><button onClick={()=>setShowLibrary(false)}>×</button></div><div className="guide-grid">{guides.map(g=><div className="guide-card" key={g.id}><button className="guide-open" onClick={()=>{setGuideId(g.id);setStageId(g.stages[0].id);setShowLibrary(false)}}><span className="guide-version">{g.version}</span><strong>{g.title}</strong><small>{g.archetype}</small><i>{g.stages.length} 個階段</i></button><div className="guide-actions"><button onClick={()=>duplicateGuide(g)}>複製</button><button className="danger" onClick={()=>deleteGuide(g.id)}>刪除</button></div></div>)}<button className="add-card" onClick={newGuide}><strong>＋</strong><span>建立空白攻略</span></button></div></section></div>}
      {pendingImport && <div className="modal-backdrop"><section className="modal import-modal"><div className="modal-head"><div><small>IMPORT GUIDES</small><h2>匯入 {pendingImport.length} 份攻略</h2></div><button onClick={()=>setPendingImport(null)}>×</button></div><p>選擇如何處理目前攻略庫。建議一般新增流派使用「新增」，更新既有攻略使用「依 ID 合併」。</p><div className="import-options"><button onClick={()=>applyImport("add")}><strong>新增攻略</strong><span>保留全部現有攻略；重複 ID 會建立副本。</span></button><button onClick={()=>applyImport("merge")}><strong>依 ID 合併</strong><span>同 ID 更新，不同 ID 新增。</span></button><button className="danger-zone" onClick={()=>confirm("確定以匯入檔取代全部現有攻略？")&&applyImport("replace")}><strong>取代全部</strong><span>刪除現有攻略並完全採用匯入檔。</span></button></div></section></div>}
      {pobOpen && <div className="modal-backdrop" onMouseDown={()=>!pobBusy&&setPobOpen(false)}><section className="modal pob-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><small>IMPORT FROM POB</small><h2>從 PoB 代碼匯入</h2></div><button onClick={()=>setPobOpen(false)}>×</button></div>
        {!pobResult ? <div className="pob-form">
          <p className="pob-hint">貼上 Path of Building 的<b>匯出代碼</b>（Import/Export → Generate；或 pobb.in 頁面上的 raw 代碼）。技能、裝備、天賦會被精確解碼、化簡並依階段分好，不需要 LLM。</p>
          <div className="pob-glossary">
            {glossary ? <span className="pob-gloss-ok">✓ 詞庫已載入（{glossaryCount.toLocaleString()} 條）· 建立時自動翻譯成繁中</span>
                      : <span className="pob-gloss-no">未載入詞庫 · 建立的攻略會保留英文寶石／裝備名</span>}
            <button className="ghost-sm" onClick={()=>glossaryRef.current?.click()}>{glossary ? "重新載入" : "載入詞庫 glossary.json"}</button>
            <input ref={glossaryRef} type="file" accept="application/json,.json" hidden onChange={loadGlossary}/>
          </div>
          <textarea className="pob-code" value={pobCode} placeholder="在此貼上 PoB 匯出代碼…" onChange={e=>setPobCode(e.target.value)} spellCheck={false}/>
          <div className="pob-meta"><label>攻略標題（選填）<input value={pobTitle} placeholder="例：毒食腐魔像＋殭屍" onChange={e=>setPobTitle(e.target.value)}/></label><label>來源（選填）<input value={pobSource} placeholder="例：Maxroll / 作者名" onChange={e=>setPobSource(e.target.value)}/></label></div>
          {pobError && <p className="pob-error">{pobError}</p>}
          <div className="pob-actions"><button className="primary" disabled={pobBusy||!pobCode.trim()} onClick={runPobDecode}>{pobBusy?"解碼中…":"解析代碼"}</button></div>
        </div> : <div className="pob-summary">
          <div className="pob-stats"><span><b>{pobResult.summary.skillSets}</b>技能組</span><span><b>{pobResult.summary.itemSets}</b>裝備組</span><span><b>{pobResult.summary.trees}</b>天賦樹</span><span><b>{pobResult.summary.gemPlacements}</b>寶石擺放</span></div>
          <p className="pob-title-preview">將建立：<b>{pobResult.guide.title}</b>{pobResult.guide.archetype && <span>（{pobResult.guide.archetype}）</span>}</p>
          {pobFlagged.length>0 ? <div className="pob-flags"><p className="pob-warn">⚠ 有 {pobFlagged.length} 套配置無法自動判斷階段，請指定（留空＝暫放初入輿圖）：</p>
            {pobFlagged.map(s=><div className="pob-flag-row" key={s.name}><span className="pob-kind">{kindLabel(s.kind)}</span><span className="pob-setname">{s.name}</span><select value={pobOverrides[`${s.kind}:${s.name}`]||""} onChange={e=>reassignSet(s.name,e.target.value)}><option value="">未指定</option>{stageOptions.map(([id,nm])=><option key={id} value={id}>{nm}</option>)}</select></div>)}
          </div> : <p className="pob-ok">✓ 所有配置都已自動判斷階段。</p>}
          <details className="pob-map"><summary>檢視全部階段對應（{pobResult.sets.length} 套配置）</summary>
            {stageOptions.map(([id,nm])=>{const inS=pobResult.sets.filter(x=>x.stage===id); return inS.length?<div className="pob-map-row" key={id}><b>{nm}</b><div>{inS.map(x=><span key={x.key} className={x.assigned?"pob-chip":"pob-chip flag"}>{kindLabel(x.kind)}·{x.name}</span>)}</div></div>:null;})}
          </details>
          <p className="pob-note">建立時會<b>化簡</b>為每階一套完整佈局{glossary ? <>，並用詞庫<b>翻譯成繁中</b></> : <>（未載入詞庫 → 保留英文）</>}。解碼內容 100% 來自 PoB。</p>
          <div className="pob-actions"><button className="ghost" onClick={()=>{setPobResult(null);setPobParsed(null);setPobOverrides({});}}>重新貼上</button><button className="primary" onClick={createFromPob}>建立攻略</button></div>
        </div>}
      </section></div>}
    </main>
  );
}

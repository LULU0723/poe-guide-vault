"use client";
/* eslint-disable @next/next/no-img-element -- guide images are user-pasted data URLs */

import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Skill = { name: string; color: "blue" | "red" | "green" };
type SkillGroup = { id: string; slot: string; label: string; gems: Skill[] };
type Gear = { slot: string; current: string; next: string; note: string };
type Stage = {
  id: string; name: string; summary: string; goals: string[]; conditions: string[];
  skills: SkillGroup[]; gear: Gear[]; notes: string; image?: string;
};
type Guide = { id: string; title: string; version: string; archetype: string; updated: string; pob: string; source: string; stages: Stage[] };

const stageNames = ["總覽", "劇情", "初入輿圖", "低預算", "中預算", "高預算", "終局"];
const uid = () => Math.random().toString(36).slice(2, 9);
const progressKey = (guideId: string, stageId: string, kind: "goal" | "condition", text: string, occurrence = 0) => `${guideId}-${stageId}-${kind}-${encodeURIComponent(text.trim())}-${occurrence}`;
const normalizeGuide = (input: Guide): Guide => ({ ...input, stages: (input.stages || []).map(stage => ({ ...stage, goals: stage.goals || [], conditions: stage.conditions || [], gear: stage.gear || [], notes: stage.notes || "", skills: (stage.skills || []).map((group, index) => Array.isArray(group) ? { id: uid(), slot: index === 0 ? "胸甲" : "未指定", label: index === 0 ? "主力技能" : `技能組 ${index + 1}`, gems: group as Skill[] } : { id: group.id || uid(), slot: group.slot || "未指定", label: group.label || `技能組 ${index + 1}`, gems: group.gems || [] }) })) });
const emptyStage = (name: string, i: number): Stage => ({ id: `stage-${i}`, name, summary: "點擊編輯模式，填寫這個階段的目標。", goals: [], conditions: [], skills: [], gear: [], notes: "" });

const starterGuide: Guide = normalizeGuide({
  id: "carrion-329", title: "毒食腐魔像＋殭屍", version: "3.29", archetype: "死靈師 · 混沌毒傷", updated: "2026-07-19", pob: "", source: "Helm Breaker / Maxroll",
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
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate a device-local vault after mount */
  useEffect(() => {
    /* Local-only vault state is intentionally hydrated after mount. */
    setReady(true);
    try {
      const saved = localStorage.getItem("poe-guide-vault");
      const progress = localStorage.getItem("poe-guide-progress");
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length) { const normalized = parsed.map(normalizeGuide); setGuides(normalized); setGuideId(normalized[0].id); setStageId(normalized[0].stages[0].id); } }
      if (progress) setChecked(JSON.parse(progress));
    } catch { /* keep starter data */ }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { if (ready) localStorage.setItem("poe-guide-vault", JSON.stringify(guides)); }, [guides, ready]);
  useEffect(() => { if (ready) localStorage.setItem("poe-guide-progress", JSON.stringify(checked)); }, [checked, ready]);

  const guide = guides.find(g => g.id === guideId) ?? guides[0];
  const stage = guide?.stages.find(s => s.id === stageId) ?? guide?.stages[0];
  const progress = useMemo(() => {
    if (!guide) return 0;
    const keys = guide.stages.flatMap(s => [
      ...s.goals.map((item, i, all) => progressKey(guide.id, s.id, "goal", item, all.slice(0, i).filter(x => x === item).length)),
      ...s.conditions.map((item, i, all) => progressKey(guide.id, s.id, "condition", item, all.slice(0, i).filter(x => x === item).length)),
    ]);
    return keys.length ? Math.round(keys.filter(k => checked[k]).length / keys.length * 100) : 0;
  }, [guide, checked]);

  const patchGuide = (patch: Partial<Guide>) => setGuides(gs => gs.map(g => g.id === guide.id ? { ...g, ...patch } : g));
  const patchStage = (patch: Partial<Stage>) => patchGuide({ stages: guide.stages.map(s => s.id === stage.id ? { ...s, ...patch } : s) });
  const textList = (value: string) => value.split("\n").map(x => x.trim()).filter(Boolean);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ format:"poe-guide-v2", guides }, null, 2)], { type:"application/json" });
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
  const newGuide = () => {
    const id = uid(); const fresh: Guide = { id, title:"未命名攻略", version:"3.29", archetype:"尚未設定流派", updated:new Date().toISOString().slice(0,10), pob:"", source:"", stages:stageNames.map(emptyStage) };
    setGuides(gs => [...gs, fresh]); setGuideId(id); setStageId(fresh.stages[0].id); setShowLibrary(false); setEditing(true);
  };
  const deleteGuide = (id: string) => { if (guides.length === 1) { alert("攻略庫至少需要保留一份攻略。"); return; } const target = guides.find(g => g.id === id); if (!target || !confirm(`確定刪除「${target.title}」？此動作無法復原。`)) return; const next = guides.filter(g => g.id !== id); setGuides(next); if (guideId === id) { setGuideId(next[0].id); setStageId(next[0].stages[0].id); } };
  const duplicateGuide = (source: Guide) => { const copy = normalizeGuide(JSON.parse(JSON.stringify(source))); copy.id = `${source.id}-copy-${uid()}`; copy.title = `${source.title}（複製）`; setGuides(gs => [...gs, copy]); };
  const pasteImage = (e: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/")); if (!image) return;
    e.preventDefault(); const file = image.getAsFile(); if (!file) return; const reader = new FileReader(); reader.onload = () => patchStage({ image:String(reader.result) }); reader.readAsDataURL(file);
  };

  if (!guide || !stage) return null;
  const stageIndex = guide.stages.findIndex(s => s.id === stage.id);
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setShowLibrary(true)}><span className="brand-mark">◇</span><span>流亡攻略庫</span></button>
        <div className="top-actions">
          <button className="ghost" onClick={() => fileRef.current?.click()}>匯入</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={importData}/>
          <button className="ghost" onClick={exportData}>匯出</button>
          <button className={editing ? "primary active" : "primary"} onClick={() => setEditing(v => !v)}>{editing ? "完成編輯" : "編輯模式"}</button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="guide-switcher"><span className="eyebrow">目前攻略</span><button onClick={() => setShowLibrary(true)}>{guide.title}<span>⌄</span></button></div>
        <nav aria-label="攻略階段">{guide.stages.map((s, i) => <button key={s.id} className={s.id===stage.id?"stage active":"stage"} onClick={() => setStageId(s.id)}><span className="stage-number">{String(i).padStart(2,"0")}</span><span>{s.name}</span><i>{s.goals.filter((item,x,all)=>checked[progressKey(guide.id,s.id,"goal",item,all.slice(0,x).filter(v=>v===item).length)]).length}/{s.goals.length}</i></button>)}</nav>
        <button className="new-guide" onClick={newGuide}>＋ 新增攻略</button>
      </aside>

      <section className="workspace">
        <div className="guide-header">
          <div>{editing ? <><input className="title-input" value={guide.title} onChange={e=>patchGuide({title:e.target.value})}/><input className="meta-input" value={guide.archetype} onChange={e=>patchGuide({archetype:e.target.value})}/></> : <><div className="title-line"><h1>{guide.title}</h1><span className="version">{guide.version}</span></div><p>{guide.archetype}　·　來源：{guide.source || "個人整理"}</p></>}</div>
          <div className="progress"><div className="progress-ring" style={{"--p":`${progress*3.6}deg`} as React.CSSProperties}><span>{progress}%</span></div><div><small>目前階段</small><strong>{stage.name}</strong></div></div>
        </div>
        <div className="timeline">{guide.stages.map((s,i)=><button key={s.id} className={s.id===stage.id?"active":""} onClick={()=>setStageId(s.id)}><span>{i < stageIndex ? "✓" : i+1}</span>{s.name}</button>)}</div>

        <div className="dashboard">
          <article className="card goals-card"><div className="card-heading"><span className="icon">◎</span><div><small>STEP {stageIndex+1}</small><h2>目前目標</h2></div></div>
            {editing ? <><textarea value={stage.summary} onChange={e=>patchStage({summary:e.target.value})}/><label className="field-label">每行一個目標</label><textarea value={stage.goals.join("\n")} onChange={e=>patchStage({goals:textList(e.target.value)})}/></> : <><p className="summary">{stage.summary}</p><ul className="checklist">{stage.goals.map((g,i,all)=>{const k=progressKey(guide.id,stage.id,"goal",g,all.slice(0,i).filter(v=>v===g).length);return <li key={k}><label><input type="checkbox" checked={!!checked[k]} onChange={()=>setChecked(c=>({...c,[k]:!c[k]}))}/><span>{g}</span></label></li>})}</ul></>}
          </article>

          <article className="card conditions-card"><div className="card-heading"><span className="icon">✓</span><div><small>READY CHECK</small><h2>轉型條件</h2></div></div>
            {editing ? <><label className="field-label">每行一個條件</label><textarea value={stage.conditions.join("\n")} onChange={e=>patchStage({conditions:textList(e.target.value)})}/></> : <ul className="checklist">{stage.conditions.map((g,i,all)=>{const k=progressKey(guide.id,stage.id,"condition",g,all.slice(0,i).filter(v=>v===g).length);return <li key={k}><label><input type="checkbox" checked={!!checked[k]} onChange={()=>setChecked(c=>({...c,[k]:!c[k]}))}/><span>{g}</span></label></li>})}</ul>}
            <div className="condition-score"><strong>{stage.conditions.filter((item,i,all)=>checked[progressKey(guide.id,stage.id,"condition",item,all.slice(0,i).filter(v=>v===item).length)]).length}<span> / {stage.conditions.length}</span></strong><small>符合條件</small></div>
          </article>

          <article className="card skills-card"><div className="card-heading"><span className="icon">⌁</span><div><small>GEM LINKS BY ITEM</small><h2>技能連線</h2></div></div>
            {stage.skills.length ? stage.skills.map((group,i)=><div className="skill-group" key={group.id}><div className="skill-group-head">{editing?<><input value={group.slot} aria-label="裝備部位" onChange={e=>patchStage({skills:stage.skills.map((x,n)=>n===i?{...x,slot:e.target.value}:x)})}/><input value={group.label} aria-label="技能組名稱" onChange={e=>patchStage({skills:stage.skills.map((x,n)=>n===i?{...x,label:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({skills:stage.skills.filter((_,n)=>n!==i)})}>刪除技能組</button></>:<><strong>{group.slot}</strong><span>{group.label}</span></>}</div><div className="gems">{group.gems.map((s,x)=>editing?<span className="gem-edit" key={x}><select value={s.color} onChange={e=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.map((gem,gi)=>gi===x?{...gem,color:e.target.value as Skill["color"]}:gem)}:row)})}><option value="blue">藍</option><option value="red">紅</option><option value="green">綠</option></select><input value={s.name} onChange={e=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.map((gem,gi)=>gi===x?{...gem,name:e.target.value}:gem)}:row)})}/><button aria-label={`移除 ${s.name}`} onClick={()=>patchStage({skills:stage.skills.map((row,ri)=>ri===i?{...row,gems:row.gems.filter((_,gi)=>gi!==x)}:row)})}>×</button></span>:<span className={`gem ${s.color}`} key={x}><i>{s.color==="blue"?"B":s.color==="red"?"R":"G"}</i>{s.name}</span>)}</div>{editing&&<button className="inline-button" onClick={()=>patchStage({skills:stage.skills.map((row,n)=>n===i?{...row,gems:[...row.gems,{name:"新寶石",color:"blue"}]}:row)})}>＋ 新增寶石</button>}</div>) : <p className="empty">尚未填寫技能連線。</p>}
            {editing && <button className="inline-button" onClick={()=>patchStage({skills:[...stage.skills,{id:uid(),slot:"裝備部位",label:"技能組名稱",gems:[]}]})}>＋ 新增技能組</button>}
          </article>

          <article className="card gear-card"><div className="card-heading"><span className="icon">↗</span><div><small>UPGRADES</small><h2>裝備升級</h2></div></div>
            <div className="gear-table"><div className="gear-head"><span>部位</span><span>目前</span><span></span><span>下一步</span><span></span></div>{stage.gear.map((g,i)=><div className="gear-row" key={i}>{editing?<><input value={g.slot} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,slot:e.target.value}:x)})}/><input value={g.current} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,current:e.target.value}:x)})}/><span>→</span><input value={g.next} onChange={e=>patchStage({gear:stage.gear.map((x,n)=>n===i?{...x,next:e.target.value}:x)})}/><button className="danger-small" onClick={()=>patchStage({gear:stage.gear.filter((_,n)=>n!==i)})}>刪除</button></>:<><strong>{g.slot}</strong><span>{g.current}<small>{g.note}</small></span><b>→</b><span>{g.next}</span><span></span></>}</div>)}</div>
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
    </main>
  );
}

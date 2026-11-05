// v280 (demandé : « pour les tests, une page où je peux importer une checklist et ajouter ou modifier des lignes ; le rendre impossible
// sur les PJ ») : Tests › Checklists (administrateurs) — le modèle de la checklist de debug, section par section : renommer, ajouter,
// supprimer, déplacer ; contrôle, consigne, « Option » (S.O. possible). Import d'un Word au format du modèle ou d'un texte collé
// depuis Excel, avec aperçu ; « Remplacer » ou « Ajouter à la suite ». Rien n'est écrit avant « Enregistrer ».
// Données : planning/tests.debugModel.sections (lu par toutes les fiches de tests et par l'export PDF).
import React, { useEffect, useMemo, useState } from "react";
import { T, FZF as FZ } from "../theme";
import { DEBUG_DOC, debugSections } from "../debugChecklist";
import { parseDocxXml, parseChecklistText, docxDocumentXml } from "../checklistImport";

const nid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const btn = (primary, ghost) => ({ padding: "0 12px", minHeight: 32, borderRadius: 8, border: "1px solid " + (primary && !ghost ? T.ink900 : T.line), background: primary && !ghost ? T.ink900 : T.card, color: primary && !ghost ? T.card : T.ink700, fontSize: FZ.sm, fontWeight: 700, cursor: "pointer", fontFamily: T.font });
const field = { padding: "4px 8px", minHeight: 30, borderRadius: 6, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box", width: "100%" };
const mini = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, minWidth: 28, minHeight: 28, cursor: "pointer", fontFamily: T.font, fontSize: 13 };

function ImportDialog({ onApply, onClose }) {
  const [txt, setTxt] = useState(""), [res, setRes] = useState(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const pick = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; setErr(""); setBusy(true);
    try { const r = /\.docx$/i.test(f.name) ? parseDocxXml(await docxDocumentXml(await f.arrayBuffer())) : parseChecklistText(await f.text()); setRes(r); if (!r.length) setErr("Aucun contrôle reconnu dans ce fichier."); }
    catch (x) { setRes(null); setErr("Lecture impossible : " + x.message); }
    setBusy(false); };
  const fromText = () => { const r = parseChecklistText(txt); setRes(r); setErr(r.length ? "" : "Aucun contrôle reconnu : une ligne par contrôle « Section ; Contrôle ; Consigne ; Option »."); };
  const n = (res || []).reduce((a, s) => a + s.items.length, 0);
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label="Importer une checklist" style={{ width: "min(720px,100%)", maxHeight: "90vh", overflow: "auto", background: T.card, color: T.ink900, border: "1px solid " + T.line, borderRadius: 12, boxShadow: T.shadowLg, padding: "16px 18px", fontFamily: T.font, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Importer une checklist</div>
      <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.5 }}>Un document Word au format du modèle ({DEBUG_DOC.ref}) : chaque ligne de tableau dont les colonnes 2 et 3 sont « OK » et « NOK » ouvre une section ; les lignes suivantes sont les contrôles (1re colonne) et leur consigne (dernière colonne).<br />Ou un tableau Excel / CSV : <b>Section ; Contrôle ; Consigne ; Option</b> (une ligne par contrôle).</div>
      <input type="file" accept=".docx,.csv,.txt" onChange={pick} aria-label="Fichier de checklist" disabled={busy} />
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={5} placeholder={"Ou collez ici depuis Excel :\nSorties\tVentilateur circuit de cooling\tActiver le ventilateur…\t"} aria-label="Checklist collée" style={{ ...field, resize: "vertical", fontFamily: T.fontMono, fontSize: 12 }} />
      <div><button type="button" style={btn(false, true)} disabled={!txt.trim()} onClick={fromText}>Lire le texte collé</button></div>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZ.sm }}>{err}</div>}
      {res && res.length > 0 && <div style={{ border: "1px solid " + T.line, borderRadius: 8, padding: "8px 10px", maxHeight: 260, overflow: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: FZ.sm, marginBottom: 4 }}>{res.length} section{res.length > 1 ? "s" : ""} · {n} contrôle{n > 1 ? "s" : ""}</div>
        {res.map(s => <div key={s.id} style={{ fontSize: 12.5, marginBottom: 4 }}><b>{s.title}</b> <span style={{ color: T.ink500 }}>({s.items.length})</span> — <span style={{ color: T.ink700 }}>{s.items.slice(0, 4).map(i => i.label).join(", ")}{s.items.length > 4 ? "…" : ""}</span></div>)}
      </div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" style={btn(false, true)} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(true, true)} disabled={!n} onClick={() => onApply(res, "append")}>Ajouter à la suite</button>
        <button type="button" style={btn(true)} disabled={!n} onClick={() => onApply(res, "replace")}>Remplacer la liste</button>
      </div>
    </div>
  </div>);
}

export function ChecklistsView({ doc, commit }) {
  const saved = useMemo(() => debugSections(doc && doc.debugModel), [doc]);
  const [secs, setSecs] = useState(saved), [dirty, setDirty] = useState(false), [imp, setImp] = useState(false), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { if (!dirty) setSecs(saved); }, [saved, dirty]);
  const upd = fn => { setSecs(s => fn(s.map(x => ({ ...x, items: x.items.map(i => ({ ...i })) })))); setDirty(true); };
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const c = arr.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const save = async () => { setBusy(true); const ok = await commit({ debugModel: { sections: secs, at: new Date().toISOString() } }); setBusy(false); if (ok !== false) { setDirty(false); setMsg({ t: "Checklist enregistrée : elle s'applique à toutes les machines." }); } else setMsg({ t: "L'enregistrement a échoué.", bad: true }); };
  const reset = async () => { if (!window.confirm("Revenir au modèle Word d'origine (" + DEBUG_DOC.ref + ") ? Les lignes ajoutées ou modifiées seront perdues pour toutes les machines.")) return; setBusy(true); const ok = await commit({ debugModel: null }); setBusy(false); if (ok !== false) { setDirty(false); setMsg({ t: "Modèle d'origine rétabli." }); } };
  const total = secs.reduce((a, s) => a + s.items.length, 0);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <section style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 320px" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Checklist de debug · modèle</div>
        <div style={{ fontSize: 12.5, color: T.ink500 }}>{secs.length} sections · {total} contrôles · s'applique à toutes les machines (fiche de tests et export PDF). Elle ne se modifie qu'ici, pas depuis un PJ.</div>
      </div>
      <button type="button" style={btn(false, true)} onClick={() => setImp(true)}>Importer…</button>
      <button type="button" style={btn(false, true)} onClick={reset} disabled={busy}>Modèle d'origine</button>
      {dirty && <button type="button" style={btn(false, true)} onClick={() => { setSecs(saved); setDirty(false); }}>Annuler les modifications</button>}
      <button type="button" style={btn(true)} disabled={!dirty || busy} onClick={save}>{busy ? "Enregistrement…" : dirty ? "Enregistrer" : "Enregistré"}</button>
    </section>
    {msg && <div role="status" style={{ fontSize: FZ.sm, fontWeight: 600, color: msg.bad ? T.red600 : T.emerald600 }}>{msg.t}</div>}
    {secs.map((s, si) => <section key={s.id} aria-label={"Section " + s.title} style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: T.surfaceAlt }}>
        <input value={s.title} onChange={e => upd(a => { a[si].title = e.target.value; return a; })} aria-label="Titre de la section" style={{ ...field, fontWeight: 700, maxWidth: 420, background: T.card }} />
        <span style={{ fontSize: 12, color: T.ink500, marginRight: "auto" }}>{s.items.length} contrôle{s.items.length > 1 ? "s" : ""}</span>
        <button type="button" aria-label="Monter la section" style={mini} disabled={si === 0} onClick={() => upd(a => move(a, si, -1))}>↑</button>
        <button type="button" aria-label="Descendre la section" style={mini} disabled={si === secs.length - 1} onClick={() => upd(a => move(a, si, 1))}>↓</button>
        <button type="button" aria-label="Supprimer la section" style={{ ...mini, color: T.red600 }} onClick={() => { if (window.confirm("Supprimer la section « " + s.title + " » et ses " + s.items.length + " contrôles ?")) upd(a => a.filter((_, k) => k !== si)); }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1fr) minmax(220px,2fr) 82px 120px", gap: 0 }}>
        {["Contrôle", "Consigne", "Option", ""].map(h => <div key={h} style={{ fontSize: 12, color: T.ink500, padding: "6px 8px", borderBottom: "1px solid " + T.line }}>{h}</div>)}
        {s.items.map((it, ii) => <React.Fragment key={it.id}>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line }}><input value={it.label} onChange={e => upd(a => { a[si].items[ii].label = e.target.value; return a; })} aria-label="Contrôle" style={field} /></div>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line }}><textarea value={it.hint} rows={Math.min(4, Math.max(1, String(it.hint).split("\n").length))} onChange={e => upd(a => { a[si].items[ii].hint = e.target.value; return a; })} aria-label={"Consigne : " + it.label} style={{ ...field, resize: "vertical", lineHeight: 1.4 }} /></div>
          <label style={{ padding: "4px 8px", borderBottom: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.ink700 }}><input type="checkbox" checked={!!it.opt} onChange={e => upd(a => { a[si].items[ii].opt = e.target.checked; return a; })} />S.O.</label>
          <div style={{ padding: "4px 6px", borderBottom: "1px solid " + T.line, display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" aria-label={"Monter " + it.label} style={mini} disabled={ii === 0} onClick={() => upd(a => { a[si].items = move(a[si].items, ii, -1); return a; })}>↑</button>
            <button type="button" aria-label={"Descendre " + it.label} style={mini} disabled={ii === s.items.length - 1} onClick={() => upd(a => { a[si].items = move(a[si].items, ii, 1); return a; })}>↓</button>
            <button type="button" aria-label={"Supprimer " + it.label} style={{ ...mini, color: T.red600 }} onClick={() => upd(a => { a[si].items = a[si].items.filter((_, k) => k !== ii); return a; })}>×</button>
          </div>
        </React.Fragment>)}
      </div>
      <div style={{ padding: "6px 10px" }}><button type="button" onClick={() => upd(a => { a[si].items.push({ id: nid("x"), label: "Nouveau contrôle", hint: "", opt: false }); return a; })} style={{ border: "none", background: "transparent", color: T.ink700, fontWeight: 700, fontSize: FZ.sm, cursor: "pointer", fontFamily: T.font, minHeight: 28 }}>＋ Ajouter un contrôle</button></div>
    </section>)}
    <div><button type="button" style={btn(false, true)} onClick={() => upd(a => [...a, { id: nid("s"), title: "Nouvelle section", items: [] }])}>＋ Ajouter une section</button></div>
    {imp && <ImportDialog onClose={() => setImp(false)} onApply={(res, mode) => { upd(a => mode === "replace" ? res : [...a, ...res]); setImp(false); setMsg({ t: "Import prêt : vérifiez puis « Enregistrer »." }); }} />}
  </div>);
}

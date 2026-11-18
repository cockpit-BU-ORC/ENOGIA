// v404 : Réglages du passeport (propriétaire et admins de la page) — remplace « Standards par gamme » (jugé indigeste) :
// catalogue des composants en cartes (ajouter / retirer, choisi par le CdP · suivi par Achats · optionnel), références turbine par gamme,
// dimensions et poids par gamme, choix électriques proposés. La référence d'une gamme ne sert qu'à proposer une valeur et signaler un écart.
import React, { useEffect, useRef, useState } from "react";
import { T, btn } from "../theme";
import { Pill, NavIcon, notify } from "./SharedUI";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";
import { gammeKey } from "../passport";
import { componentsOf, elecListsOf, ELEC_LABEL } from "../launchFab";

const KIND = { choix: ["Choisi par le CdP", "un bouton par choix ; référence par gamme possible"], achat: ["Suivi par Achats", "commande et livraison lues dans Achats / Appro ; pas de référence"], option: ["Optionnel", "comme « choisi », avec « Non requis »"] };
const ro = () => notify("Lecture seule : les réglages du passeport se modifient par le propriétaire et les admins de la page", "info");

// pastilles + champ « Entrée pour ajouter »
function Tags({ list, onChange, label, canEdit }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (!v || list.includes(v)) { setT(""); return; } onChange([...list, v]); setT(""); };
  return <div className="pp2-tags" role="group" aria-label={label}>
    {list.map((o, i) => <span key={o}>{o}{canEdit && <button type="button" aria-label={"Retirer " + o} onClick={() => onChange(list.filter((_, j) => j !== i))}><NavIcon name="close" size={12} /></button>}</span>)}
    {canEdit && <input value={t} onChange={e => setT(e.target.value)} placeholder="Ajouter, Entrée" aria-label={label + " : ajouter"} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add} />}
  </div>;
}

// volet d'un composant (nouveau ou existant)
function CompSheet({ c, gammes, scopes, onSave, onRemove, onClose }) {
  const [d, setD] = useState(() => ({ kind: "choix", scope: "", ...c, opts: [...((c && c.opts) || [])], refs: { ...((c && c.refs) || {}) } }));
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const set = p => setD(x => ({ ...x, ...p }));
  return <div className="pp2-veil" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside role="dialog" aria-modal="true" aria-labelledby="pp2-cs-h" className="pp2-sheet">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h3 id="pp2-cs-h" style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink900 }}>{c && c.id ? c.label : "Nouveau composant"}</h3><span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} aria-label="Fermer" style={btn("ghost", "sm")}><NavIcon name="close" size={16} /></button></div>
      <label className="pp2-fl">Nom<input className="pp2-in" autoFocus={AF} value={d.label || ""} onChange={e => set({ label: e.target.value })} placeholder="ex. Silent blocs" /></label>
      <div className="pp2-fl">Comment la valeur est obtenue
        <div className="pp2-radios">{Object.entries(KIND).map(([k, [l, s]]) => <label key={k} data-on={d.kind === k ? "1" : undefined}><input type="radio" name="pp2-kind" checked={d.kind === k} onChange={() => set({ kind: k })} /><span><b>{l}</b><small>{s}</small></span></label>)}</div></div>
      {d.kind === "achat" ? <label className="pp2-fl">Scope Achats / Appro<input className="pp2-in" list="pp2-scopes" value={d.scope || ""} onChange={e => set({ scope: e.target.value })} placeholder="ex. CHASSIS" />
        <datalist id="pp2-scopes">{scopes.map(s => <option key={s} value={s} />)}</datalist><small className="pp2-sub">l'état des commandes de ce scope remonte dans la fiche de lancement de fab et le passeport</small></label>
        : <>
          <div className="pp2-fl">Choix proposés<Tags list={d.opts} onChange={opts => set({ opts })} label="Choix proposés" canEdit /></div>
          <div className="pp2-fl">Référence par gamme <small className="pp2-sub">facultatif · vide = pas d'avertissement</small>
            <div className="pp2-refs">{gammes.map(g => <label key={g}>{g}<input className="pp2-in" list="pp2-refopts" value={d.refs[g] || ""} placeholder="—" onChange={e => set({ refs: { ...d.refs, [g]: e.target.value } })} /></label>)}</div>
            <datalist id="pp2-refopts">{d.opts.map(o => <option key={o} value={o} />)}</datalist></div>
        </>}
      <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
        <button type="button" style={btn("pri", "md")} onClick={() => { if (!String(d.label || "").trim()) { notify("Donnez un nom au composant", "info"); return; }
          const refs = Object.fromEntries(Object.entries(d.refs).filter(([, v]) => String(v || "").trim()).map(([k, v]) => [k, String(v).trim()]));
          onSave({ ...d, label: String(d.label).trim(), refs: d.kind === "achat" ? {} : refs, opts: d.kind === "achat" ? [] : d.opts }); }}>{c && c.id ? "Enregistrer" : "Ajouter au catalogue"}</button>
        {c && c.id && <button type="button" style={{ ...btn("sec", "md"), color: T.red600 }} onClick={onRemove}>Retirer du catalogue</button>}
      </div>
    </aside>
  </div>;
}

function Num({ value, onSave, label, canEdit, w }) {
  const [v, setV] = useState(value || ""), last = useRef(value || "");
  if (last.current !== (value || "")) { last.current = value || ""; if (v !== last.current) setV(last.current); }
  return <input className="pp2-in" value={v} readOnly={!canEdit} onFocus={() => { if (!canEdit) ro(); }} aria-label={label} placeholder="—" style={{ width: w || 110 }}
    onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value || "")) onSave(v.trim()); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}

export function PassportSettings({ data, doc, api, canEdit, achatsDoc, importer }) {
  const S = doc.standards || {}, comps = componentsOf(doc), lists = elecListsOf(doc), dims = doc.dims || {};
  const gammes = [...new Set([...Object.keys(S), ...Object.keys(dims), ...(data || []).map(r => r.gamme).filter(Boolean).map(g => gammeKey(doc, g))])].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const scopes = [...new Set([...((achatsDoc && achatsDoc.params && Array.isArray(achatsDoc.params.scopes)) ? achatsDoc.params.scopes.map(s => (s && (s.nom || s.id || s)) || "") : []),
    ...Object.values((achatsDoc && achatsDoc.lignes) || {}).map(l => String((l && l.famille) || "").trim().toUpperCase())].filter(x => x && typeof x === "string"))].sort();
  const [sheet, setSheet] = useState(null), [fresh, setFresh] = useState("");
  const saveComps = async (list, msg, undo) => { const ok = await api.saveComponents(list); if (ok === false) return; if (msg) notify(msg, "ok"); if (undo) undo(); };
  const onSave = async d => {
    if (d.id) await saveComps(comps.map(c => (c.id === d.id ? d : c)), "« " + d.label + " » enregistré");
    else { const id = "c" + Date.now().toString(36); await saveComps([...comps, { ...d, id }], "« " + d.label + " » ajouté au catalogue"); setFresh(id); }
    setSheet(null);
  };
  const onRemove = async () => { const c = sheet; if (!(await askConfirm({ title: "Retirer « " + c.label + " » ?", message: "Il n'apparaîtra plus dans les nouvelles fiches de lancement de fab. Les passeports déjà remplis gardent leur valeur ; vous pourrez le rétablir.", confirmLabel: "Retirer", danger: true }))) return;
    await saveComps(comps.map(x => (x.id === c.id ? { ...x, off: true } : x)), "« " + c.label + " » retiré"); setSheet(null); };
  const restore = c => saveComps(comps.map(x => (x.id === c.id ? { ...x, off: false } : x)), "« " + c.label + " » rétabli");
  const setStd = async (g, k, v) => { const nx = { ...S, [g]: { ...(S[g] || {}) } }; if (v) nx[g][k] = v; else delete nx[g][k]; await api.saveStandards(nx); };
  const setDim = async (g, k, v) => { const nx = { ...dims, [g]: { ...(dims[g] || {}) } }; if (v) nx[g][k] = v; else delete nx[g][k]; await api.saveDims(nx); };
  const live = comps.filter(c => !c.off), off = comps.filter(c => c.off);
  return <div className="pp2" style={{ "--pp-ink": T.ink900, "--pp-ink7": T.ink700, "--pp-ink5": T.ink500, "--pp-line": T.line, "--pp-card": T.card, "--pp-alt": T.surfaceAlt, "--pp-surf": T.surface, "--pp-field": T.fieldLine, "--pp-acc": T.accentInk, "--pp-ok": T.emerald600, "--pp-okbg": T.emerald100, "--pp-bad": T.red600, "--pp-warn": T.amber600, "--pp-on": T.onFill, display: "flex", flexDirection: "column", gap: 16 }}>
    {!canEdit && <Pill tone="neutral">Lecture seule</Pill>}
    <section className="pp2-box" aria-labelledby="pp2-s-comp">
      <div className="pp2-sh"><h3 id="pp2-s-comp">Composants installés</h3><span className="pp2-sub">{live.length} composants · proposés dans chaque fiche de lancement de fab</span></div>
      <div className="pp2-catg">{live.map(c => <button key={c.id} type="button" className={"pp2-catc" + (fresh === c.id ? " enogia-cl-in" : "")} onClick={() => (canEdit ? setSheet(c) : ro())}>
          <b>{c.label}</b><Pill tone={c.kind === "achat" ? "info" : "neutral"}>{KIND[c.kind] ? KIND[c.kind][0] : c.kind}{c.kind === "achat" && c.scope ? " · " + c.scope : ""}</Pill>
          <span className="pp2-sub">{c.kind === "achat" ? (c.scope ? "valeur = commande Achats" : "scope à préciser") : (c.opts || []).join(" · ") || "choix libre"}</span>
          {c.kind !== "achat" && Object.keys(c.refs || {}).length > 0 && <span className="pp2-sub">réf. {Object.entries(c.refs).map(([g, v]) => g + " " + v).join(" · ")}</span>}
        </button>)}
        {canEdit && <button type="button" className="pp2-catc" data-add="1" onClick={() => setSheet({ kind: "option" })}>＋ Composant</button>}
      </div>
      {off.length > 0 && <div className="pp2-sub" style={{ marginTop: 8 }}>Retirés : {off.map((c, i) => <span key={c.id}>{i ? ", " : ""}{c.label}{canEdit && <> (<button type="button" className="pp2-link" onClick={() => restore(c)}>rétablir</button>)</>}</span>)}</div>}
    </section>
    <section className="pp2-box" aria-labelledby="pp2-s-tur">
      <div className="pp2-sh"><h3 id="pp2-s-tur">Turbine : référence par gamme</h3><span className="pp2-sub">proposée dans la fiche ; un écart n'est qu'un avertissement</span></div>
      <div style={{ overflowX: "auto" }}><table className="pp2-tab"><thead><tr><th>Gamme</th><th>Roue</th><th>Injecteur</th><th>Bouchages</th></tr></thead>
        <tbody>{gammes.map(g => <tr key={g}><th scope="row">{g}</th>{["roue", "injecteur", "bouchages"].map(k => <td key={k}><Num value={(S[g] || {})[k]} label={k + " " + g} canEdit={canEdit} onSave={v => setStd(g, k, v)} /></td>)}</tr>)}</tbody></table></div>
    </section>
    <section className="pp2-box" aria-labelledby="pp2-s-dim">
      <div className="pp2-sh"><h3 id="pp2-s-dim">Dimensions et poids par gamme</h3><span className="pp2-sub">repris tout seuls dans la fiche de lancement de fab et le passeport</span></div>
      <div style={{ overflowX: "auto" }}><table className="pp2-tab"><thead><tr><th>Gamme</th><th>Longueur</th><th>Largeur</th><th>Hauteur</th><th>Poids</th></tr></thead>
        <tbody>{gammes.map(g => <tr key={g}><th scope="row">{g}</th>{[["L", "2,1 m"], ["l", "1,7 m"], ["H", "2,0 m"], ["P", "3 200 kg"]].map(([k]) => <td key={k}><Num value={(dims[g] || {})[k]} label={k + " " + g} canEdit={canEdit} onSave={v => setDim(g, k, v)} /></td>)}</tr>)}</tbody></table></div>
    </section>
    <section className="pp2-box" aria-labelledby="pp2-s-elec">
      <div className="pp2-sh"><h3 id="pp2-s-elec">Choix électriques proposés</h3></div>
      {["neutre", "freq", "tension"].map(k => <div key={k} className="pp2-lrow" style={{ gridTemplateColumns: "180px minmax(0,1fr)" }}><span className="pp2-lab">{ELEC_LABEL[k]}</span>
        <Tags list={lists[k]} label={ELEC_LABEL[k]} canEdit={canEdit} onChange={L => api.saveElecLists({ ...lists, [k]: L })} /></div>)}
    </section>
    {canEdit && importer && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{importer}<span className="pp2-sub">reprend les références d'un tableau de configuration (rien n'est écrasé)</span></div>}
    {sheet && <CompSheet c={sheet} gammes={gammes} scopes={scopes} onSave={onSave} onRemove={onRemove} onClose={() => setSheet(null)} />}
  </div>;
}

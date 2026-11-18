// v394 (maquette v393-rai-photos.html : « Oui, le RAI ») : Rapport d'acceptation interne d'une machine, dans son passeport.
// Sections du modèle Excel à gauche (avancement), la section ouverte à droite, verdict calculé en tête, PDF imprimable.
// Tout compte ENOGIA qui ouvre la page remplit et signe (règle Firestore : champ « rai » seulement) ; le S/N d'un composant relié
// au passeport y est écrit par un admin (phase fabrication, source « RAI »), sinon gardé dans le RAI.
import React, { useState } from "react";
import { T, FZ, btn } from "../theme";
import { Pill, tableTh, tableTd } from "./SharedUI";
import { askConfirm } from "../confirm";
import { RAI_SECTIONS, RAI_SIGNERS, RAI_POLES, raiSection, raiVerdict, compSn, setRow, addAction, setAction, delAction, sign, raiHtml } from "../rai";
import { setReal } from "../passport";

const field = () => ({ padding: "4px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.fieldLine, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box" });
const today = () => new Date().toISOString().slice(0, 10);
const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(2, 4) : "");
const OKS = [["OK", "OK"], ["NOK", "NOK"], ["SO", "S.O."]];

function Blur({ value, onSave, label, w, placeholder }) {
  const [v, setV] = useState(value || ""), [last, setLast] = useState(value || "");
  if ((value || "") !== last) { setLast(value || ""); setV(value || ""); }
  return <input value={v} placeholder={placeholder} aria-label={label} onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() !== (value || "").trim()) onSave(v.trim()); }}
    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") { setV(value || ""); e.currentTarget.blur(); } }} style={{ ...field(), width: w || "100%" }} />;
}

export function RaiView({ r, meta, doc, P, R, saveRai, savePass, canEdit, who, photos }) {
  const [sec, setSec] = useState("info"), [msg, setMsg] = useState("");
  const v = raiVerdict(R), info = { ref: (R && R.ref) || r.pj + "-741-RA001-A", date: (R && R.created) || "", pj: r.pj, client: meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "", gamme: r.gamme || "",
    config: (R && R.config) || "", sn: meta.numSerie || "", software: (((P || {}).real || {}).software || {}).v || "", chef: meta.chefProjet || "" };
  const put = next => saveRai({ ...next, created: (R && R.created) || today() });
  const tone = v.k === "ok" ? "ok" : v.k === "reserve" ? "warn" : "bad";
  const pdf = () => { const w = window.open("", "_blank"); if (!w) { setMsg("Le navigateur a bloqué la fenêtre : autorisez les fenêtres pour ce site."); return; } w.document.open(); w.document.write(raiHtml({ R: R || {}, pass: P || {}, info, photos: photos || [] })); w.document.close(); };
  const NAV = [["info", "Informations", null], ...RAI_SECTIONS.map(s => [s.id, s.title, raiSection(R, s)]), ["actions", "Plan d'actions", null], ["valid", "Validation", null]];
  const navNote = id => { if (id === "info") return "auto"; if (id === "actions") return v.blocking ? v.blocking + " bloquante" + (v.blocking > 1 ? "s" : "") : ((R && R.actions) || []).length + " action" + (((R && R.actions) || []).length > 1 ? "s" : ""); if (id === "valid") return v.signed + " / " + v.signers; const s = raiSection(R, RAI_SECTIONS.find(x => x.id === id)); return s.nok ? s.nok + " NOK" : s.done + " / " + s.total; };
  const navBad = id => (id === "actions" ? v.blocking > 0 : id === "valid" ? false : id !== "info" && raiSection(R, RAI_SECTIONS.find(x => x.id === id)).nok > 0);
  const navDone = id => (id === "info" ? true : id === "actions" ? !v.openActs : id === "valid" ? v.signed === v.signers : (s => s.total && s.done === s.total && !s.nok)(raiSection(R, RAI_SECTIONS.find(x => x.id === id))));
  return <div className="enogia-rai" style={{ display: "grid", gridTemplateColumns: "minmax(190px, 210px) minmax(0, 1fr)", gap: 14 }}>
    <nav aria-label="Sections du RAI" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV.map(([id, l], i) => { const on = sec === id, done = navDone(id), bad = navBad(id);
        return <button key={id} type="button" onClick={() => setSec(id)} aria-current={on ? "step" : undefined} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "grid", gridTemplateColumns: "22px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 8, minHeight: 40, background: on ? T.surfaceAlt : "transparent", fontSize: 13, fontWeight: on ? 600 : 500, color: T.ink900 }}>
          <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600, border: "1.5px solid " + (bad ? T.red600 : done ? T.emerald600 : T.line), background: done && !bad ? T.emerald600 : "transparent", color: bad ? T.red600 : done ? T.onFill : T.ink500 }}>{bad ? "!" : done ? "✓" : i + 1}</span>
          <span>{l}</span><span style={{ fontSize: 12, color: bad ? T.red600 : T.ink500, fontWeight: 500 }}>{navNote(id)}</span></button>; })}
      <button type="button" onClick={pdf} style={{ ...btn("sec", "sm"), marginTop: 10 }}>Exporter le RAI (PDF)</button>
      {msg && <span role="status" style={{ fontSize: 12, color: T.red600 }}>{msg}</span>}
    </nav>
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid " + T.line, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
        <Pill tone={tone}>{v.label}</Pill>
        <span style={{ fontSize: 13, color: T.ink700 }}>{v.blocking ? v.blocking + " action" + (v.blocking > 1 ? "s" : "") + " bloquante" + (v.blocking > 1 ? "s" : "") + " ouverte" + (v.blocking > 1 ? "s" : "") + " · " : ""}{v.signed} / {v.signers} signatures{v.nok ? " · " + v.nok + " NOK" : ""}{v.todo ? " · " + v.todo + " contrôle" + (v.todo > 1 ? "s" : "") + " à faire" : ""}</span>
        <span style={{ flex: 1 }} /><span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.ink500 }}>{info.ref}</span>
      </div>
      {sec === "info" ? <InfoSec info={info} R={R} put={put} />
        : sec === "actions" ? <ActionsSec R={R} put={put} who={who} />
        : sec === "valid" ? <SignSec R={R} put={put} who={who} canEdit={canEdit} />
        : <ItemsSec s={RAI_SECTIONS.find(x => x.id === sec)} R={R} P={P} put={put} who={who} canEdit={canEdit}
            writeSn={(x, val) => (x.el && canEdit ? savePass(setReal(doc, r.pj, x.el, val, "fab", "RAI", who)) : put(setRow(R, x.id, { sn: val }, who)))} />}
    </div>
  </div>;
}

function InfoSec({ info, R, put }) {
  const L = [["Date du RAI", info.date ? fd(info.date) : "à la première saisie"], ["Projet", info.pj], ["Client", info.client || "—"], ["Gamme ORC", info.gamme || "—"], ["N° de série", info.sn || "pas encore attribué"], ["Version software", info.software || "à renseigner dans le passeport (tests)"], ["Responsable projet", info.chef || "—"]];
  return <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: "8px 14px", alignItems: "center", fontSize: 13, maxWidth: 760 }}>
    {L.map(([k, val]) => <React.Fragment key={k}><span style={{ color: T.ink500 }}>{k}</span><span style={{ color: T.ink900 }}>{val}</span></React.Fragment>)}
    <span style={{ color: T.ink500 }}>Configuration du produit</span><Blur value={R && R.config} onSave={val => put({ ...(R || {}), config: val })} label="Configuration du produit" placeholder="ex. LT-20-3-I-S-C-E-O-X" w={260} />
    <span style={{ color: T.ink500 }}>Référence du document</span><Blur value={info.ref} onSave={val => put({ ...(R || {}), ref: val })} label="Référence du document" w={260} />
    <span />
    <span style={{ fontSize: 12, color: T.ink500 }}>Repris du planning et du passeport : rien à ressaisir.</span>
  </div>;
}

function ItemsSec({ s, R, P, put, who, writeSn }) {
  const rows = (R && R.rows) || {};
  const mid = s.kind === "sn" ? "N° de série et référence" : s.kind === "doc" ? "Emplacement réseau" : "Commentaire";
  return <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
    <thead><tr><th style={tableTh()}>{s.kind === "sn" ? "Composant" : s.kind === "visu" ? "Désignation · point de vérification" : "Catégorie · nom"}</th><th style={tableTh()}>{mid}</th><th style={tableTh()}>Service</th><th style={tableTh()}>Vérificateur</th><th style={tableTh()}>Validation</th></tr></thead>
    <tbody>{s.groups.map(([g, L]) => <React.Fragment key={g || "x"}>
      {g && <tr><td colSpan={5} style={{ ...tableTd({ h: 30 }), background: T.surfaceAlt, fontSize: 12, fontWeight: 600, color: T.ink700 }}>{g}</td></tr>}
      {L.map(x => { const row = rows[x.id] || {}, sn = s.kind === "sn" ? compSn(R, P, x) : null;
        return <tr key={x.id}>
          <td style={{ ...tableTd(), color: T.ink900 }}>{x.label}{x.hint && <div style={{ fontSize: 11, color: T.ink500 }}>{x.hint}</div>}</td>
          <td style={tableTd()}>{s.kind === "sn" ? <div><Blur value={sn.v} onSave={val => writeSn(x, val)} label={"N° de série : " + x.label} w={180} />{sn.from === "passport" && <div style={{ fontSize: 11, color: T.ink500 }}>passeport{sn.src ? " · " + sn.src : ""}</div>}</div>
            : <Blur value={s.kind === "doc" ? row.loc : row.c} onSave={val => put(setRow(R, x.id, s.kind === "doc" ? { loc: val } : { c: val }, who))} label={mid + " : " + x.label} w={s.kind === "doc" ? 200 : 170} />}</td>
          <td style={{ ...tableTd(), whiteSpace: "nowrap" }}>{x.svc}</td><td style={{ ...tableTd(), whiteSpace: "nowrap" }}>{x.verif}</td>
          <td style={{ ...tableTd(), whiteSpace: "nowrap" }}><span role="radiogroup" aria-label={"Validation : " + x.label} style={{ display: "inline-flex", gap: 4 }}>
            {OKS.map(([k, l]) => { const on = row.ok === k, c = k === "OK" ? T.emerald600 : k === "NOK" ? T.red600 : T.ink500;
              return <button key={k} type="button" role="radio" aria-checked={on} onClick={() => put(setRow(R, x.id, { ok: on ? "" : k }, who))} style={{ minHeight: 30, padding: "0 8px", borderRadius: 8, border: "1.5px solid " + (on ? c : T.line), background: on ? c : "transparent", color: on ? T.onFill : T.ink700, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>{l}</button>; })}
            {row.ok === "NOK" && <button type="button" onClick={() => put(addAction(R, x.label + (row.c ? " : " + row.c : ""), false, "PROD", who))} title="Créer une action au plan d'actions" style={{ ...btn("ghost", "sm"), minHeight: 30 }}>＋ action</button>}
          </span></td>
        </tr>; })}
    </React.Fragment>)}</tbody></table></div>;
}

function ActionsSec({ R, put, who }) {
  const L = (R && R.actions) || [], [t, setT] = useState(""), [bloq, setBloq] = useState(false), [pole, setPole] = useState("PROD");
  const add = () => { if (!t.trim()) return; put(addAction(R, t, bloq, pole, who)); setT(""); setBloq(false); };
  return <div>
    <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
      <thead><tr><th style={tableTh()}>N°</th><th style={tableTh()}>Action</th><th style={tableTh()}>Bloquant</th><th style={tableTh()}>Pôle</th><th style={tableTh()}>Créée</th><th style={tableTh()}>Validée</th><th style={tableTh()}>NC ClickUp</th><th style={tableTh()} /></tr></thead>
      <tbody>{L.length === 0 && <tr><td colSpan={8} style={{ ...tableTd(), color: T.ink500 }}>Aucune action : un NOK peut en créer une (« ＋ action »)</td></tr>}
        {L.map((a, i) => <tr key={a.id}>
          <td style={tableTd({ num: true })}>{i + 1}</td>
          <td style={tableTd()}><Blur value={a.t} onSave={val => put(setAction(R, a.id, { t: val }))} label={"Action " + (i + 1)} /></td>
          <td style={tableTd()}><label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!a.bloq} onChange={e => put(setAction(R, a.id, { bloq: e.target.checked }))} />{a.bloq ? <Pill tone="bad">Bloquant</Pill> : <span style={{ fontSize: 12, color: T.ink500 }}>Non</span>}</label></td>
          <td style={tableTd()}><select value={a.pole || ""} onChange={e => put(setAction(R, a.id, { pole: e.target.value }))} aria-label={"Pôle de l'action " + (i + 1)} style={field()}>{RAI_POLES.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
          <td style={tableTd()}>{fd(a.at)}</td>
          <td style={tableTd()}>{a.done ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Pill tone="ok">✓ {fd(a.done)}</Pill><button type="button" onClick={() => put(setAction(R, a.id, { done: "" }))} style={{ ...btn("ghost", "sm"), minHeight: 26 }}>Rouvrir</button></span>
            : <button type="button" onClick={() => put(setAction(R, a.id, { done: today() }))} style={btn("sec", "sm")}>Valider</button>}</td>
          <td style={tableTd()}><Blur value={a.nc} onSave={val => put(setAction(R, a.id, { nc: val }))} label={"NC ClickUp de l'action " + (i + 1)} placeholder="n° ou lien" w={140} /></td>
          <td style={tableTd()}><button type="button" aria-label={"Supprimer l'action " + (i + 1)} onClick={async () => { if (await askConfirm({ title: "Supprimer l'action " + (i + 1) + " ?", message: a.t, confirmLabel: "Supprimer", danger: true })) put(delAction(R, a.id)); }} style={{ ...btn("ghost", "sm"), minHeight: 26 }}>Supprimer</button></td>
        </tr>)}</tbody></table></div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
      <input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder="Nouvelle action" aria-label="Nouvelle action" style={{ ...field(), flex: "1 1 280px" }} />
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={bloq} onChange={e => setBloq(e.target.checked)} />Bloquante</label>
      <select value={pole} onChange={e => setPole(e.target.value)} aria-label="Pôle responsable" style={field()}>{RAI_POLES.map(p => <option key={p} value={p}>{p}</option>)}</select>
      <button type="button" onClick={add} disabled={!t.trim()} style={btn("sec", "sm")}>＋ Ajouter</button>
    </div>
  </div>;
}

function SignSec({ R, put, who, canEdit }) {
  const S = (R && R.signs) || {};
  return <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
    <thead><tr><th style={tableTh()}>Service</th><th style={tableTh()}>Fonction</th><th style={tableTh()}>Signé</th><th style={tableTh()}>Remarques</th><th style={tableTh()} /></tr></thead>
    <tbody>{RAI_SIGNERS.map(([s, f]) => { const g = S[s];
      return <tr key={s}><td style={{ ...tableTd(), fontWeight: 600, color: T.ink900 }}>{s}</td><td style={tableTd()}>{f}</td>
        <td style={tableTd()}>{g ? <Pill tone="ok">✓ {g.by} · {fd(g.at)}</Pill> : <Pill tone="neutral">à signer</Pill>}</td>
        <td style={tableTd()}><Blur value={g ? g.rem : ""} onSave={val => g && put(sign(R, s, g.by, val, true, g.at))} label={"Remarque " + s} placeholder={g ? "" : "après signature"} /></td>
        <td style={{ ...tableTd(), whiteSpace: "nowrap" }}>{!g ? <button type="button" onClick={async () => { if (await askConfirm({ title: "Signer pour " + s + " ?", message: "Vous signez le RAI en tant que " + (who || "vous") + " (" + f + "). La signature porte votre nom et la date.", confirmLabel: "Signer" })) put(sign(R, s, who, "")); }} style={btn("sec", "sm")}>Signer</button>
          : (g.by === who || canEdit) && <button type="button" onClick={async () => { if (await askConfirm({ title: "Retirer la signature " + s + " ?", message: "Signée par " + g.by + " le " + fd(g.at) + ".", confirmLabel: "Retirer", danger: true })) put(sign(R, s, "", "", false)); }} style={{ ...btn("ghost", "sm"), minHeight: 28 }}>Retirer</button>}</td></tr>; })}</tbody></table>
    <p style={{ fontSize: 12, color: T.ink500 }}>Chaque service signe depuis son compte : la signature porte le nom du compte et la date.</p></div>;
}

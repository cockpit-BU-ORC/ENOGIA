// V146.2 — Liaisons Cash in ↔ ordo choisies à la main, avec répartition d'un PJ du Cash in sur plusieurs PJ de l'ordo (÷ N).
// Ouverte depuis l'onglet Cash in (toutes les liaisons) ou depuis une fiche projet (focusPj : lier / délier ce PJ en un clic).
// Écrit dans planning/cashinLinks (beta_cashinLinks en bêta) : { links: { "PJ405-Y34": ["PJ405", "PJ406"], "row:<id jalon>": ["PJ406"] } }.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { setDoc } from "firebase/firestore";
import { T, FZF as FZ, statusSoft } from "../theme";
import { CASHIN_LINKS_REF } from "../cashinData";
import { allCashGroups, getCashinDoc, getCashinLinks, getOrdoPjs, getOrdoName, setCashinLinks, targetsOf, toggleLink, normPj, rowKey, rowTargetsOf } from "../cashinLink";
import { fmtEur } from "../pjProgress";
import { useCashin } from "../useCashin";

const btn = (primary, on = true) => ({ padding: "5px 11px", borderRadius: 8, border: "1px solid " + (primary ? T.teal600 : T.line), background: primary ? T.teal600 : T.card, color: primary ? "#fff" : T.ink900, fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: on ? "pointer" : "default", opacity: on ? 1 : .5, whiteSpace: "nowrap" });
const field = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, minWidth: 0 };
const same = (a, b) => normPj(a) === normPj(b);

// Résumé d'une liaison : ce que l'utilisateur voit dans la liste.
export function linkSummary(g, links, ordo) {
  const r0 = linkSummary0(g, links, ordo), nr = g.rows.filter(r => rowTargetsOf(r, links)).length;
  // v265 : avec des jalons communs, le montant « par machine » du résumé serait faux : on dit combien sont répartis et combien communs
  if (!nr) return r0;
  const t = targetsOf(g.pj, links, ordo), nd = g.rows.length - nr;
  return { ...r0, text: (t.list.length > 1 ? "Contrat sur " + t.list.length + " machines : " + t.list.join(", ") + " — " : r0.text + " · ") + nd + " jalon" + (nd > 1 ? "s" : "") + " réparti" + (nd > 1 ? "s" : "") + " (÷ " + Math.max(1, t.list.length) + "), " + nr + " sur des machines cochées" };
}
function linkSummary0(g, links, ordo) {
  const t = targetsOf(g.pj, links, ordo), n = t.list.length, SS = statusSoft();
  if (t.explicit && n === 0) return { tone: SS.future, text: "Aucun PJ de l'ordo (ignoré)", n };
  if (n === 0) return { tone: SS.warn, text: "Aucun PJ de l'ordo ne correspond : à lier à la main", n };
  if (!t.explicit && n > 1) return { tone: SS.warn, text: "Automatique : " + t.list.join(", ") + " — chacun reçoit la totalité, répartissez-les", n };
  if (n > 1) return { tone: SS.invoiced, text: "Contrat sur " + n + " machines : " + t.list.join(", ") + " — jalons répartis, " + fmtEur(g.total / n) + " par machine", n };
  return { tone: t.explicit ? SS.invoiced : SS.future, text: (t.explicit ? "Lié à " : "Automatique : ") + t.list[0], n };
}

function Editor({ g, links, ordo, onSave, onCancel, onAuto, busy }) {
  const explicit = targetsOf(g.pj, links, ordo).explicit;
  const [draft, setDraft] = useState(() => targetsOf(g.pj, links, ordo).list);
  const [q, setQ] = useState("");
  const all = useMemo(() => [...ordo, ...draft.filter(d => !ordo.some(o => same(o, d)))], [ordo, draft]);
  const shown = all.filter(p => !q.trim() || (p + " " + getOrdoName(p)).toLowerCase().includes(q.trim().toLowerCase()));
  const has = p => draft.some(d => same(d, p));
  const flip = p => setDraft(has(p) ? draft.filter(d => !same(d, p)) : [...draft, p]);
  const n = draft.length;
  return (<div style={{ marginTop: 8, padding: 10, borderRadius: 10, background: T.surface, border: "1px solid " + T.line }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ ou un projet de l'ordo" aria-label="Chercher un PJ de l'ordo" style={{ ...field, flex: "1 1 220px" }}/>
      <span style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900 }}>{n === 0 ? "Aucun PJ coché" : n === 1 ? "1 machine : elle reçoit tous les jalons (" + fmtEur(g.total) + ")" : n + " machines : chaque jalon est divisé par " + n + ", sauf ceux que vous mettez sur des « machines cochées » ci-dessous"}</span>
    </div>
    <div style={{ maxHeight: 190, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: "2px 12px" }}>
      {shown.map(p => (<label key={p} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 4px", fontSize: FZ.sm, color: T.ink900, cursor: "pointer", minWidth: 0 }}>
        <input type="checkbox" checked={has(p)} onChange={() => flip(p)} style={{ accentColor: T.teal600 }}/>
        <b style={{ whiteSpace: "nowrap" }}>{p}</b><span style={{ color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ordo.some(o => same(o, p)) ? getOrdoName(p) : "absent de l'ordo"}</span>
      </label>))}
      {!shown.length && <span style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun PJ ne correspond.</span>}
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <button style={btn(true, !busy)} disabled={busy} onClick={() => onSave(draft)}>Enregistrer</button>
      <button style={btn(false)} onClick={onCancel}>Annuler</button>
      {explicit && <button style={btn(false, !busy)} disabled={busy} onClick={onAuto} title="Revient au rapprochement par le numéro de PJ">Remettre en automatique</button>}
    </div>
  </div>);
}

// v146.15 — Jalon par jalon : deux modes. « Réparti » (par défaut) : le jalon suit la liaison du PJ du Cash in, montant ÷ nombre de PJ liés.
// « Commun » : on coche les machines concernées et chacune voit le montant COMPLET (jamais divisé) — à ne pas additionner d'une machine à l'autre.
function RowsEditor({ g, links, ordo, onSave, busy }) {
  const targets = targetsOf(g.pj, links, ordo).list;
  const [draft, setDraft] = useState(() => { const m = {}; g.rows.forEach(r => { m[r.id] = rowTargetsOf(r, links); }); return m; });
  const flip = (r, p) => setDraft(d => {
    const cur = d[r.id] || targets, has = cur.some(x => same(x, p));
    return { ...d, [r.id]: has ? cur.filter(x => !same(x, p)) : [...cur, p] };
  });
  const setMode = (r, shared) => setDraft(d => ({ ...d, [r.id]: shared ? targets.slice() : null }));
  const save = () => { const n = { ...links }; g.rows.forEach(r => { const v = draft[r.id]; if (v) n[rowKey(r.id)] = v; else delete n[rowKey(r.id)]; }); onSave(n); };
  if (targets.length < 2) return null;
  const seg = on => ({ padding: "2px 10px", border: "1px solid " + (on ? T.teal600 : T.line), background: on ? T.teal600 : "transparent", color: on ? "#fff" : T.ink500, fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: "pointer" });
  return (<div style={{ marginTop: 8, padding: 10, borderRadius: 10, background: T.surface, border: "1px solid " + T.line }}>
    <div style={{ fontSize: FZ.sm, fontWeight: 700, color: T.ink900, marginBottom: 2 }}>Jalon par jalon : réparti, ou sur des machines cochées ?</div>
    <div style={{ fontSize: FZ.xs, color: T.ink700, marginBottom: 8, lineHeight: 1.5 }}><b>Réparti</b> : le jalon concerne toutes les machines de la même façon, le montant est divisé entre elles. <b>Machines cochées</b> : le montant reste entier — cochez <b>une</b> machine pour un jalon qui lui est propre (FAT, livraison de l'ORC n°1…), ou <b>plusieurs</b> pour un paiement unique du contrat (acompte, avance), qui n'est alors compté qu'une fois : ne l'additionnez pas d'une machine à l'autre.</div>
    {g.rows.map(r => { const v = draft[r.id], shared = !!v, cur = v || targets; return (<div key={r.id} style={{ padding: "5px 0", borderTop: "1px solid " + T.line }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <b style={{ fontSize: FZ.sm }}>{r.jalon || "Jalon sans nom"}</b>
        <span style={{ fontSize: FZ.xs, color: T.ink500 }}>{shared ? fmtEur(r.montant || 0) + (cur.length > 1 ? " en entier, un seul paiement montré sur les " + cur.length + " machines cochées" : cur.length === 1 ? " en entier → " + cur[0] + " seulement" : " · aucune machine cochée") : fmtEur(r.montant || 0) + " ÷ " + cur.length + " = " + fmtEur((r.montant || 0) / cur.length) + " par machine"}</span>
        {!shared && /acompte|avance|advance|down ?payment|commande|order/i.test(r.jalon || "") && <span title="Un acompte ou une avance est en général un paiement unique pour tout le contrat : « Machines cochées », toutes cochées" style={{ fontSize: 11, fontWeight: 700, color: T.amber600, background: T.amber100, borderRadius: 999, padding: "1px 8px" }}>acompte : en général non divisé</span>}
        <span style={{ marginLeft: "auto", display: "inline-flex" }}>
          <button onClick={() => setMode(r, false)} aria-pressed={!shared} title="Payé une fois par machine : montant divisé" style={{ ...seg(!shared), borderRadius: "99px 0 0 99px" }}>Réparti ÷ {targets.length}</button>
          <button onClick={() => setMode(r, true)} aria-pressed={shared} title="Montant entier sur les machines cochées : une machine (jalon propre) ou plusieurs (paiement unique du contrat)" style={{ ...seg(shared), borderRadius: "0 99px 99px 0", borderLeft: 0 }}>Machines cochées</button>
        </span>
      </div>
      {shared && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
        {targets.map(p => { const on = cur.some(x => same(x, p)); return (<button key={p} onClick={() => flip(r, p)} aria-pressed={on} title={getOrdoName(p)} style={{ padding: "2px 9px", borderRadius: 99, border: "1px solid " + (on ? T.teal600 : T.line), background: on ? T.teal100 : "transparent", color: on ? T.teal600 : T.ink500, fontSize: FZ.xs, fontWeight: 700, fontFamily: T.font, cursor: "pointer" }}>{p}</button>); })}
      </div>}
    </div>); })}
    <div style={{ marginTop: 8 }}><button style={btn(true, !busy)} disabled={busy} onClick={save}>Enregistrer les jalons</button></div>
  </div>);
}

export function CashLinksDialog({ onClose, authorName, focusPj }) {
  useCashin();
  const doc = getCashinDoc(), links = getCashinLinks(), ordo = getOrdoPjs();
  const groups = allCashGroups(doc);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const write = async next => {
    setBusy(true); setErr(null);
    try {
      await setDoc(CASHIN_LINKS_REF(), { links: next, updatedBy: authorName || "", updatedAt: new Date().toISOString() });
      setCashinLinks(next); setOpen(null);
    } catch (e) {
      setErr(e && e.code === "permission-denied" ? "Écriture refusée par les règles Firestore : ajoutez le document « cashinLinks » (voir DEPLOIEMENT.md, v146.2)." : "Enregistrement impossible : " + (e && e.message));
    } finally { setBusy(false); }
  };
  const linkedToFocus = g => !!focusPj && targetsOf(g.pj, links, ordo).list.some(x => same(x, focusPj));
  // Depuis une fiche : les PJ déjà liés à ce PJ en tête, ordre figé à l'ouverture (les lignes ne sautent pas quand on clique).
  const first = useRef(null);
  if (first.current === null) first.current = new Set(groups.filter(linkedToFocus).map(g => g.pj));
  const list = groups.filter(g => !q.trim() || (g.pj + " " + g.label).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (first.current.has(b.pj) ? 1 : 0) - (first.current.has(a.pj) ? 1 : 0));
  const nTodo = groups.filter(g => linkSummary(g, links, ordo).n === 0 && !(targetsOf(g.pj, links, ordo).explicit)).length;

  return (<div role="dialog" aria-modal="true" aria-label="Liaisons Cash in et ordo" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(14,23,38,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 12px", overflowY: "auto" }}>
    <div style={{ width: "min(940px,100%)", background: T.card, color: T.ink900, borderRadius: 14, boxShadow: T.shadowCard || "0 10px 40px rgba(0,0,0,.25)", padding: 16, fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: FZ.lg, fontWeight: 700, flex: 1 }}>{focusPj ? "Lier un PJ du Cash in à " + focusPj : "Liaisons Cash in ↔ ordo"}</div>
        <button style={btn(false)} onClick={onClose}>Fermer</button>
      </div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginBottom: 10 }}>
        Un PJ du Cash in se rattache tout seul au PJ de l'ordo de même numéro. Si son contrat couvre <b>plusieurs machines</b>, liez-le à chacune ; chaque jalon est alors <b>réparti</b> (divisé à parts égales entre les machines), sauf si vous le mettez sur des <b>machines cochées</b> :
        <span style={{ display: "block", marginTop: 4 }}>• un jalon propre à une machine (ex. « FAT ORC n°1 ») : cochez cette machine seulement, elle reçoit le montant entier ;</span>
        <span style={{ display: "block" }}>• un paiement unique pour tout le contrat (ex. l'acompte) : cochez toutes les machines, chacune le montre en entier mais il n'est compté qu'une fois.</span>
        {nTodo > 0 && <> <b style={{ color: statusSoft().warn.ink }}>{nTodo} PJ du Cash in sans PJ correspondant.</b></>}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un PJ du Cash in" aria-label="Chercher un PJ du Cash in" style={{ ...field, width: "100%", boxSizing: "border-box", marginBottom: 8 }}/>
      {err && <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: T.red100, color: T.red600, fontSize: FZ.sm, fontWeight: 600, marginBottom: 8 }}>{err}</div>}
      {!groups.length && <div style={{ fontSize: FZ.sm, color: T.ink500, padding: 12 }}>Aucun jalon dans le Cash in pour l'instant.</div>}
      {list.map(g => {
        const s = linkSummary(g, links, ordo), isOpen = open === g.pj, on = linkedToFocus(g);
        return (<div key={g.pj} style={{ padding: "7px 10px", borderRadius: 10, background: s.tone.bg, border: "1px solid " + s.tone.ring, color: s.tone.ink, marginBottom: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: FZ.sm }}>{g.pj}{g.label ? <span style={{ fontWeight: 400 }}> · {g.label}</span> : null}</div>
              <div style={{ fontSize: FZ.xs }}>{g.rows.length} jalon{g.rows.length > 1 ? "s" : ""} · {fmtEur(g.total)}</div>
            </div>
            <div style={{ flex: "2 1 240px", fontSize: FZ.xs, fontWeight: 600 }}>{s.text}</div>
            {focusPj && <button style={btn(!on, !busy)} disabled={busy} onClick={() => write(toggleLink(links, g.pj, focusPj, ordo))}>{on ? "Délier de " + focusPj : "Lier à " + focusPj}</button>}
            <button style={btn(false)} onClick={() => setOpen(isOpen ? null : g.pj)} aria-expanded={isOpen}>{isOpen ? "Fermer" : "Modifier"}</button>
          </div>
          {isOpen && <Editor g={g} links={links} ordo={ordo} busy={busy} onCancel={() => setOpen(null)}
            onSave={d => write({ ...links, [g.pj]: d })}
            onAuto={() => { const n = { ...links }; delete n[g.pj]; write(n); }}/>}
          {isOpen && <RowsEditor key={g.pj + JSON.stringify(targetsOf(g.pj, links, ordo).list)} g={g} links={links} ordo={ordo} busy={busy} onSave={write}/>}
        </div>);
      })}
    </div>
  </div>);
}

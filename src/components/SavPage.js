// v326 — page SAV / MES (demandes D1 à D6, maquette maquettes-design/v325-sav-mes.html validée : « Go tout faire »).
// Le Cockpit est l'outil du SAV (pas d'import) : Tickets · Interventions · Planning des équipes · Parc.
// Droits : level « w » / « a » = équipe SAV (tout modifier) ; « r » = lecture (chefs de projet, direction) + demander une intervention
// sur un jour libre, dans une vue du planning sur UNE seule ligne (demandé : « la vue chef de projet doit être une seule ligne »).
// Coûts des interventions visibles seulement si canCost (équipe SAV, direction, propriétaire).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { mapPoints, parseSavHistory, historyPlan } from "../savImport";
import { usePointerDnD } from "../pointerDrag";
import { T, FZ, btn, buildPalette, getThemeId } from "../theme";
import { getPjMeta } from "../pjMeta";
import { PlanSwitch } from "./PlanSwitch";
import { NavIcon, Panel, Pill, Btn, Segmented, PjPlate, tableTh, tableTd, EmptyState, PageHead, useSheetJS, SortTh, useSort } from "./SharedUI";
import { stageSoft } from "../theme";
import { askConfirm } from "../confirm";
import { smooth } from "../scrollMode";
import { TICKET_TYPES, typeOf, flowOf, PRIOS, ORIGINS, INTER_TYPES, INTER_STATUS, PREP_ITEMS, CLO_ITEMS, COST_FIELDS, CONTRACTS, DEM_STATUS,
  nextTicketId, nextInterId, isClosed, ticketAge, interCost, interTeam, interDays, planBars, dayLoad, workDaysFrom, mondayOf,
  acceptDemande, parcOf, savKpis, savStats, fournTypesOf, fournLabel, addStepNote, delStepNote } from "../savModel";

const iso = d => { const x = new Date(d); return isNaN(x) ? "" : x.toISOString().slice(0, 10); };
const todayIso = () => iso(new Date());
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");
const fdd = s => { if (!s) return "—"; const d = new Date(s + "T12:00:00"); return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
const eur = v => (v ? Math.round(v).toLocaleString("fr-FR") + " €" : "—");
const TYPE_TONE = { cur: "bad", prev: "ok", mes: "info", dev: "neutral", qtech: "violet", qcom: "violet", audit: "accent", diag: "warn", autre: "neutral" };
const PRIO_TONE = { h: "bad", m: "warn", b: "muted" };
const ST_TONE = { "À planifier": "warn", Planifiée: "info", "En cours": "accent", Réalisée: "ok", Validée: "ok", "Non validée": "bad", Annulée: "muted" };
const lab = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, get color() { return T.ink500; }, fontWeight: 600, minWidth: 0  }; // v346 : accesseurs (suivent le clair / sombre)
const inp = () => ({ minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box", width: "100%" });
const SUBS = [["tickets", "Tickets"], ["inters", "Interventions"], ["planning", "Planning des équipes"], ["parc", "Parc"], ["kpi", "KPI"]];
const DESC = { tickets: "Le ticket est la demande (le problème à régler) ; une intervention est un déplacement sur site pour le traiter", inters: "Interventions sur site : équipe, dates, préparation, clôture et coûts",
  planning: "Qui est où, à la semaine ou au mois ; demandes d'intervention des chefs de projet", parc: "Machines en service, fournitures ENOGIA, contrats de maintenance et tickets ouverts", kpi: "Affectation de l'équipe, interventions, tickets et coûts sur 12 mois glissants" };

// v332 (demandé : « filtrer par colonne en appuyant sur le nom de la colonne : un clic dans un sens, encore un clic dans l'autre ») : tri des tableaux
const PRIO_N = { h: 0, m: 1, b: 2 };
const T_SORT = { id: t => t.id, pj: t => t.pj || "", type: t => typeOf(t.type)[1], prio: t => PRIO_N[t.prio] ?? 1, step: t => (t.step || 0) / Math.max(1, flowOf(t.type).length - 1), resp: t => t.resp || null, age: t => ticketAge(t) };
const I_SORT = { id: i => i.id, pj: i => i.pj || "", obj: i => i.obj || null, type: i => i.type || null, team: i => i.resp || null, date: i => i.a || null, prep: i => (i.prep || []).length, clo: i => (i.clo || []).length, st: i => INTER_STATUS.indexOf(i.st), cost: i => interCost(i) };
const P_SORT = { pj: p => p.pj, pays: p => p.info.ville || p.pays || null, orc: p => p.gammes.join(", ") || null, fourn: p => fournLabel(p.info.fourn) || null, mes: p => p.info.mes || p.depart || null, app: p => p.info.application || null, ctr: p => (p.info.contrat && p.info.contrat !== "Sans contrat" ? p.info.contrat : null), prev: p => p.info.preventive || null, open: p => p.ouverts };
const SortHead = ({ cols, sort, onSort }) => <thead><tr>{cols.map(([c, l, n]) => <SortTh key={c} col={c} label={l} num={n} sort={sort} onSort={onSort} title={"Trier par « " + l + " » (encore un clic : l'autre sens)"} />)}</tr></thead>;
function Kpi({ l, v, tone }) {
  return <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 12px", minWidth: 0 }}>
    <div style={{ fontSize: 12, color: T.ink500 }}>{l}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 28, letterSpacing: "-0.02em", fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tone === "bad" ? T.red600 : tone === "warn" ? T.amber600 : T.ink900 }}>{v == null ? "—" : v}</div>
  </div>;
}
// v328 (demandé : « la gestion des étapes n'est pas claire sur le ticket ») : frise des étapes toujours visible ; l'équipe SAV clique une étape
// pour y placer le ticket ; « Passer à … » nomme l'étape suivante.
// v332 (demandé : « à chaque étape, pouvoir mettre un commentaire ») : bouton bulle + nombre sur chaque étape ; l'étape dépliée montre
// ses commentaires (auteur, date) et un champ pour en ajouter (équipe SAV) ; ticket.stepNotes[n° d'étape].
function StepNotes({ notes, canEdit, me, isAdmin, onAdd, onDel }) {
  const [txt, setTxt] = useState("");
  return <div style={{ margin: "2px 0 6px 36px", display: "flex", flexDirection: "column", gap: 6 }}>
    {notes.length === 0 && !canEdit && <div style={{ fontSize: 12, color: T.ink500 }}>Aucun commentaire sur cette étape</div>}
    {notes.map((n, k) => <div key={k} style={{ fontSize: FZ.sm, color: T.ink900, background: T.surface, borderRadius: 8, padding: "6px 8px", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}><div data-no-i18n="1" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.t}</div><div style={{ fontSize: 12, color: T.ink500 }}>{n.by || "—"} · {n.at ? new Date(n.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : ""}</div></div>
      {canEdit && (isAdmin || (n.by && n.by === me)) && <button type="button" onClick={() => onDel(k)} aria-label="Supprimer ce commentaire" style={{ border: "none", background: "transparent", color: T.ink500, cursor: "pointer", minWidth: 24, minHeight: 24, display: "inline-grid", placeItems: "center" }}><NavIcon name="close" size={13} /></button>}</div>)}
    {canEdit && <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={1} placeholder="Commentaire sur cette étape" aria-label="Commentaire sur cette étape" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && txt.trim()) { e.preventDefault(); onAdd(txt); setTxt(""); } }} style={{ ...inp(), padding: "6px 8px", minHeight: 32, resize: "vertical", flex: 1 }} />
      <Btn size="sm" disabled={!txt.trim()} onClick={() => { onAdd(txt); setTxt(""); }}>Ajouter</Btn></div>}
  </div>;
}
function StepFlow({ t, canEdit, onSet, onNotes, me, isAdmin }) {
  const F = flowOf(t.type), cur = Math.min(t.step || 0, F.length - 1), closed = isClosed(t), SN = t.stepNotes || {};
  const [openN, setOpenN] = useState(() => new Set([cur]));
  const tog = i => setOpenN(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <ol aria-label={"Étapes du ticket (" + typeOf(t.type)[1] + ")"} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
      {F.map((x, i) => { const done = i < cur || (closed && i === cur), now = i === cur && !closed, nn = (SN[i] || []).length, op = openN.has(i);
        return <li key={x}><div style={{ display: "flex", gap: 4, alignItems: "center" }}><button type="button" disabled={!canEdit || i === cur} onClick={() => onSet(i)} aria-current={now ? "step" : undefined} title={canEdit && i !== cur ? "Placer le ticket à cette étape" : undefined}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, minHeight: 30, padding: "0 8px", borderRadius: 8, border: "1px solid " + (now ? T.amber500 : "transparent"), background: now ? T.amber100 : "transparent", color: now ? T.ink900 : done ? T.ink700 : T.ink500, fontSize: FZ.sm, fontWeight: now ? 600 : 500, textAlign: "left", cursor: canEdit && i !== cur ? "pointer" : "default", fontFamily: T.font }}>
          <span aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontSize: 12, fontWeight: 500, background: done ? T.emerald600 : now ? T.amber500 : T.surfaceAlt, color: done ? T.card : T.ink900 }}>{done ? "✓" : i + 1}</span>
          <span style={{ flex: 1 }}>{x}</span>{now && <span style={{ fontSize: 12, fontWeight: 500, color: T.amber600 }}>en cours</span>}</button>
          {(canEdit || nn > 0) && <button type="button" onClick={() => tog(i)} aria-expanded={op} aria-label={(nn ? nn + " commentaire" + (nn > 1 ? "s" : "") : "Commenter") + " · " + x} title={nn ? nn + " commentaire" + (nn > 1 ? "s" : "") : "Commenter cette étape"}
            style={{ display: "inline-flex", alignItems: "center", gap: 3, minWidth: 40, minHeight: 28, justifyContent: "center", borderRadius: 8, border: "1px solid " + (op ? T.line : "transparent"), background: op ? T.surface : "transparent", color: nn ? T.ink900 : T.ink300, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: T.font }}>
            <NavIcon name="comments" size={15} />{nn > 0 && <span style={{ fontVariantNumeric: "tabular-nums" }}>{nn}</span>}</button>}</div>
          {op && <StepNotes notes={SN[i] || []} canEdit={canEdit && !!onNotes} me={me} isAdmin={isAdmin} onAdd={txt => onNotes(addStepNote(t, i, txt, me))} onDel={k => onNotes(delStepNote(t, i, k))} />}</li>; })}
    </ol>
    {canEdit && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {!closed && <Btn v="pri" size="sm" onClick={() => onSet(cur + 1)}>{cur + 1 >= F.length - 1 ? "Clore le ticket" : "Passer à « " + F[cur + 1] + " »"}</Btn>}
      {cur > 0 && <Btn v="ghost" size="sm" onClick={() => onSet(cur - 1)}>← Revenir à l'étape {cur}</Btn>}
      {closed && <Btn size="sm" onClick={() => onSet(F.length - 2)}>Rouvrir le ticket</Btn>}</div>}
  </div>;
}
function Steps({ t }) {
  const F = flowOf(t.type), s = t.step || 0;
  return <span aria-label={"Étape " + (s + 1) + " sur " + F.length + " : " + F[s]} style={{ display: "inline-flex", gap: 2, width: 110 }}>
    {F.map((_, i) => <i key={i} style={{ flex: 1, height: 6, borderRadius: 4, background: i < s ? T.ink700 : i === s ? (isClosed(t) ? T.emerald600 : T.amber500) : T.surfaceAlt }} />)}</span>;
}
function Modal({ title, onClose, children, width = 640 }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,14,22,.45)", display: "grid", placeItems: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") onClose(); }}
      style={{ width, maxWidth: "100%", maxHeight: "90dvh", overflowY: "auto", background: T.card, borderRadius: 12, border: "1px solid " + T.line, boxShadow: T.shadowLg, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink900, flex: 1 }}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ ...btn("ghost", "sm") }}><NavIcon name="close" size={16} /></button></div>
      {children}
    </div></div>;
}
// v327 (demandé : « préparation, clôture, pièces de rechange… pas dans le ticket mais en listes déroulantes après la création ») : section repliée
function Fold({ title, info, open: open0 = false, children }) {
  const [open, setOpen] = useState(open0);
  return <div style={{ border: "1px solid " + T.line, borderRadius: 8, overflow: "hidden" }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 36, padding: "0 10px", border: "none", background: T.surface, color: T.ink900, cursor: "pointer", fontFamily: T.font, fontSize: FZ.sm, fontWeight: 600, textAlign: "left" }}>
      <span aria-hidden="true" style={{ fontSize: 12, color: T.ink500, transform: open ? "rotate(90deg)" : "none", transition: "transform var(--e-dur-micro)" }}>▶</span><span style={{ flex: 1 }}>{title}</span>{info != null && <span style={{ fontSize: 12, fontWeight: 500, color: T.ink500 }}>{info}</span>}</button>
    {open && <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
  </div>;
}
// v335 (demandé : « pouvoir rajouter un PJ qui n'est pas encore créé ; en réalité les PJ seront déjà dans l'ordo ») : choisir dans la liste
// ou taper un numéro (mis en majuscules) ; un PJ inconnu est signalé, il rejoindra le planning quand il sera créé dans l'ordo.
function PjInput({ value, onChange, pjList, nomOf, disabled, id }) {
  const v = value || "", known = !v || pjList.includes(v);
  return <><input list={id} value={v} onChange={e => onChange(e.target.value.toUpperCase().replace(/\s+/g, ""))} disabled={disabled} placeholder="PJ… (liste ou nouveau n°)" aria-label="PJ" style={inp()} />
    <datalist id={id}>{pjList.map(p => <option key={p} value={p}>{nomOf(p) || ""}</option>)}</datalist>
    {v && <span style={{ fontSize: 12, fontWeight: 500, color: known ? T.ink500 : T.amber600 }}>{known ? nomOf(v) || "" : "PJ pas encore dans l'ordo : gardé tel quel"}</span>}</>;
}
const Field = ({ l, children, span }) => <label style={{ ...lab, gridColumn: span ? "1 / -1" : undefined }}>{l}{children}</label>;
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 };
function Checks({ items, value, onChange, disabled }) {
  const on = new Set(value || []);
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{items.map(x => { const v = on.has(x);
    return <button key={x} type="button" disabled={disabled} aria-pressed={v} onClick={() => { const n = new Set(on); if (v) n.delete(x); else n.add(x); onChange(items.filter(y => n.has(y))); }}
      style={{ minHeight: 28, padding: "0 10px", borderRadius: 8, border: "1px solid " + (v ? "transparent" : T.line), background: v ? T.emerald100 : T.card, color: v ? T.emerald600 : T.ink700, fontSize: 12, fontWeight: 500, cursor: disabled ? "default" : "pointer", fontFamily: T.font }}>{v ? "✓ " : ""}{x}</button>; })}</div>;
}

export function SavPage({ doc, dem, api, demApi, rows, level = "r", canCost, me, myName, myPjs, team, sub: subP, onSub, allowSubs, onOpenPj, focusPj }) {
  const canEdit = level === "w" || level === "a", isAdmin = level === "a";
  const D = doc || {}, tickets = D.tickets || {}, inters = D.inters || {}, demandes = (dem && dem.items) || {};
  const techs = (Array.isArray(D.techs) && D.techs.length ? D.techs : team) || [];
  const subs = SUBS.filter(([id]) => !allowSubs || allowSubs.includes(id));
  const [sub0, setSub0] = useState(subs[0] ? subs[0][0] : "tickets");
  const sub = subs.some(([id]) => id === subP) ? subP : subs.some(([id]) => id === sub0) ? sub0 : (subs[0] || ["tickets"])[0];
  const go = id => (onSub ? onSub(id) : setSub0(id));
  const metaOf = r => getPjMeta(r.pj, r);
  const pjList = useMemo(() => [...new Set([...(rows || []).filter(r => r && r.pj && r.etat !== "SLOT_LIBRE").map(r => r.pj), ...Object.keys(D.parc || {})])].sort((a, b) => a.localeCompare(b, "fr", { numeric: true })), [rows, D.parc]);
  const nomOf = pj => { const r = (rows || []).find(x => x.pj === pj); return r ? getPjMeta(pj, r).nomProjet || "" : ((D.parc || {})[pj] || {}).nom || ""; };
  const k = savKpis(D, dem);
  const [ticketDlg, setTicketDlg] = useState(null), [interDlg, setInterDlg] = useState(null), [parcDlg, setParcDlg] = useState(null), [demDlg, setDemDlg] = useState(null), [teamDlg, setTeamDlg] = useState(false), [typesDlg, setTypesDlg] = useState(false);

  const saveTicket = async (id, t) => { const nid = id || nextTicketId(tickets); if (await api.put("tickets", nid, t)) setTicketDlg(null); return nid; };
  const saveInter = async (id, i) => {
    const nid = id || nextInterId(inters);
    if (!(await api.put("inters", nid, i))) return;
    if (i.tk && tickets[i.tk] && !(tickets[i.tk].inters || []).includes(nid)) await api.put("tickets", i.tk, { ...tickets[i.tk], inters: [...(tickets[i.tk].inters || []), nid] });
    setInterDlg(null);
  };

  return <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font }}>
    {/* v328 (demandé : « le nom SAV / MES doit être pareil que sur les autres pages ») : même en-tête que Tests, Planning… */}
    <PageHead title="SAV / MES" sub={DESC[sub] + (!canEdit ? " · lecture seule" : "")} accent={stageSoft().depart.solid} style={{ marginBottom: 0 }}
      right={subs.length > 1 ? <PlanSwitch label="Sous-pages : SAV / MES" value={sub} onGo={go} tools={[]} views={subs.map(([id, l]) => ({ id, l, badge: id === "planning" && canEdit ? k.demandes : id === "inters" && canEdit ? k.toPlan : 0, badgeBad: id === "planning" }))} /> : undefined} />
    {/* v328 (demandé : « les demandes de ticket / intervention vers la gauche ») */}
    {canEdit && (sub === "tickets" || sub === "inters" || sub === "parc") && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {sub === "tickets" && <Btn v="sec" size="sm" onClick={() => setTicketDlg({ id: null, t: { type: "cur", prio: "m", step: 0, orig: "Client", date: todayIso(), resp: myName || "" } })}>＋ Nouveau ticket</Btn>}
      {sub === "inters" && <Btn v="pri" size="sm" onClick={() => setInterDlg({ id: null, i: { st: "À planifier", type: "Maintenance curative", resp: "", who: [], prep: [], clo: [], costs: {} } })}>＋ Intervention sur site</Btn>}
      {sub === "parc" && <Btn size="sm" onClick={() => setParcDlg({ pj: "", p: {}, isNew: true })}>＋ Projet du parc</Btn>}
      {isAdmin && api.merge && <HistoryImport doc={D} api={api} />}
    </div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      <Kpi l="Tickets ouverts" v={k.open} /><Kpi l="Haute priorité" v={k.high} tone={k.high ? "bad" : null} />
      <Kpi l="Interventions à planifier" v={k.toPlan} tone={k.toPlan ? "warn" : null} />
      {canEdit ? <Kpi l="Demandes des chefs de projet" v={k.demandes} tone={k.demandes ? "warn" : null} /> : <Kpi l="Délai moyen de traitement" v={k.avgDays == null ? null : k.avgDays + " j"} />}
      {canCost ? <Kpi l="Coût des interventions (mois)" v={eur(k.monthCost)} /> : <Kpi l="Satisfaction client" v={k.satisf == null ? null : String(k.satisf).replace(".", ",") + " / 5"} />}
    </div>

    {sub === "tickets" && <TicketsView {...{ tickets, inters, canEdit, isAdmin, me, myName, nomOf, onOpenPj, focusPj }} onSaveT={(id, t) => api.put("tickets", id, t)} onEdit={(id, t) => setTicketDlg({ id, t })} onStep={(id, t, d) => api.put("tickets", id, { ...t, step: Math.max(0, Math.min(flowOf(t.type).length - 1, (t.step || 0) + d)), ...((t.step || 0) + d >= flowOf(t.type).length - 1 ? { closedAt: t.closedAt || todayIso() } : { closedAt: null }) })}
      onNewInter={(id, t) => setInterDlg({ id: null, i: { tk: id, pj: t.pj, obj: t.det || "", st: "À planifier", type: t.type === "mes" ? "Mise en service" : t.type === "prev" ? "Maintenance préventive" : "Maintenance curative", resp: t.resp || "", who: [], prep: [], clo: [], costs: {} } })}
      onOpenInter={id => setInterDlg({ id, i: inters[id] })} />}
    {sub === "inters" && <IntersView {...{ inters, canCost, nomOf }} onOpen={id => setInterDlg({ id, i: inters[id] })} />}
    {sub === "planning" && <PlanningView {...{ inters, demandes, techs, canEdit, nomOf, me, myName, myPjs, pjList }} onOpenInter={id => setInterDlg({ id, i: inters[id] })} onTeam={() => setTeamDlg(true)}
      onMove={(id, patch) => api.put("inters", id, { ...inters[id], ...patch })}
      onRequest={day => setDemDlg({ date: day, days: 1, pj: focusPj && pjList.includes(focusPj) ? focusPj : (myPjs || [])[0] || "", obj: "", type: "cur" })}
      onAnswer={async (id, d, ok, note) => {
        if (ok) { const r = acceptDemande({ ...d, id }, D); if (!(await api.put("tickets", r.tid, r.ticket)) || !(await api.put("inters", r.iid, r.inter))) return;
          await demApi.put("items", id, { ...d, st: "ok", answeredBy: myName || "", answeredAt: new Date().toISOString(), tid: r.tid, iid: r.iid, ...(note ? { note } : {}) }); setInterDlg({ id: r.iid, i: r.inter }); }
        else await demApi.put("items", id, { ...d, st: "ko", answeredBy: myName || "", answeredAt: new Date().toISOString(), ...(note ? { note } : {}) });
      }}
      onCancel={async id => { if (await askConfirm({ title: "Retirer cette demande ?", message: "Le responsable SAV ne la verra plus.", confirmLabel: "Retirer la demande" })) demApi.del("items", id); }} />}
    {sub === "parc" && <ParcView {...{ rows, metaOf, parc: D.parc, tickets, canEdit, onOpenPj }} fournTypes={fournTypesOf(D)} onTypes={() => setTypesDlg(true)} onEdit={(pj, p) => setParcDlg({ pj, p })} />}
    {sub === "kpi" && <SavKpiView doc={D} techs={techs} canCost={canCost} nomOf={nomOf} />}
    {typesDlg && <TypesDialog types={fournTypesOf(D)} onClose={() => setTypesDlg(false)} onSave={async L => { if (await api.setField("fournTypes", L)) setTypesDlg(false); }} />}

    {ticketDlg && <TicketDialog {...ticketDlg} {...{ pjList, nomOf, techs, canEdit, isAdmin, inters }} onClose={() => setTicketDlg(null)} onSave={saveTicket}
      onDelete={async id => { if (await askConfirm({ title: "Supprimer le ticket " + id + " ?", message: "Ses interventions restent ; le ticket disparaît pour tout le monde.", confirmLabel: "Supprimer", danger: true })) { await api.del("tickets", id); setTicketDlg(null); } }} />}
    {interDlg && <InterDialog {...interDlg} {...{ pjList, nomOf, techs, canEdit, isAdmin, canCost, tickets }} onClose={() => setInterDlg(null)} onSave={saveInter}
      onDelete={async id => { if (await askConfirm({ title: "Supprimer l'intervention " + id + " ?", message: "Elle disparaît du planning et du ticket.", confirmLabel: "Supprimer", danger: true })) { await api.del("inters", id); setInterDlg(null); } }} />}
    {parcDlg && <ParcDialog {...parcDlg} canEdit={canEdit} fournTypes={fournTypesOf(D)} onClose={() => setParcDlg(null)} onSave={async (pj, p) => { if (await api.put("parc", pj, p)) setParcDlg(null); }} />}
    {demDlg && <DemandeDialog init={demDlg} pjs={(myPjs && myPjs.length ? myPjs : pjList)} nomOf={nomOf} onClose={() => setDemDlg(null)}
      onSave={async d => { const id = "d" + Date.now().toString(36); if (await demApi.put("items", id, { ...d, by: myName || "", byEmail: me || "", at: new Date().toISOString(), st: "attente" })) setDemDlg(null); }} />}
    {teamDlg && <TeamDialog techs={techs} onClose={() => setTeamDlg(false)} onSave={async L => { if (await api.setField("techs", L)) setTeamDlg(false); }} />}
  </div>;
}

/* ── Tickets ── */
function TicketsView({ tickets, inters, canEdit, isAdmin, myName, nomOf, onEdit, onStep, onSaveT, onNewInter, onOpenInter, onOpenPj, focusPj }) {
  const [filt, setFilt] = useState("open"), [q, setQ] = useState(focusPj || ""), [sel, setSel] = useState(null);
  const all = Object.entries(tickets).map(([id, t]) => ({ id, ...t }));
  const L = all.filter(t => (filt === "all" || (filt === "open" && !isClosed(t)) || (filt === "mine" && !isClosed(t) && t.resp && t.resp === myName)))
    .filter(t => !q || (t.id + " " + (t.pj || "") + " " + nomOf(t.pj) + " " + (t.det || "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (isClosed(a) - isClosed(b)) || ({ h: 0, m: 1, b: 2 }[a.prio] - { h: 0, m: 1, b: 2 }[b.prio]) || String(b.date || "").localeCompare(String(a.date || "")));
  const { sorted, sort, setSort } = useSort(L, T_SORT);
  const cur = L.find(t => t.id === sel) || L[0] || null;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px, 400px)", gap: 12, alignItems: "start" }} className="enogia-sav-split">
    <Panel level={2} title="Tickets" pad={0} right={<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 12px 0 0" }}>
      <Segmented label="Filtrer les tickets" value={filt} onChange={setFilt} options={[["open", "Ouverts"], ["mine", "Les miens"], ["all", "Tous"]]} />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un ticket…" aria-label="Rechercher un ticket" style={{ ...inp(), width: 220 }} /></div>}>
      {L.length === 0 ? <EmptyState icon="inbox" compact title={all.length ? "Aucun ticket avec ce filtre" : "Aucun ticket pour l'instant"} hint={canEdit && !all.length ? "« ＋ Nouveau ticket » pour enregistrer la première demande." : ""} /> :
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
        <SortHead sort={sort} onSort={setSort} cols={[["id", "Ticket"], ["pj", "PJ"], ["type", "Type"], ["prio", "Priorité"], ["step", "Avancement"], ["resp", "Responsable"], ["age", "Depuis", true]]} />
        <tbody>{sorted.map(t => <tr key={t.id} onClick={() => setSel(t.id)} className="e-hov" data-on={cur && cur.id === t.id ? "1" : "0"} style={{ cursor: "pointer", background: cur && cur.id === t.id ? T.surfaceAlt : "transparent", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{t.id}</span>{t.orig === "Chef de projet" && <span style={{ marginLeft: 6 }}><Pill tone="warn">demande CdP</Pill></span>}</td>
          <td style={tableTd()}><PjPlate pj={t.pj} /> <span style={{ color: T.ink700 }}>{nomOf(t.pj)}</span></td>
          <td style={tableTd()}><Pill tone={TYPE_TONE[t.type] || "neutral"}>{typeOf(t.type)[1]}</Pill></td>
          <td style={tableTd()}><Pill tone={PRIO_TONE[t.prio] || "muted"}>{(PRIOS.find(p => p[0] === t.prio) || PRIOS[1])[1]}</Pill></td>
          <td style={tableTd({ wrap: true })}><Steps t={t} /><div style={{ fontSize: 12, color: T.ink500 }}>{flowOf(t.type)[t.step || 0]}</div></td>
          <td style={tableTd()}>{t.resp || "—"}</td><td style={tableTd({ num: true })}>{ticketAge(t) == null ? "—" : ticketAge(t) + " j"}</td></tr>)}</tbody></table></div>}
    </Panel>
    {cur ? <Panel level={2} title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontFamily: T.fontMono, fontSize: 12 }}>{cur.id}</span><Pill tone={TYPE_TONE[cur.type] || "neutral"}>{typeOf(cur.type)[1]}</Pill><Pill tone={PRIO_TONE[cur.prio] || "muted"}>{(PRIOS.find(p => p[0] === cur.prio) || PRIOS[1])[1]}</Pill></span>}
      right={canEdit && <Btn size="sm" onClick={() => onEdit(cur.id, tickets[cur.id])}>Modifier</Btn>}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button type="button" onClick={() => onOpenPj && onOpenPj(cur.pj)} aria-label={"Ouvrir la fiche de " + cur.pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PjPlate pj={cur.pj} /></button><b style={{ fontSize: FZ.md, color: T.ink900 }}>{nomOf(cur.pj)}</b></div>
      {cur.det && <p data-no-i18n="1" style={{ margin: 0, fontSize: FZ.sm, color: T.ink900, whiteSpace: "pre-wrap" }}>{cur.det}</p>}
      <StepFlow key={cur.id + ":" + (cur.step || 0)} t={cur} canEdit={canEdit} me={myName} isAdmin={isAdmin} onSet={n => onStep(cur.id, tickets[cur.id], n - (cur.step || 0))}
        onNotes={onSaveT ? nt => onSaveT(cur.id, { ...tickets[cur.id], stepNotes: nt.stepNotes }) : null} />
      <Fold title={"Interventions sur site"} info={(cur.inters || []).length} open={(cur.inters || []).length > 0}>
        {(cur.inters || []).length ? cur.inters.map(i => <button key={i} type="button" onClick={() => onOpenInter(i)} disabled={!inters[i]} style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", minHeight: 32, border: "1px solid " + T.line, borderRadius: 8, background: T.card, padding: "0 8px", cursor: "pointer", fontFamily: T.font, textAlign: "left" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{i}</span><span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inters[i] ? (inters[i].a ? fd(inters[i].a) + " → " + fd(inters[i].b) : "à planifier") : "supprimée"}</span>{inters[i] && <Pill tone={ST_TONE[inters[i].st] || "neutral"}>{inters[i].st}</Pill>}</button>)
          : <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune : le ticket se traite à distance tant qu'on n'ajoute pas d'intervention.</div>}
        {canEdit && <Btn size="sm" onClick={() => onNewInter(cur.id, tickets[cur.id])}>＋ Intervention sur site</Btn>}
      </Fold>
      <Fold title="Informations">
        <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 10px", margin: 0, fontSize: FZ.sm }}>
          <dt style={{ color: T.ink500 }}>Origine</dt><dd style={{ margin: 0 }}>{cur.orig || "—"}{cur.by ? " · " + cur.by : ""}</dd>
          <dt style={{ color: T.ink500 }}>Responsable</dt><dd style={{ margin: 0 }}>{cur.resp || "—"}</dd>
          <dt style={{ color: T.ink500 }}>Demande du</dt><dd style={{ margin: 0 }}>{fd(cur.date)}</dd>
          {cur.closedAt && <><dt style={{ color: T.ink500 }}>Clos le</dt><dd style={{ margin: 0 }}>{fd(cur.closedAt)}{cur.satisf ? " · satisfaction " + cur.satisf + " / 5" : ""}</dd></>}
          {cur.notes && <><dt style={{ color: T.ink500 }}>Suivi</dt><dd data-no-i18n="1" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{cur.notes}</dd></>}
        </dl>
      </Fold>
          </Panel> : <span />}
  </div>;
}
function TicketDialog({ id, t: t0, pjList, nomOf, techs, canEdit, isAdmin, onClose, onSave, onDelete }) {
  const [t, setT] = useState({ ...t0 }); const set = (k, v) => setT(x => ({ ...x, [k]: v }));
  const F = flowOf(t.type), ok = t.pj && t.det && t.det.trim();
  return <Modal title={id ? "Ticket " + id : "Nouveau ticket"} onClose={onClose} width={560}>
    {!id && <div style={{ fontSize: 12, color: T.ink500 }}>Le ticket décrit la demande. Les interventions sur site, leur préparation, leur clôture et leurs coûts s'ajoutent ensuite depuis le ticket.</div>}
    <div style={grid2}>
      <Field l="PJ"><PjInput id="sav-pj-t" value={t.pj} onChange={v => set("pj", v)} pjList={pjList} nomOf={nomOf} disabled={!canEdit} /></Field>
      <Field l="Type de demande"><select value={t.type} onChange={e => setT(x => ({ ...x, type: e.target.value, step: Math.min(x.step || 0, flowOf(e.target.value).length - 1) }))} disabled={!canEdit} style={inp()}>{TICKET_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field l="Priorité"><select value={t.prio} onChange={e => set("prio", e.target.value)} disabled={!canEdit} style={inp()}>{PRIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field l="Origine"><select value={t.orig || ""} onChange={e => set("orig", e.target.value)} disabled={!canEdit} style={inp()}>{ORIGINS.map(o => <option key={o}>{o}</option>)}</select></Field>
      <Field l="Détails de la demande" span><textarea value={t.det || ""} onChange={e => set("det", e.target.value)} disabled={!canEdit} rows={3} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    </div>
    {id && <Fold title="Suivi du ticket" info={"étape " + ((t.step || 0) + 1) + " / " + F.length}>
      <div style={grid2}>
        <Field l="Responsable du ticket"><input list="sav-techs" value={t.resp || ""} onChange={e => set("resp", e.target.value)} disabled={!canEdit} style={inp()} /><datalist id="sav-techs">{techs.map(x => <option key={x} value={x} />)}</datalist></Field>
        <Field l="Date de la demande"><input type="date" value={t.date || ""} onChange={e => set("date", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
        <Field l="Étape"><select value={t.step || 0} onChange={e => set("step", +e.target.value)} disabled={!canEdit} style={inp()}>{F.map((x, i) => <option key={x} value={i}>{i + 1}. {x}</option>)}</select></Field>
        <Field l="Satisfaction client (après clôture)"><select value={t.satisf || ""} onChange={e => set("satisf", e.target.value ? +e.target.value : null)} disabled={!canEdit} style={inp()}><option value="">—</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></Field>
        <Field l="Actions, commentaires, avancement" span><textarea value={t.notes || ""} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
      </div>
    </Fold>}
    {canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {id && isAdmin && <Btn v="dan" size="sm" onClick={() => onDelete(id)}>Supprimer</Btn>}<span style={{ flex: 1 }} />
      <Btn size="sm" onClick={onClose}>Annuler</Btn>
      <Btn v="pri" size="sm" disabled={!ok} onClick={() => { const last = flowOf(t.type).length - 1; onSave(id, { ...t, closedAt: (t.step || 0) >= last ? (t.closedAt || todayIso()) : null, inters: t.inters || [] }); }}>{id ? "Enregistrer" : "Créer le ticket"}</Btn></div>}
  </Modal>;
}

/* ── Interventions ── */
function IntersView({ inters, canCost, nomOf, onOpen }) {
  const [filt, setFilt] = useState("open");
  const L = Object.entries(inters).map(([id, i]) => ({ id, ...i })).filter(i => filt === "all" || (filt === "open" ? !["Réalisée", "Validée", "Non validée", "Annulée"].includes(i.st) : ["Réalisée", "Validée", "Non validée"].includes(i.st)))
    .sort((a, b) => String(a.a || "9").localeCompare(String(b.a || "9")) || a.id.localeCompare(b.id));
  const { sorted, sort, setSort } = useSort(L, I_SORT);
  return <Panel level={2} title="Interventions" pad={0} right={<div style={{ padding: "10px 12px 0 0" }}><Segmented label="Filtrer les interventions" value={filt} onChange={setFilt} options={[["open", "À venir"], ["done", "Réalisées"], ["all", "Toutes"]]} /></div>}>
    {L.length === 0 ? <EmptyState icon="calendar" compact title="Aucune intervention avec ce filtre" /> :
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <SortHead sort={sort} onSort={setSort} cols={[["id", "N°"], ["pj", "PJ"], ["obj", "Objectif"], ["type", "Type"], ["team", "Équipe"], ["date", "Dates"], ["prep", "Préparation"], ["clo", "Clôture"], ["st", "Statut"], ...(canCost ? [["cost", "Coût", true]] : [])]} />
      <tbody>{sorted.map(i => { const done = ["Réalisée", "Validée", "Non validée"].includes(i.st);
        return <tr key={i.id} onClick={() => onOpen(i.id)} className="e-hov" style={{ cursor: "pointer", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{i.id}</span><div style={{ fontSize: 12, color: T.ink500 }}>{i.tk || ""}</div></td>
          <td style={tableTd()}><PjPlate pj={i.pj} /> <span style={{ color: T.ink700 }}>{nomOf(i.pj)}</span></td>
          <td style={tableTd({ wrap: true, ink: T.ink900 })}>{i.obj || "—"}</td><td style={tableTd({ wrap: true })}>{i.type || ""}</td>
          <td style={tableTd({ wrap: true })}>{i.resp || <Pill tone="warn">sans technicien</Pill>}{(i.who || []).length ? <div style={{ fontSize: 12, color: T.ink500 }}>+ {i.who.join(", ")}</div> : null}</td>
          <td style={tableTd()}>{i.a ? fd(i.a) + " → " + fd(i.b) + " (" + interDays(i) + " j)" : <Pill tone="warn">à planifier</Pill>}</td>
          <td style={tableTd()}><Pill tone={(i.prep || []).length >= PREP_ITEMS.length ? "ok" : (i.prep || []).length ? "warn" : "muted"}>{(i.prep || []).length} / {PREP_ITEMS.length}</Pill></td>
          <td style={tableTd()}>{done ? <Pill tone={(i.clo || []).length >= CLO_ITEMS.length ? "ok" : "bad"}>{(i.clo || []).length} / {CLO_ITEMS.length}</Pill> : "—"}</td>
          <td style={tableTd()}><Pill tone={ST_TONE[i.st] || "neutral"}>{i.st || "—"}</Pill></td>
          {canCost && <td style={tableTd({ num: true })}>{eur(interCost(i))}</td>}</tr>; })}</tbody></table></div>}
  </Panel>;
}
function InterDialog({ id, i: i0, pjList, nomOf, techs, canEdit, isAdmin, canCost, tickets, onClose, onSave, onDelete }) {
  const [i, setI] = useState({ who: [], prep: [], clo: [], costs: {}, ...i0 }); const set = (k, v) => setI(x => ({ ...x, [k]: v }));
  const tkList = Object.keys(tickets).filter(t => !i.pj || tickets[t].pj === i.pj);
  const ok = i.pj && (i.obj || "").trim() && (!i.a || !i.b || i.a <= i.b);
  return <Modal title={id ? "Intervention " + id : "Nouvelle intervention sur site"} onClose={onClose} width={620}>
    <div style={grid2}>
      {!i0.tk && <Field l="PJ"><PjInput id="sav-pj-i" value={i.pj} onChange={v => set("pj", v)} pjList={pjList} nomOf={nomOf} disabled={!canEdit} /></Field>}
      <Field l="Objectif" span><input value={i.obj || ""} onChange={e => set("obj", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Arrivée sur site"><input type="date" value={i.a || ""} onChange={e => set("a", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Départ du site"><input type="date" value={i.b || ""} min={i.a || undefined} onChange={e => set("b", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Technicien responsable"><select value={i.resp || ""} onChange={e => set("resp", e.target.value)} disabled={!canEdit} style={inp()}><option value="">À affecter</option>{techs.map(x => <option key={x}>{x}</option>)}</select></Field>
      {/* v335 (demandé : « différencier les interventions planifiées et à planifier, pas encore 100 % validées avec le client ») */}
      {(i.st || "À planifier") === "À planifier" || i.st === "Planifiée" ? <label style={{ ...lab, flexDirection: "row", alignItems: "center", gap: 8, gridColumn: "1 / -1", color: T.ink900, fontSize: FZ.sm }}>
        <input type="checkbox" checked={i.st === "Planifiée"} disabled={!canEdit || !i.a || !i.b} onChange={e => set("st", e.target.checked ? "Planifiée" : "À planifier")} />
        Dates validées avec le client <span style={{ color: T.ink500, fontWeight: 500 }}>{i.st === "Planifiée" ? "(planifiée)" : "(à planifier : barre en pointillés sur le planning)"}</span></label> : null}
      <Field l="Statut"><select value={i.st || "À planifier"} onChange={e => set("st", e.target.value)} disabled={!canEdit} style={inp()}>{INTER_STATUS.map(x => <option key={x}>{x}</option>)}</select></Field>
    </div>
    {techs.filter(x => x !== i.resp).length > 0 && <Field l="Intervenants en appui"><Checks items={techs.filter(x => x !== i.resp)} value={i.who} onChange={v => set("who", v)} disabled={!canEdit} /></Field>}
    {id && <>
      <Fold title="Préparation" info={(i.prep || []).length + " / " + PREP_ITEMS.length}><Checks items={PREP_ITEMS} value={i.prep} onChange={v => set("prep", v)} disabled={!canEdit} /></Fold>
      <Fold title="Clôture" info={(i.clo || []).length + " / " + CLO_ITEMS.length}>
        <Checks items={CLO_ITEMS} value={i.clo} onChange={v => set("clo", v)} disabled={!canEdit} />
        <Field l="Réussite de l'intervention"><select value={i.reussite || ""} onChange={e => set("reussite", e.target.value)} disabled={!canEdit} style={{ ...inp(), maxWidth: 240 }}><option value="">—</option><option>Succès</option><option>Partielle</option><option>Échec</option></select></Field></Fold>
      {canCost && <Fold title="Pièces de rechange et coûts" info={eur(interCost(i))}><div style={grid2}>{COST_FIELDS.map(([k, l]) => <label key={k} style={lab}>{l}<input type="number" min={0} step={10} value={(i.costs || {})[k] ?? ""} onChange={e => set("costs", { ...(i.costs || {}), [k]: e.target.value === "" ? null : +e.target.value })} disabled={!canEdit} style={inp()} /></label>)}</div></Fold>}
      <Fold title="Autres informations">
        <div style={grid2}>
          <Field l="Type d'intervention"><select value={i.type || ""} onChange={e => set("type", e.target.value)} disabled={!canEdit} style={inp()}>{INTER_TYPES.map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field l="Ticket lié"><select value={i.tk || ""} onChange={e => set("tk", e.target.value)} disabled={!canEdit} style={inp()}><option value="">—</option>{tkList.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field l="Notes" span><textarea value={i.notes || ""} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
        </div></Fold>
    </>}
    {canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {id && isAdmin && <Btn v="dan" size="sm" onClick={() => onDelete(id)}>Supprimer</Btn>}<span style={{ flex: 1 }} />
      <Btn size="sm" onClick={onClose}>Annuler</Btn>
      <Btn v="pri" size="sm" disabled={!ok} onClick={() => onSave(id, { ...i, st: i.st || "À planifier" })}>{id ? "Enregistrer" : "Créer l'intervention"}</Btn></div>}
  </Modal>;
}

/* ── Planning des équipes ── */
// v327 (demandé : « glisser-déposer des barres » + « vision à la semaine et au mois ») : une colonne par jour ouvré ;
// glisser une barre sur un autre jour décale ses dates (même durée en jours ouvrés), sur une autre ligne change le technicien.
const shiftWork = (isoD, n) => { const d = new Date(isoD + "T12:00:00"); let k = Math.abs(n); const st = n < 0 ? -1 : 1; while (k > 0) { d.setDate(d.getDate() + st); if (d.getDay() % 6) k--; } return iso(d); };
const workCount = (a, b) => { let n = 0; const d = new Date(a + "T12:00:00"), e = new Date(b + "T12:00:00"); while (d <= e) { if (d.getDay() % 6) n++; d.setDate(d.getDate() + 1); } return Math.max(1, n); };
const firstWork = isoD => { const d = new Date(isoD + "T12:00:00"); while (!(d.getDay() % 6)) d.setDate(d.getDate() + 1); return iso(d); };
// v328 (demandé : « on ne voit pas les noms des mois et des semaines » + « deux plannings : un pour le responsable SAV avec les techniciens,
// un où les chefs de projet demandent des interventions ») : en-tête sur trois bandes (mois · semaine S46 · jour) ; sous-vues
// « Techniciens » (équipe SAV) et « Demandes d'intervention » (une seule ligne : jours libres, demandes ; CdP = seulement celle-ci).
const isoWeek = isoD => { const d = new Date(isoD + "T12:00:00"); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4, 12); return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const runs = (days, keyOf) => { const out = []; days.forEach((d, i) => { const k = keyOf(d); if (out.length && out[out.length - 1].k === k) out[out.length - 1].n++; else out.push({ k, d, i, n: 1 }); }); return out; };
const monthName = isoD => { const t = new Date(isoD + "T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const DOW = ["di", "lu", "ma", "me", "je", "ve", "sa"];
// v332 (demandé : « une seule page : calendrier grisé pour la vue CdP, vue complète pour le responsable SAV ; juste les cellules rayées, pas le nom
// du PJ » + « le même système que les autres calendriers, pareil pour les déplacements gauche / droite ») : un seul planning.
// Comme le Calendrier : bande continue (8 semaines avant → 28 semaines après), défilement horizontal, ‹ › = un écran, zoom − +,
// « Aujourd'hui » (la semaine passée à gauche), clic droit maintenu = défiler (pan.js), titre = période visible.
// Équipe SAV : une ligne par technicien (barres à glisser) + ligne « Demandes » (demandes en attente, nom du PJ).
// Chef de projet : mêmes lignes grisées, jours occupés rayés sans nom de PJ ; ses propres demandes nommées ; « + » sur un jour libre.
const ZOOMS = [16, 24, 34, 48, 64];
const addDaysIso = (isoD, n) => { const d = new Date(isoD + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const hatch = (c, bg) => "repeating-linear-gradient(135deg, " + c + " 0 4px, " + (bg || "transparent") + " 4px 8px)";
const isWE = d => { const w = new Date(d + "T12:00:00").getDay(); return w === 0 || w === 6; };
// v335 (demandé : « voir le samedi et le dimanche dans le calendrier SAV ») : tous les jours, week-ends plus étroits (55 %) et grisés.
// Positions en pixels : X[i] = bord gauche du jour i, WD[i] = sa largeur.
function DayHeader({ days, X, WD, labW, W, t0 }) {
  const band = (items, render, h, sticky) => <div style={{ display: "flex", height: h }}>{items.map(it => { const w = X[it.i + it.n - 1] + WD[it.i + it.n - 1] - X[it.i];
    return <div key={it.k + "-" + it.i} style={{ width: w, flexShrink: 0, boxSizing: "border-box", borderLeft: "1px solid " + T.line, padding: "0 6px", display: "flex", alignItems: "center", overflow: sticky ? "visible" : "hidden", whiteSpace: "nowrap" }}>{render(it, w)}</div>; })}</div>;
  return <div style={{ display: "flex", borderBottom: "1px solid " + T.line, background: T.surface, position: "sticky", top: 0, zIndex: 3, width: W }}>
    <div style={{ width: labW, flexShrink: 0, position: "sticky", left: 0, zIndex: 4, background: T.surface, borderRight: "1px solid " + T.line }} />
    <div>
      {band(runs(days, d => d.slice(0, 7)), it => <b style={{ fontSize: 13, fontWeight: 500, color: T.ink900, position: "sticky", left: labW + 6 }}>{monthName(it.d)}</b>, 26, true)}
      {band(runs(days, d => mondayOf(d)), (it, w) => <span style={{ fontSize: 12, fontWeight: 500, color: T.ink500 }}>S{isoWeek(it.d)}{w >= 120 ? " · du " + fd(mondayOf(it.d)) : ""}</span>, 22)}
      <div style={{ display: "flex", borderTop: "1px solid " + T.line }}>{days.map((d, i) => { const wd = new Date(d + "T12:00:00").getDay(), today = d === t0, we = wd === 0 || wd === 6;
        return <div key={d} style={{ width: WD[i], flexShrink: 0, boxSizing: "border-box", borderLeft: (wd === 1 ? "2px solid " : "1px solid ") + T.line, textAlign: "center", padding: "3px 0", background: today ? T.amber100 : we ? T.surfaceAlt : undefined }}>
          {WD[i] >= 30 && <div style={{ fontSize: 12, color: today ? T.amber600 : T.ink500, fontWeight: 500 }}>{DOW[wd]}</div>}
          <div style={{ fontSize: WD[i] >= 28 ? 13 : 12, fontWeight: 600, color: today ? T.amber600 : we ? T.ink500 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{WD[i] >= 16 ? d.slice(8, 10) : ""}</div></div>; })}</div>
    </div></div>;
}
// ligne du planning : nom collé à gauche, piste à droite (hors du composant : pas de remontage pendant un glisser)
function SRow({ label, sub, children, h = 40, ink, labW, width, grey }) {
  return <div style={{ display: "flex", borderBottom: "1px solid " + T.line, width, minHeight: h, background: grey ? T.surface : undefined }}>
    <div style={{ width: labW, flexShrink: 0, position: "sticky", left: 0, zIndex: 2, background: grey ? T.surface : T.card, borderRight: "1px solid " + T.line, padding: "0 12px", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box" }}>
      <span style={{ fontSize: FZ.sm, fontWeight: 600, color: ink || T.ink900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>{sub && <span style={{ fontSize: 12, color: T.ink500 }}>{sub}</span>}</div>
    <div style={{ position: "relative", flex: 1, minHeight: h }}>{children}</div></div>;
}
// v335 (demandé : « les demandes des CdP ne sont pas assez claires : au lieu de répéter la case chaque jour, un long trait sur le nombre de jours ») :
// une barre par demande en attente, rangée sur des pistes sans chevauchement (première piste libre).
const laneUp = items => { const ends = []; return items.map(it => { let k = ends.findIndex(e => e < it.from); if (k < 0) { k = ends.length; ends.push(it.to); } else ends[k] = it.to; return { ...it, lane: k }; }); };
function PlanningView({ inters, demandes, techs, canEdit, nomOf, me, myPjs, onOpenInter, onTeam, onRequest, onAnswer, onCancel, onMove }) {
  const t0 = todayIso();
  const [z, setZ0] = useState(() => { try { const v = localStorage.getItem("enogia_sav_zoom"); return v != null && ZOOMS[+v] ? +v : 3; } catch (e) { return 3; } });
  const setZ = n => { const v = Math.max(0, Math.min(ZOOMS.length - 1, n)); setZ0(v); try { localStorage.setItem("enogia_sav_zoom", String(v)); } catch (e) { /* stockage indisponible */ } };
  const colPx = ZOOMS[z], labW = 170;
  const days = useMemo(() => { const out = []; let d = mondayOf(addDaysIso(t0, -56)); for (let k = 0; k < 7 * 36; k++) { out.push(d); d = addDaysIso(d, 1); } return out; }, [t0]);
  const N = days.length;
  const { X, WD, idxOf, W } = useMemo(() => { const X = [], WD = [], idxOf = {}; let x = 0; days.forEach((d, i) => { const w = isWE(d) ? Math.round(colPx * 0.55) : colPx; X.push(x); WD.push(w); idxOf[d] = i; x += w; }); return { X, WD, idxOf, W: labW + x }; }, [days, colPx]);
  const idxAt = px => { let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (X[m] <= px) lo = m; else hi = m - 1; } return lo; };
  const scRef = useRef(null), [vis, setVis] = useState([0, 0]), first = useRef(null);
  const onScroll = () => { const el = scRef.current; if (!el) return; const a = idxAt(el.scrollLeft), b = Math.max(a, idxAt(el.scrollLeft + el.clientWidth - labW - 1));
    first.current = days[a]; setVis(v => (v[0] === a && v[1] === b ? v : [a, b])); };
  const goToday = () => { const el = scRef.current; if (!el) return; const i = idxOf[t0] ?? days.findIndex(d => d >= t0); el.scrollLeft = Math.max(0, X[Math.max(0, i - 7)]); onScroll(); };
  const page = dir => { const el = scRef.current; if (el) el.scrollBy({ left: dir * Math.round((el.clientWidth - labW) * 0.85), behavior: smooth() }); };
  // à l'ouverture : la semaine passée à gauche ; au zoom : garder le premier jour visible
  useEffect(() => { const el = scRef.current; if (!el) return; if (first.current == null) goToday(); else { el.scrollLeft = X[idxOf[first.current] || 0]; onScroll(); } }, [colPx]); // eslint-disable-line react-hooks/exhaustive-deps
  const bars = planBars(inters, techs), load = dayLoad(inters, techs, days), loadOf = {}; load.forEach(x => { loadOf[x.d] = x; });
  const dems = Object.entries(demandes).map(([id, d]) => ({ id, ...d })).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const isMine = d => d.byEmail && me && d.byEmail.toLowerCase() === me.toLowerCase();
  const pend = dems.filter(d => d.st === "attente"), mine = dems.filter(isMine);
  const toPlan = Object.entries(inters).filter(([, i]) => i && i.st !== "Annulée" && (!i.a || !i.b || !i.resp || i.st === "À planifier") && !["Réalisée", "Validée", "Non validée"].includes(i.st));
  const [notes, setNotes] = useState({});
  const dnd = usePointerDnD();
  const pendBars = laneUp(pend.map(p => { const L = workDaysFrom(p.date, Math.max(1, +p.days || 1)); return { ...p, from: L[0], to: L[L.length - 1], n: L.length }; }).sort((a, b) => a.from.localeCompare(b.from)));
  const lanes = pendBars.reduce((m, b) => Math.max(m, b.lane + 1), 0), LANE = 24, demH = 8 + lanes * LANE + 30;
  const pendOn = d => pendBars.filter(p => p.from <= d && p.to >= d);
  // v335 : « Planifiée » = dates validées avec le client (barre pleine) ; « À planifier » avec dates = pas encore validée (barre en pointillés hachurée)
  const tentative = st => st === "À planifier";
  const barColor = st => st === "Réalisée" || st === "Validée" ? [T.emerald100, T.emerald600] : st === "En cours" ? [T.accentSoft || T.teal100, T.accentInk || T.teal600] : [T.info100, T.info600];
  const moveTo = (p, tech, day) => {
    const i = inters[p.id]; if (!i || !i.a || !i.b) return;
    const len = workCount(i.a, i.b), a = shiftWork(firstWork(day), -(p.grab || 0)), b = workDaysFrom(firstWork(a), len)[len - 1], patch = { a: firstWork(a), b };
    if (tech !== p.tech) { if (p.lead) { patch.resp = tech; patch.who = (i.who || []).filter(x => x !== tech); } else patch.who = [...new Set((i.who || []).map(x => (x === p.tech ? tech : x)))].filter(x => x !== i.resp); }
    if (patch.a === i.a && patch.b === i.b && tech === p.tech) return;
    onMove(p.id, patch);
  };
  const span = (from, to) => { if (to < days[0] || from > days[N - 1]) return null; const i0 = idxOf[from] ?? (from < days[0] ? 0 : null), i1 = idxOf[to] ?? (to > days[N - 1] ? N - 1 : null); return i0 == null || i1 == null || i1 < i0 ? null : [i0, i1]; };
  const pxOf = (i0, i1) => ({ left: X[i0] + 2, width: X[i1] + WD[i1] - X[i0] - 4 });
  const cellLine = d => { const i = idxOf[d]; return { position: "absolute", top: 0, bottom: 0, left: X[i], width: WD[i], boxSizing: "border-box", borderLeft: (new Date(d + "T12:00:00").getDay() === 1 ? "2px solid " : "1px solid ") + T.line }; };
  const todayBg = "color-mix(in srgb, " + T.amber100 + " 45%, transparent)";
  const dayBg = d => (d === t0 ? todayBg : isWE(d) ? hatch("color-mix(in srgb, " + T.ink300 + " 18%, transparent)", "transparent") : undefined);
  const fmtT = d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const title = days[vis[0]] ? fmtT(days[vis[0]]) + " → " + fmtT(days[vis[1]]) + " " + days[vis[1]].slice(0, 4) : "";
  const navBtn = { minWidth: 32, minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: "transparent", color: T.ink700, fontSize: FZ.md, fontWeight: 600, cursor: "pointer", fontFamily: T.font };
  const tools = <div className="e-tb" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + T.line, background: T.surface, flexWrap: "wrap" }}>
    <span aria-live="polite" style={{ fontFamily: T.fontDisplay, fontWeight: 300, fontSize: 20, letterSpacing: "-.01em", color: T.ink900, minWidth: 230, fontVariantNumeric: "tabular-nums" }}>{title}</span>
    <div style={{ display: "flex", gap: 4 }}><button type="button" onClick={() => page(-1)} title="Période précédente" aria-label="Période précédente" style={navBtn}>‹</button><button type="button" onClick={() => page(1)} title="Période suivante" aria-label="Période suivante" style={navBtn}>›</button></div>
    <span style={{ flex: 1 }} />
    {canEdit && <Btn size="sm" onClick={onTeam}>Équipe ({techs.length})</Btn>}
    <div style={{ display: "flex", gap: 4 }}><button type="button" onClick={() => setZ(z - 1)} disabled={z <= 0} aria-label="Dézoomer" title="Voir plus de jours" style={{ ...navBtn, color: z <= 0 ? T.ink300 : T.ink700, cursor: z <= 0 ? "default" : "pointer" }}>−</button>
      <button type="button" onClick={() => setZ(z + 1)} disabled={z >= ZOOMS.length - 1} aria-label="Zoomer" title="Agrandir les jours" style={{ ...navBtn, color: z >= ZOOMS.length - 1 ? T.ink300 : T.ink700, cursor: z >= ZOOMS.length - 1 ? "default" : "pointer" }}>+</button></div>
    <button type="button" onClick={goToday} className="enogia-btn-ind" style={{ minHeight: 32, padding: "0 12px", borderRadius: 8, border: "1.5px solid " + T.teal500, background: "transparent", color: T.teal600, fontSize: FZ.sm, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Aujourd'hui</button>
  </div>;
  const sw = (bg, extra) => <i aria-hidden="true" style={{ display: "inline-block", width: 22, height: 12, borderRadius: 4, background: bg, ...extra }} />;
  const legend = <div style={{ padding: "8px 14px", fontSize: 12, color: T.ink500, borderTop: "1px solid " + T.line, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
    {canEdit ? <>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(T.info100, { borderLeft: "3px solid " + T.info600 })}Planifiée (validée avec le client)</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(hatch(T.info100, T.card), { border: "1.5px dashed " + T.info600 })}À planifier (dates à confirmer)</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(hatch(T.amber100, T.card), { border: "1px dashed " + T.amber500 })}Demande d'un chef de projet en attente</span>
      <span>Glisser une barre : autre jour = autres dates, autre ligne = autre technicien ; un clic l'ouvre</span></>
    : <>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(hatch(T.ink300, T.surfaceAlt))}Équipe occupée</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(hatch(T.amber100, T.card), { border: "1px dashed " + T.amber500 })}Demande en attente</span>
      <span>« + » sur la ligne Demandes pour demander un jour ouvré libre</span></>}
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{sw(hatch("color-mix(in srgb, " + T.ink300 + " 18%, transparent)", T.card), { border: "1px solid " + T.line })}Samedi, dimanche</span>
  </div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden" }}>
      {tools}
      <div ref={scRef} onScroll={onScroll} style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ width: W }}>
          <DayHeader days={days} X={X} WD={WD} labW={labW} W={W} t0={t0} />
          {/* ligne Demandes : une barre par demande en attente ; « + » sur un jour ouvré non passé où un technicien est libre (jamais le week-end) */}
          <SRow labW={labW} width={W} label="Demandes" sub={pend.length ? pend.length + " en attente" : "« + » = demander"} h={demH}>
            {days.map(d => { const L = loadOf[d] || { free: 1, team: 0 }, waits = pendOn(d).length, past = d < t0, we = isWE(d), full = L.team > 0 && L.free - waits <= 0;
              return <div key={d} style={{ ...cellLine(d), background: dayBg(d), padding: "0 2px 3px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                {!past && !we && !full && <button type="button" onClick={() => onRequest(d)} title={"Demander une intervention le " + fdd(d)} aria-label={"Demander une intervention le " + fdd(d)}
                  style={{ width: "100%", minHeight: 22, borderRadius: 4, border: "1px dashed " + T.emerald500, background: "transparent", color: T.emerald600, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font, padding: 0, lineHeight: 1 }}>+</button>}
                {!past && !we && full && WD[idxOf[d]] >= 34 && <span style={{ fontSize: 12, color: T.ink500, textAlign: "center", lineHeight: "22px" }}>complet</span>}
              </div>; })}
            {pendBars.map(p => { const sp = span(p.from, p.to); if (!sp) return null; const named = canEdit || isMine(p), pos = pxOf(sp[0], sp[1]);
              const txt = named ? p.pj + " · " + (p.obj || "") : "Demande en attente";
              return <span key={p.id} title={(named ? "Demande en attente : " + p.pj + " · " + (p.obj || "") + (p.by ? " · " + p.by : "") : "Demande en attente d'un autre chef de projet") + " · " + fd(p.from) + " → " + fd(p.to) + " (" + p.n + " j)"}
                style={{ position: "absolute", top: 6 + p.lane * LANE, height: LANE - 4, ...pos, boxSizing: "border-box", borderRadius: 4, border: "1px dashed " + T.amber500, background: hatch(T.amber100, T.card), color: T.amber600, fontSize: 12, fontWeight: 500, lineHeight: (LANE - 6) + "px", padding: "0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "auto" }}>{pos.width >= 60 ? txt : ""}</span>; })}
          </SRow>
          {techs.length ? techs.map(tc => <SRow labW={labW} width={W} key={tc} label={tc} ink={canEdit ? T.ink900 : T.ink500} grey={!canEdit} h={canEdit ? 40 : 32}>
            {days.map(d => <div key={d} {...(canEdit ? dnd.dropProps(tc + "|" + d, p => !!p, p => moveTo(p, tc, d)) : {})} style={{ ...cellLine(d), background: dnd.over === tc + "|" + d ? T.amber100 : dayBg(d) }} />)}
            {(bars[tc] || []).map(b => { const sp = span(b.from, b.to); if (!sp) return null; const [i0, i1] = sp, pos = pxOf(i0, i1);
              const base = { position: "absolute", top: canEdit ? 5 : 6, bottom: canEdit ? 5 : 6, ...pos, borderRadius: 4, boxSizing: "border-box" };
              if (!canEdit) return <span key={b.id} title="Occupé" aria-label={"Occupé du " + fd(b.from) + " au " + fd(b.to)} style={{ ...base, background: hatch(T.ink300, T.surfaceAlt), opacity: tentative(b.st) ? 0.45 : 0.7 }} />;
              const [bg, ink] = barColor(b.st), tent = tentative(b.st), payload = { id: b.id, tech: tc, lead: b.lead, grab: 0 }, dp = dnd.dragProps(payload);
              return <button key={b.id} type="button" {...dp} onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(), n = workCount(days[i0], days[i1]); payload.grab = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n))) + (b.from < days[0] ? workCount(b.from, days[0]) - 1 : 0); dp.onPointerDown(e); }}
                onClick={() => onOpenInter(b.id)} title={b.id + " · " + b.pj + " · " + (nomOf(b.pj) || "") + " · " + fd(b.from) + " → " + fd(b.to) + (b.lead ? "" : " (appui)") + (tent ? " · à planifier : dates à confirmer avec le client" : " · planifiée")}
                style={{ ...base, border: tent ? "1.5px dashed " + ink : "none", borderLeft: tent ? "1.5px dashed " + ink : "3px solid " + ink, background: tent ? hatch(bg, T.card) : bg, color: ink, fontSize: 12, fontWeight: 500, textAlign: "left", padding: "0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "grab", fontFamily: T.font, opacity: b.lead ? 1 : 0.8, pointerEvents: dnd.drag ? "none" : "auto" }}>{b.pj}{pos.width > 120 ? " · " + (nomOf(b.pj) || b.id) : ""}{tent && pos.width > 200 ? " · à confirmer" : ""}{b.lead ? "" : " (appui)"}</button>; })}
          </SRow>)
          : <div style={{ padding: 12, position: "sticky", left: 0, width: "min(100%, 600px)" }}><EmptyState compact icon="manager" title="Aucun technicien enregistré" hint={canEdit ? "« Équipe » pour ajouter les techniciens SAV." : "Les demandes restent possibles : le responsable SAV répond."} /></div>}
        </div>
      </div>
      {legend}
    </div>
    {canEdit ? <>
      <Panel level={2} title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>Demandes des chefs de projet {pend.length > 0 && <Pill tone="warn">{pend.length}</Pill>}</span>}>
        {dems.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune demande pour l'instant</div> : dems.slice(0, 12).map(d => <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
          <PjPlate pj={d.pj} /><span style={{ flex: "1 1 260px", minWidth: 0, fontSize: FZ.sm, color: T.ink900 }}>{d.obj || "—"}<div style={{ fontSize: 12, color: T.ink500 }}>{nomOf(d.pj)} · demandé par {d.by || "—"} · à partir du {fdd(d.date)} · {d.days || 1} j</div></span>
          {d.st === "attente" ? <>
            <input value={notes[d.id] || ""} onChange={e => setNotes(n => ({ ...n, [d.id]: e.target.value }))} placeholder="Réponse (facultative)" aria-label={"Réponse à la demande " + d.pj} style={{ ...inp(), width: 200 }} />
            <Btn size="sm" onClick={() => onAnswer(d.id, d, false, notes[d.id])}>Refuser</Btn><Btn v="pri" size="sm" onClick={() => onAnswer(d.id, d, true, notes[d.id])}>Accepter</Btn></>
            : <Pill tone={d.st === "ok" ? "ok" : "bad"}>{d.st === "ok" ? "Acceptée" + (d.iid ? " · " + d.iid : "") : "Refusée"}</Pill>}</div>)}
        {pend.length > 0 && <div style={{ fontSize: 12, color: T.ink500, maxWidth: "75ch" }}>Accepter crée le ticket et une intervention « à planifier » aux dates demandées ; cochez « Dates validées avec le client » dans l'intervention quand c'est confirmé</div>}
      </Panel>
      <Panel level={2} title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>À planifier {toPlan.length > 0 && <Pill tone="warn">{toPlan.length}</Pill>}</span>}>
        {toPlan.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Toutes les interventions sont planifiées et validées avec le client</div> : toPlan.map(([id, i]) => <div key={id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><PjPlate pj={i.pj} /><span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm }}>{i.obj || "—"}</span>
          <span style={{ fontSize: 12, color: T.ink500 }}>{!i.a || !i.b ? "sans dates" : !i.resp ? "sans technicien" : fd(i.a) + " → " + fd(i.b) + " · à confirmer avec le client"}</span><Btn v="sec" size="sm" onClick={() => onOpenInter(id)}>{!i.a || !i.b || !i.resp ? "Planifier" : "Ouvrir"}</Btn></div>)}
      </Panel></>
    : <Panel level={2} title="Mes demandes">
      {mine.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Vous n'avez pas encore fait de demande. Cliquez sur « + » dans la ligne Demandes du planning.</div> : mine.map(d => <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
        <PjPlate pj={d.pj} /><span style={{ flex: "1 1 260px", minWidth: 0, fontSize: FZ.sm }}>{d.obj || "—"}<div style={{ fontSize: 12, color: T.ink500 }}>à partir du {fdd(d.date)} · {d.days || 1} j{d.note ? " · « " + d.note + " »" : ""}</div></span>
        <Pill tone={d.st === "ok" ? "ok" : d.st === "ko" ? "bad" : "warn"}>{DEM_STATUS[d.st] || d.st}</Pill>
        {d.st === "attente" && <Btn size="sm" onClick={() => onCancel(d.id)}>Retirer</Btn>}</div>)}
      {!(myPjs && myPjs.length) && <div style={{ fontSize: 12, color: T.ink500 }}>Aucun PJ ne vous est associé : la demande proposera tous les PJ</div>}
    </Panel>}
  </div>;
}
function DemandeDialog({ init, pjs, nomOf, onClose, onSave }) {
  const [d, setD] = useState(init); const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  return <Modal title={"Demander une intervention · " + fdd(d.date)} onClose={onClose} width={560}>
    <div style={grid2}>
      <Field l="PJ"><select value={d.pj} onChange={e => set("pj", e.target.value)} style={inp()}><option value="">Choisir…</option>{pjs.map(p => <option key={p} value={p}>{p}{nomOf(p) ? " · " + nomOf(p) : ""}</option>)}</select></Field>
      <Field l="Nombre de jours"><input type="number" min={1} max={20} value={d.days} onChange={e => set("days", Math.max(1, +e.target.value || 1))} style={inp()} /></Field>
      <Field l="Type de demande"><select value={d.type} onChange={e => set("type", e.target.value)} style={inp()}>{TICKET_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field l="Objectif de l'intervention" span><textarea value={d.obj} onChange={e => set("obj", e.target.value)} rows={3} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    </div>
    <div style={{ fontSize: 12, color: T.ink500 }}>Le responsable SAV accepte ou refuse ; s'il accepte, un ticket et une intervention sont créés à ces dates.</div>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={onClose}>Annuler</Btn><Btn v="pri" size="sm" disabled={!d.pj || !String(d.obj || "").trim()} onClick={() => onSave(d)}>Envoyer la demande</Btn></div>
  </Modal>;
}
function TeamDialog({ techs, onClose, onSave }) {
  const [txt, setTxt] = useState(techs.join("\n"));
  return <Modal title="Équipe SAV" onClose={onClose} width={480}>
    <Field l="Un technicien par ligne (nom tel qu'il apparaîtra dans le planning)"><textarea value={txt} onChange={e => setTxt(e.target.value)} rows={8} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={onClose}>Annuler</Btn><Btn v="pri" size="sm" onClick={() => onSave([...new Set(txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean))])}>Enregistrer</Btn></div>
  </Modal>;
}

/* ── KPI ── */
// v332 (demandé : « des KPI sur l'affectation des personnes, interventions, tickets et finance ») — skill kpi-dashboard-design :
// chaque bloc répond à une question, chiffres avec leur période, une couleur par graphique (rouge = à surveiller), tableau des personnes.
const shortM = m => new Date(m + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
function KTile({ l, v, sub, tone }) {
  return <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, color: T.ink500 }}>{l}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 28, letterSpacing: "-0.02em", fontWeight: 500, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", color: tone === "bad" ? T.red600 : tone === "ok" ? T.emerald600 : T.ink900 }}>{v == null ? "—" : v}</div>
    {sub && <div style={{ fontSize: 12, color: T.ink500 }}>{sub}</div>}</div>;
}
const KRow = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>{children}</div>;
function HBars({ items, fmt = v => v, color }) {
  const max = Math.max(1, ...items.map(x => x[1]));
  if (!items.length) return <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Rien sur la période</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map(([l, v]) => <div key={l} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr auto", gap: 8, alignItems: "center", fontSize: FZ.sm }}>
    <span style={{ color: T.ink700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l}>{l}</span>
    <span style={{ height: 10, background: T.surfaceAlt, borderRadius: 4, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: (v / max * 100) + "%", background: color || T.dv1 }} /></span>
    <span style={{ fontVariantNumeric: "tabular-nums", color: T.ink900, minWidth: 48, textAlign: "right" }}>{fmt(v)}</span></div>)}</div>;
}
function MonthCols({ months, series, fmt = v => v, h = 120 }) {
  const max = Math.max(1, ...months.flatMap(m => series.map(s => s.get(m))));
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + months.length + ", 1fr)", gap: 6, alignItems: "end", height: h, borderBottom: "1px solid " + T.line }}>
      {months.map(m => <div key={m} title={shortM(m) + " : " + series.map(s => s.l + " " + fmt(s.get(m))).join(" · ")} style={{ display: "flex", gap: 2, alignItems: "end", height: "100%", justifyContent: "center" }}>
        {series.map(s => <i key={s.l} style={{ display: "block", width: series.length > 1 ? "40%" : "60%", maxWidth: 22, height: Math.max(s.get(m) ? 2 : 0, s.get(m) / max * (h - 4)), background: s.c }} />)}</div>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + months.length + ", 1fr)", gap: 6, fontSize: 12, color: T.ink500, textAlign: "center", marginTop: 4 }}>{months.map(m => <span key={m}>{shortM(m)}</span>)}</div>
    {series.length > 1 && <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.ink500, marginTop: 6 }}>{series.map(s => <span key={s.l} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i style={{ width: 10, height: 10, background: s.c, display: "inline-block" }} />{s.l}</span>)}</div>}
  </div>;
}
function SavKpiView({ doc, techs, canCost, nomOf }) {
  const S = useMemo(() => savStats(doc, techs), [doc, techs]);
  const P = S.people, I = S.inters, Tk = S.tickets, F = S.finance, pct = v => (v == null ? null : v + " %");
  const occ = p => Math.round(p.past / S.workdays * 100);
  const period = "depuis le " + fd(S.from) + "/" + S.from.slice(2, 4);
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <Panel level={2} title="Affectation de l'équipe" right={<span style={{ fontSize: 12, color: T.ink500 }}>jours d'intervention (jours ouvrés, responsable ou en appui) {period} · à venir = 90 prochains jours</span>}>
      {P.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun technicien ni intervention</div> :
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={tableTh()}>Personne</th><th style={{ ...tableTh(), width: "34%" }}>Jours sur site (12 mois)</th><th style={tableTh({ num: true })}>Occupation</th><th style={tableTh({ num: true })}>À venir (90 j)</th><th style={tableTh({ num: true })}>Responsable</th><th style={tableTh({ num: true })}>En appui</th></tr></thead>
        <tbody>{P.map(p => { const maxD = Math.max(1, ...P.map(x => x.past)); return <tr key={p.name}>
          <td style={tableTd({ ink: T.ink900 })}>{p.name}</td>
          <td style={tableTd()}><span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ flex: 1, height: 10, background: T.surfaceAlt, borderRadius: 4, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: (p.past / maxD * 100) + "%", background: T.dv1 }} /></span><span style={{ fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right", color: T.ink900 }}>{p.past} j</span></span></td>
          <td style={tableTd({ num: true })}>{occ(p)} %</td>
          <td style={tableTd({ num: true, ink: p.next ? T.ink900 : T.ink500 })}>{p.next} j</td>
          <td style={tableTd({ num: true })}>{p.lead}</td><td style={tableTd({ num: true })}>{p.support}</td></tr>; })}</tbody></table></div>}
      <div style={{ fontSize: 12, color: T.ink500 }}>Occupation = jours sur site ÷ {S.workdays} jours ouvrés de la période</div>
    </Panel>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 12 }}>
      <Panel level={2} title="Interventions" right={<span style={{ fontSize: 12, color: T.ink500 }}>{period}</span>}>
        <KRow><KTile l="Sur la période" v={I.count} sub={I.done + " réalisées"} /><KTile l="À venir" v={I.upcoming} /><KTile l="À planifier" v={I.toPlan} tone={I.toPlan ? "bad" : null} sub="sans dates ou sans technicien" />
          <KTile l="Durée moyenne" v={I.avgDays == null ? null : String(I.avgDays).replace(".", ",") + " j"} /><KTile l="Réussite" v={pct(I.success)} sub="parmi les clôtures renseignées" />
          <KTile l="Préparation complète" v={pct(I.prepFull)} /><KTile l="Clôture complète" v={pct(I.cloFull)} tone={I.cloFull != null && I.cloFull < 80 ? "bad" : null} /></KRow>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.ink700 }}>Par type</div>
        <HBars items={I.byType} />
      </Panel>
      <Panel level={2} title="Tickets" right={<span style={{ fontSize: 12, color: T.ink500 }}>{period}</span>}>
        <KRow><KTile l="Ouverts" v={Tk.open} sub={Tk.high + " en priorité haute"} /><KTile l="Ouverts depuis plus de 30 j" v={Tk.over30} tone={Tk.over30 ? "bad" : null} />
          <KTile l="Reçus / clos" v={Tk.opened + " / " + Tk.closed} /><KTile l="Délai moyen de traitement" v={Tk.avgDays == null ? null : Tk.avgDays + " j"} /><KTile l="Satisfaction client" v={Tk.satisf == null ? null : String(Tk.satisf).replace(".", ",") + " / 5"} /></KRow>
        <MonthCols months={S.months} series={[{ l: "Reçus", c: T.dv1, get: m => (Tk.byMonth.find(x => x.m === m) || {}).opened || 0 }, { l: "Clos", c: T.dv2, get: m => (Tk.byMonth.find(x => x.m === m) || {}).closed || 0 }]} />
        <div style={{ fontSize: 12, fontWeight: 500, color: T.ink700 }}>Par type de demande</div>
        <HBars items={Tk.byType} color={T.dv2} />
      </Panel>
    </div>
    {canCost && <Panel level={2} title="Finance" right={<span style={{ fontSize: 12, color: T.ink500 }}>coûts saisis dans les interventions (mois d'arrivée sur site) {period}</span>}>
      <KRow><KTile l="Coût des interventions" v={eur(F.total)} /><KTile l="Coût moyen d'une intervention" v={eur(F.perInter)} sub="interventions avec des coûts saisis" />
        <KTile l="Contrats de maintenance en cours" v={F.contracts} /><KTile l="Forfaits annuels des contrats" v={eur(F.forfaits)} /></KRow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div><div style={{ fontSize: 12, fontWeight: 500, color: T.ink700, marginBottom: 6 }}>Coûts par mois</div><MonthCols months={S.months} fmt={eur} series={[{ l: "Coûts", c: T.dv3, get: m => (F.byMonth.find(x => x.m === m) || {}).v || 0 }]} /></div>
        <div><div style={{ fontSize: 12, fontWeight: 500, color: T.ink700, marginBottom: 6 }}>Par poste</div><HBars items={F.byField} fmt={eur} color={T.dv3} />
          <div style={{ fontSize: 12, fontWeight: 500, color: T.ink700, margin: "12px 0 6px" }}>Projets les plus coûteux</div><HBars items={F.byPj.map(([pj, v]) => [pj + (nomOf(pj) ? " · " + nomOf(pj) : ""), v])} fmt={eur} color={T.dv3} /></div>
      </div>
    </Panel>}
  </div>;
}

/* ── Parc ── */
function ParcView({ rows, metaOf, parc, tickets, canEdit, onEdit, onOpenPj, fournTypes, onTypes }) {
  const [filt, setFilt] = useState("all"), [q, setQ] = useState("");
  const all = parcOf(rows, metaOf, parc, tickets);
  const L = all.filter(p => filt === "all" || (filt === "ctr" ? p.info.contrat && p.info.contrat !== "Sans contrat" : !p.info.contrat || p.info.contrat === "Sans contrat"))
    .filter(p => !q || (p.pj + " " + p.nom + " " + p.pays + " " + (p.info.ville || "") + " " + p.sn.join(" ") + " " + fournLabel(p.info.fourn)).toLowerCase().includes(q.toLowerCase()));
  const { sorted, sort, setSort } = useSort(L, P_SORT);
  return <><WorldMap points={mapPoints(all)} onPick={pj => setQ(pj)} />
    <Panel level={2} title={"Parc ORC (" + all.length + " projets)"} pad={0} right={<div style={{ display: "flex", gap: 8, padding: "10px 12px 0 0", flexWrap: "wrap" }}>
    <Segmented label="Filtrer le parc" value={filt} onChange={setFilt} options={[["all", "Tous"], ["ctr", "Avec contrat"], ["no", "Sans contrat"]]} />
    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un S/N, une fourniture…" aria-label="Rechercher dans le parc" style={{ ...inp(), width: 240 }} />
    {canEdit && onTypes && <Btn size="sm" onClick={onTypes} title={"Types proposés : " + fournTypes.join(", ")}>Types de fournitures</Btn>}</div>}>
    {L.length === 0 ? <EmptyState compact icon="gauge" title="Aucun projet" hint="Le parc se remplit avec les machines expédiées du planning ; « ＋ Projet du parc » pour les machines plus anciennes." /> :
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <SortHead sort={sort} onSort={setSort} cols={[["pj", "PJ"], ["pays", "Lieu"], ["orc", "ORC"], ["fourn", "Fournitures ENOGIA"], ["mes", "Mise en service"], ["app", "Application"], ["ctr", "Contrat"], ["prev", "Prochaine préventive"], ["open", "Tickets ouverts", true]]} />
      <tbody>{sorted.map(p => { const c = p.info.contrat;
        return <tr key={p.pj} onClick={() => (canEdit ? onEdit(p.pj, { ...p.info, pays: p.info.pays || p.pays }) : onOpenPj && onOpenPj(p.pj))} className="e-hov" style={{ cursor: "pointer", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><PjPlate pj={p.pj} /> <span style={{ color: T.ink900 }}>{p.nom}</span>{p.manuel && <span style={{ marginLeft: 6 }}><Pill tone="muted">hors planning</Pill></span>}</td>
          <td style={tableTd()}>{[p.info.ville, p.pays].filter(Boolean).join(", ") || "—"}</td><td style={tableTd()}>{p.gammes.join(", ") || "—"}</td>
          <td style={tableTd({ wrap: true })}>{fournLabel(p.info.fourn) || "—"}</td>
          <td style={tableTd()}>{p.info.mes ? fd(p.info.mes) + "/" + String(p.info.mes).slice(2, 4) : p.depart ? "partie le " + fd(p.depart) : "—"}</td>
          <td style={tableTd()}>{p.info.application || "—"}</td>
          <td style={tableTd()}>{c && c !== "Sans contrat" ? <><Pill tone={p.info.contratStatut === "En cours" ? "ok" : "warn"}>{c}</Pill> <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.ink500 }}>{p.info.contratNo || ""}</span></> : <Pill tone="muted">Sans contrat</Pill>}</td>
          <td style={tableTd()}>{p.info.preventive ? fd(p.info.preventive) + "/" + String(p.info.preventive).slice(2, 4) : "—"}</td>
          <td style={tableTd({ num: true, ink: p.ouverts ? T.ink900 : T.ink500 })}>{p.ouverts}</td></tr>; })}</tbody></table></div>}
  </Panel></>;
}
// v336 (demandé : « la carte du parc ne doit pas suivre le choix clair / sombre : mettre une carte comme Google Maps ») : vraie carte routière
// (Leaflet 1.9.4 depuis jsdelivr + fond OpenStreetMap standard, sans clé, chargés à l'ouverture du Parc ; CARTO demande une clé), toujours claire :
// couleurs prises dans la palette claire du thème (buildPalette). Google Maps lui-même demande une clé d'API Google (compte Google Cloud).
// Vue large (zoom < 5) = une bulle par pays (clic = zoom sur le pays) ; plus près = un point par site avec son n° ; survol = fiche ;
// Ctrl + molette = zoom (la molette seule fait défiler la page) ; liste des sites de la zone affichée à droite, clic = centrer + filtrer.
let leafP = null;
function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (leafP) return leafP;
  leafP = new Promise((ok, ko) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"; sc.onload = () => ok(window.L); sc.onerror = e => { leafP = null; ko(e); }; document.head.appendChild(sc);
  });
  return leafP;
}
const MAP_REGIONS = [["monde", "Monde", [[-50, -150], [70, 170]]], ["europe", "Europe", [[35, -11], [61, 32]]], ["ameriques", "Amériques", [[-55, -125], [60, -35]]], ["afrique", "Afrique et Moyen-Orient", [[-35, -18], [38, 60]]], ["asie", "Asie et Océanie", [[-45, 62], [55, 178]]]];
const inBox = (p, b) => p.lat >= b[0][0] && p.lat <= b[1][0] && p.lon >= b[0][1] && p.lon <= b[1][1];
const escH = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function WorldMap({ points, onPick }) {
  const LP = useMemo(() => buildPalette(getThemeId(), false), []); // palette claire : la carte ne suit pas le mode sombre
  const el = useRef(null), mapR = useRef(null), layerR = useRef(null), [ready, setReady] = useState(false), [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(2), [bounds, setBounds] = useState(null), [reg, setReg] = useState("monde"), [selPj, setSelPj] = useState(null), [hover, setHover] = useState(null);
  const ctrOk = p => p.info && p.info.contrat && p.info.contrat !== "Sans contrat";
  const dotCol = p => (p.ouverts ? LP.red600 : ctrOk(p) ? LP.emerald600 : LP.info600);
  // création de la carte (une fois)
  useEffect(() => { let on = true;
    loadLeaflet().then(L => { if (!on || !el.current || mapR.current) return;
      const m = L.map(el.current, { center: [30, 10], zoom: 2, minZoom: 2, maxZoom: 17, worldCopyJump: true, scrollWheelZoom: false, zoomSnap: 0.5 });
      // v338 (demandé : « tous les noms des villes en français ») : fond OpenStreetMap France (noms en français quand ils existent)
      L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", { subdomains: "abc", maxZoom: 19, attribution: "© OpenStreetMap France · © contributeurs OpenStreetMap" }).addTo(m);
      const upd = () => { setZoom(m.getZoom()); const b = m.getBounds(); setBounds([[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]); };
      m.on("moveend zoomend", upd); upd();
      const wh = e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); m.setZoom(m.getZoom() + (e.deltaY < 0 ? 1 : -1)); };
      el.current.addEventListener("wheel", wh, { passive: false });
      mapR.current = m; layerR.current = L.layerGroup().addTo(m); setReady(true);
      setTimeout(() => m.invalidateSize(), 50);
    }).catch(() => { if (on) setErr(true); });
    return () => { on = false; if (mapR.current) { mapR.current.remove(); mapR.current = null; } };
  }, []);
  const groups = useMemo(() => { const g = {}; points.forEach(p => { const c = p.pays || "—"; (g[c] = g[c] || []).push(p); });
    return Object.entries(g).map(([pays, L]) => ({ pays, L, lat: L.reduce((s, p) => s + p.lat, 0) / L.length, lon: L.reduce((s, p) => s + p.lon, 0) / L.length, open: L.reduce((s, p) => s + (p.ouverts || 0), 0) })); }, [points]);
  const near = zoom >= 5;
  const fitPts = L0 => { const m = mapR.current, L = window.L; if (!m || !L0.length) return; m.fitBounds(L.latLngBounds(L0.map(p => [p.lat, p.lon])).pad(0.6), { maxZoom: 9 }); };
  const pick = p => { setSelPj(p.pj); setReg(""); onPick(p.pj); if (mapR.current) mapR.current.setView([p.lat, p.lon], Math.max(mapR.current.getZoom(), 8)); };
  // marqueurs (redessinés à chaque changement de zoom, de sélection ou de données)
  useEffect(() => { const m = mapR.current, lay = layerR.current, L = window.L; if (!ready || !m || !lay || !L) return; lay.clearLayers();
    const font = "font-family:" + T.font + ";";
    if (!near) groups.forEach(g => { const n = g.L.length, s = Math.round(26 + Math.min(22, Math.sqrt(n) * 7));
      const html = '<div style="' + font + "width:" + s + "px;height:" + s + "px;border-radius:50%;display:grid;place-items:center;background:" + LP.ink900 + ";color:" + LP.card + ";font-weight:700;font-size:13px;box-shadow:0 0 0 " + (g.open ? 3 : 2) + "px " + (g.open ? LP.red600 : LP.card) + ",0 4px 12px rgba(16,24,40,.28)\">" + n + "</div>";
      const mk = L.marker([g.lat, g.lon], { icon: L.divIcon({ html, className: "", iconSize: [s, s], iconAnchor: [s / 2, s / 2] }), keyboard: true, title: g.pays + " : " + n + " site" + (n > 1 ? "s" : "") });
      mk.bindTooltip(escH(g.pays) + " · " + n + " site" + (n > 1 ? "s" : "") + (g.open ? " · " + g.open + " ticket" + (g.open > 1 ? "s" : "") + " ouvert" + (g.open > 1 ? "s" : "") : ""), { direction: "top", offset: [0, -s / 2] });
      mk.on("click", () => { setReg(""); fitPts(g.L); }); mk.addTo(lay); });
    else points.forEach(p => { const on = selPj === p.pj || hover === p.pj, c = dotCol(p), d = on ? 16 : 12;
      const html = '<div style="' + font + 'display:flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:' + d + "px;height:" + d + "px;border-radius:50%;background:" + c + ";box-shadow:0 0 0 2px " + LP.card + ",0 0 0 " + (on ? 7 : 5) + "px " + c + '33;flex-shrink:0"></span><span style="font-size:12px;font-weight:700;color:' + LP.ink900 + ";background:" + LP.card + ";border-radius:4px;padding:1px 5px;box-shadow:0 1px 3px rgba(16,24,40,.25)\">" + escH(p.pj) + "</span></div>";
      const mk = L.marker([p.lat, p.lon], { icon: L.divIcon({ html, className: "", iconSize: [80, 20], iconAnchor: [d / 2, 10] }), keyboard: true, title: p.pj + (p.nom ? " · " + p.nom : ""), zIndexOffset: on ? 1000 : 0 });
      const card = '<div style="' + font + 'min-width:200px"><b>' + escH(p.pj) + (p.nom ? " · " + escH(p.nom) : "") + '</b><div style="color:' + LP.ink500 + '">' + escH([p.info && p.info.ville, p.pays].filter(Boolean).join(", ") || "lieu inconnu") + (p.exact ? "" : " (centre du pays)") + "</div><div>" + (ctrOk(p) ? escH(p.info.contrat) : "Sans contrat") + (p.ouverts ? ' · <span style="color:' + LP.red600 + '">' + p.ouverts + " ticket" + (p.ouverts > 1 ? "s" : "") + "</span>" : "") + "</div>" + (fournLabel(p.info && p.info.fourn) ? '<div style="color:' + LP.ink700 + '">' + escH(fournLabel(p.info.fourn)) + "</div>" : "") + "</div>";
      mk.bindTooltip(card, { direction: "top", offset: [0, -10] });
      mk.on("click", () => pick(p)); mk.on("mouseover", () => setHover(p.pj)); mk.on("mouseout", () => setHover(null)); mk.addTo(lay); });
  }, [ready, near, groups, points, selPj, hover, LP]); // eslint-disable-line react-hooks/exhaustive-deps
  const goReg = id => { const R = MAP_REGIONS.find(x => x[0] === id); setReg(id); setSelPj(null); if (mapR.current) mapR.current.fitBounds(R[2]); };
  const listed = (bounds ? points.filter(p => inBox(p, bounds) || inBox({ ...p, lon: p.lon - 360 }, bounds) || inBox({ ...p, lon: p.lon + 360 }, bounds)) : points)
    .slice().sort((a, b) => (a.pays || "").localeCompare(b.pays || "") || a.pj.localeCompare(b.pj, "fr", { numeric: true }));
  const dotUi = p => (p.ouverts ? T.red600 : ctrOk(p) ? T.emerald600 : T.info600);
  return <Panel level={2} title={"Carte du parc (" + points.length + " sites)"} right={<span style={{ fontSize: 12, color: T.ink500 }}>{groups.length} pays</span>}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Régions">
      {MAP_REGIONS.map(([id, l, b]) => { const n = id === "monde" ? points.length : points.filter(p => inBox(p, b)).length, on = reg === id;
        return <button key={id} type="button" aria-pressed={on} onClick={() => goReg(id)} disabled={!n && id !== "monde"}
          style={{ minHeight: 32, padding: "0 12px", borderRadius: 999, border: "1px solid " + (on ? T.ink900 : T.line), background: on ? T.ink900 : T.card, color: on ? T.card : n ? T.ink700 : T.ink300, fontSize: 12, fontWeight: 500, cursor: n || id === "monde" ? "pointer" : "default", fontFamily: T.font }}>{l} <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>{n}</span></button>; })}</div>
    <div className="enogia-map-split" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 12, alignItems: "stretch" }}>
      {/* v338 : isolation = les couches de Leaflet (z-index 400 à 1000) restent sous le menu et les fenêtres du site */}
      <div style={{ position: "relative", zIndex: 0, isolation: "isolate", borderRadius: 12, overflow: "hidden", border: "1px solid " + T.line, background: LP.surfaceAlt }}>
        <div ref={el} role="region" aria-label={"Carte : " + points.length + " sites du parc"} style={{ width: "100%", height: "min(56dvh, 520px)", minHeight: 340, background: LP.surfaceAlt, colorScheme: "light" }} />
        {err && <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: FZ.sm, color: LP.ink500, background: LP.surfaceAlt }}>Carte indisponible (connexion) : la liste des sites reste à droite.</div>}
        <div style={{ position: "absolute", left: 10, bottom: 22, zIndex: 500, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: LP.ink700, background: LP.card, borderRadius: 8, padding: "4px 8px", boxShadow: LP.shadowSm, pointerEvents: "none" }}>
          {[[LP.emerald600, "Sous contrat"], [LP.info600, "Sans contrat"], [LP.red600, "Ticket ouvert"]].map(([c, l]) => <span key={l} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><i aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block" }} />{l}</span>)}</div>
      </div>
      <div style={{ border: "1px solid " + T.line, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "min(56dvh, 520px)", minHeight: 0 }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid " + T.line, background: T.surface, fontSize: 12, fontWeight: 500, color: T.ink700 }}>{listed.length} site{listed.length > 1 ? "s" : ""} dans la zone affichée</div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {listed.length === 0 ? <div style={{ padding: 12, fontSize: FZ.sm, color: T.ink500 }}>Aucun site ici : dézoomez ou choisissez une région</div> : listed.map((p, i) => { const on = selPj === p.pj || hover === p.pj, head = i === 0 || listed[i - 1].pays !== p.pays;
            return <React.Fragment key={p.pj}>{head && <div style={{ padding: "6px 12px 2px", fontSize: 12, fontWeight: 500, color: T.ink500 }}>{p.pays || "Pays inconnu"}</div>}
              <button type="button" onClick={() => pick(p)} onMouseEnter={() => setHover(p.pj)} onMouseLeave={() => setHover(null)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: "4px 12px", border: "none", borderLeft: "3px solid " + (on ? dotUi(p) : "transparent"), background: on ? T.surface : "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font }}>
                <i aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: dotUi(p), flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: FZ.sm, fontWeight: 600, color: T.ink900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pj}{p.nom ? " · " + p.nom : ""}</span>
                  <span style={{ display: "block", fontSize: 12, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(p.info && p.info.ville) || "ville non saisie"}{ctrOk(p) ? " · " + p.info.contrat : ""}{p.ouverts ? " · " + p.ouverts + " ticket" + (p.ouverts > 1 ? "s" : "") : ""}</span></span>
              </button></React.Fragment>; })}
        </div>
      </div>
    </div>
    <div style={{ fontSize: 12, color: T.ink500 }}>Clic sur une bulle = zoomer sur le pays ; clic sur un site (carte ou liste) = le centrer et filtrer le tableau ; glisser = déplacer, Ctrl + molette ou + / − = zoom ; sans ville saisie, le site est au centre du pays</div>
  </Panel>;
}

/* ── Reprise de l historique ── */
// v330 (demandé : « d'après le fichier Google Sheet, rajoute le passé dans le Cockpit ») : reprise unique de l'historique, depuis l'export
// Excel du fichier « [SAV] Tickets et interventions » (Fichier › Télécharger › Microsoft Excel). Ce qui existe déjà dans le Cockpit n'est pas écrasé.
function HistoryImport({ doc, api }) {
  const ready = useSheetJS(), ref = useRef(null), [prev, setPrev] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const read = async f => {
    if (!f || !window.XLSX) return;
    try { const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
      const sh = n => { const k = wb.SheetNames.find(x => x.trim().toLowerCase() === n.toLowerCase()); return k ? window.XLSX.utils.sheet_to_json(wb.Sheets[k], { header: 1, raw: true, defval: "" }) : []; };
      const hist = parseSavHistory({ Tickets_SAV: sh("Tickets_SAV"), Interventions: sh("Interventions"), Parc_Projets: sh("Parc_Projets"), Parc_ORC: sh("Parc_ORC"), Suivi_contrats: sh("Suivi_contrats") });
      setPrev({ name: f.name, plan: historyPlan(doc, hist) });
    } catch (e) { setMsg("Lecture impossible : " + (e && e.message)); }
  };
  const go = async () => { if (!prev) return; setBusy(true); const p = prev.plan;
    const ok = await api.merge({ tickets: p.tickets, inters: p.inters, parc: p.parc, techs: p.techs }); setBusy(false);
    if (ok) { setMsg("Historique repris : " + p.counts.tickets + " tickets, " + p.counts.inters + " interventions, " + p.counts.parc + " projets du parc."); setPrev(null); } };
  return <>
    <Btn size="sm" disabled={!ready} onClick={() => ref.current && ref.current.click()} title="Une seule fois : export Excel du fichier Google Sheets du SAV">Reprendre l'historique (fichier SAV)</Btn>
    <input ref={ref} type="file" accept=".xlsx,.xls" aria-label="Fichier Excel du SAV" style={{ display: "none" }} onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; read(f); }} />
    {msg && <span role="status" style={{ fontSize: 12, color: T.ink700, alignSelf: "center" }}>{msg}</span>}
    {prev && <Modal title="Reprendre l'historique du SAV" onClose={() => setPrev(null)} width={520}>
      <div style={{ fontSize: FZ.sm, color: T.ink900 }}>Fichier : <b>{prev.name}</b></div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: FZ.sm, color: T.ink700 }}>
        <li>{prev.plan.counts.tickets} tickets{prev.plan.counts.dejaT ? " (" + prev.plan.counts.dejaT + " déjà dans le Cockpit, gardés tels quels)" : ""}</li>
        <li>{prev.plan.counts.inters} interventions{prev.plan.counts.dejaI ? " (" + prev.plan.counts.dejaI + " déjà présentes, gardées)" : ""}</li>
        <li>{prev.plan.counts.parc} projets du parc (contrats, S/N, mises en service ; ce qui a été saisi dans le Cockpit l'emporte)</li>
        <li>Équipe : {prev.plan.techs.join(", ") || "—"}</li></ul>
      <div style={{ fontSize: 12, color: T.ink500 }}>Les coordonnées des clients (e-mail, téléphone) ne sont pas reprises.</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={() => setPrev(null)}>Annuler</Btn><Btn v="pri" size="sm" disabled={busy} onClick={go}>Reprendre l'historique</Btn></div>
    </Modal>}
  </>;
}

// v332 (demandé : « pour le placement sur la carte, juste le nom de la ville et du pays ») : la ville est cherchée sur OpenStreetMap
// (Nominatim, seulement la ville et le pays sont envoyés) à l'enregistrement ; trouvée = point sur la ville, sinon centre du pays.
async function geocode(ville, pays) {
  try {
    const u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&city=" + encodeURIComponent(ville) + (pays ? "&country=" + encodeURIComponent(pays) : "");
    const r = await fetch(u, { headers: { Accept: "application/json" } }); if (!r.ok) return null;
    const j = await r.json(); return j && j[0] ? { lat: Math.round(+j[0].lat * 1e4) / 1e4, lon: Math.round(+j[0].lon * 1e4) / 1e4 } : null;
  } catch (e) { return null; }
}
// v332 (demandé : « dans le parc, voir les fournitures ENOGIA (ORC, drycooler, conteneur…), pouvoir ajouter / supprimer des fournitures »)
function FournEditor({ list, types, canEdit, onChange }) {
  const L = Array.isArray(list) ? list : [];
  const set = (k, patch) => onChange(L.map((f, j) => (j === k ? { ...f, ...patch } : f)));
  const add = () => onChange([...L, { id: "f" + Date.now().toString(36), type: types[0] || "ORC", qte: 1 }]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {L.length === 0 && <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune fourniture enregistrée</div>}
    {L.map((f, k) => <div key={f.id || k} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1.2fr) 70px minmax(120px, 1fr) minmax(120px, 1fr) 32px", gap: 6, alignItems: "center" }}>
      <select value={f.type} onChange={e => set(k, { type: e.target.value })} disabled={!canEdit} aria-label="Fourniture" style={inp()}>{[...new Set([...types, f.type])].map(t => <option key={t}>{t}</option>)}</select>
      <input type="number" min={1} value={f.qte || 1} onChange={e => set(k, { qte: Math.max(1, +e.target.value || 1) })} disabled={!canEdit} aria-label="Quantité" style={inp()} />
      <input value={f.sn || ""} onChange={e => set(k, { sn: e.target.value })} disabled={!canEdit} placeholder="S/N, référence" aria-label="Numéro de série ou référence" style={inp()} />
      <input value={f.note || ""} onChange={e => set(k, { note: e.target.value })} disabled={!canEdit} placeholder="Note" aria-label="Note" style={inp()} />
      {canEdit ? <button type="button" onClick={() => onChange(L.filter((_, j) => j !== k))} aria-label={"Supprimer " + f.type} style={{ ...btn("ghost", "sm"), color: T.red600, padding: 0, minWidth: 32 }}><NavIcon name="trash" size={15} /></button> : <span />}</div>)}
    {canEdit && <div><Btn size="sm" onClick={add}>＋ Ajouter une fourniture</Btn></div>}
  </div>;
}
function TypesDialog({ types, onClose, onSave }) {
  const [txt, setTxt] = useState(types.join("\n"));
  return <Modal title="Types de fournitures ENOGIA" onClose={onClose} width={440}>
    <Field l="Un type par ligne (proposés dans la fiche du parc)"><textarea value={txt} onChange={e => setTxt(e.target.value)} rows={9} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    <div style={{ fontSize: 12, color: T.ink500 }}>Retirer un type ne supprime pas les fournitures déjà saisies avec ce type</div>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={onClose}>Annuler</Btn><Btn v="pri" size="sm" onClick={() => onSave([...new Set(txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean))])}>Enregistrer</Btn></div>
  </Modal>;
}
function ParcDialog({ pj: pj0, p: p0, isNew, canEdit, fournTypes, onClose, onSave }) {
  const [pj, setPj] = useState(pj0), [p, setP] = useState({ ...p0, sn: Array.isArray(p0.sn) ? p0.sn.join(", ") : p0.sn || "" }), [busy, setBusy] = useState(""); const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  const save = async () => {
    const out = { ...p, sn: String(p.sn || "").split(",").map(s => s.trim()).filter(Boolean), ville: String(p.ville || "").trim(), pays: String(p.pays || "").trim() };
    if (!out.ville) { out.lat = ""; out.lon = ""; }
    else if (out.ville !== (p0.ville || "") || out.pays !== (p0.pays || "") || p0.lat == null || p0.lat === "") {
      setBusy("Recherche de « " + out.ville + " » sur la carte…"); const g = await geocode(out.ville, out.pays);
      if (g) Object.assign(out, g); else { out.lat = ""; out.lon = ""; setBusy("Ville introuvable : le point sera au centre du pays"); await new Promise(r => setTimeout(r, 1400)); }
    }
    setBusy(""); onSave(pj, out);
  };
  return <Modal title={isNew ? "Projet du parc" : "Parc · " + pj} onClose={onClose} width={720}>
    <div style={grid2}>
      {isNew && <Field l="N° de projet (ex. PJ214)"><input value={pj} onChange={e => setPj(e.target.value.trim().toUpperCase())} style={inp()} /></Field>}
      {isNew && <Field l="Nom du projet"><input value={p.nom || ""} onChange={e => set("nom", e.target.value)} style={inp()} /></Field>}
      {isNew && <Field l="Type d'ORC (gamme)"><input value={p.gamme || ""} onChange={e => set("gamme", e.target.value)} style={inp()} /></Field>}
      <Field l="Ville du site (carte)"><input value={p.ville || ""} onChange={e => set("ville", e.target.value)} disabled={!canEdit} placeholder="ex. Marseille" style={inp()} /></Field>
      <Field l="Pays"><input value={p.pays || ""} onChange={e => set("pays", e.target.value)} disabled={!canEdit} placeholder="ex. France" style={inp()} /></Field>
      <Field l="S/N supplémentaires (séparés par des virgules)"><input value={p.sn} onChange={e => set("sn", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Date de mise en service"><input type="date" value={p.mes || ""} onChange={e => set("mes", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Application"><input value={p.application || ""} onChange={e => set("application", e.target.value)} disabled={!canEdit} placeholder="Biomasse, incinérateur…" style={inp()} /></Field>
      <Field l="Visitable"><select value={p.visitable || ""} onChange={e => set("visitable", e.target.value)} disabled={!canEdit} style={inp()}><option value="">—</option><option>Oui</option><option>Non</option></select></Field>
      <Field l="Contrat de maintenance"><select value={p.contrat || "Sans contrat"} onChange={e => set("contrat", e.target.value)} disabled={!canEdit} style={inp()}>{CONTRACTS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="N° de contrat"><input value={p.contratNo || ""} onChange={e => set("contratNo", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Statut du contrat"><select value={p.contratStatut || ""} onChange={e => set("contratStatut", e.target.value)} disabled={!canEdit} style={inp()}><option value="">—</option>{["En cours", "En attente de signature", "En attente de MES", "Suspendu", "Terminé"].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field l="Forfait annuel du contrat (€)"><input type="number" min={0} step={100} value={p.forfait ?? ""} onChange={e => set("forfait", e.target.value === "" ? null : +e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Prochaine préventive"><input type="date" value={p.preventive || ""} onChange={e => set("preventive", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Dispositions particulières" span><textarea value={p.notes || ""} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    </div>
    <Fold title="Fournitures ENOGIA" info={fournLabel(p.fourn) || "aucune"} open>
      <FournEditor list={p.fourn} types={fournTypes} canEdit={canEdit} onChange={v => set("fourn", v)} />
    </Fold>
    {busy && <div role="status" style={{ fontSize: 12, color: T.ink700 }}>{busy}</div>}
    {canEdit && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={onClose}>Annuler</Btn>
      <Btn v="pri" size="sm" disabled={!/^PJ\w+/i.test(pj || "") || !!busy} onClick={save}>Enregistrer</Btn></div>}
  </Modal>;
}

// Onglet SAV de la fiche d'un PJ (RowDetail) : tickets, interventions, contrat ; « Demander une intervention » / « Ouvrir dans SAV / MES »
export function SavPjTab({ pj, doc, dem, me, onOpenSav, onRequest }) {
  const D = doc || {}, base = String(pj).replace(/-\d+[A-Z]*$/, "");
  const same = p => p === pj || String(p || "").replace(/-\d+[A-Z]*$/, "") === base;
  const T0 = Object.entries(D.tickets || {}).filter(([, t]) => t && same(t.pj)).sort((a, b) => isClosed(a[1]) - isClosed(b[1]) || String(b[1].date || "").localeCompare(String(a[1].date || "")));
  const I0 = Object.entries(D.inters || {}).filter(([, i]) => i && same(i.pj)).sort((a, b) => String(b[1].a || "9").localeCompare(String(a[1].a || "9")));
  const P = (D.parc || {})[base] || (D.parc || {})[pj] || null;
  const mine = Object.entries((dem && dem.items) || {}).filter(([, d]) => d && same(d.pj) && d.st === "attente");
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {P && <div style={{ fontSize: FZ.sm, color: T.ink700 }}>Contrat : {P.contrat && P.contrat !== "Sans contrat" ? <><Pill tone={P.contratStatut === "En cours" ? "ok" : "warn"}>{P.contrat}</Pill> {P.contratNo || ""}{P.preventive ? " · prochaine préventive " + fd(P.preventive) : ""}</> : "sans contrat"}{P.mes ? " · mise en service " + fd(P.mes) : ""}</div>}
    <div><div style={{ fontSize: 12, fontWeight: 500, color: T.ink700, marginBottom: 4 }}>Tickets ({T0.length})</div>
      {T0.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun ticket</div> : T0.slice(0, 6).map(([id, t]) => <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><Pill tone={TYPE_TONE[t.type] || "neutral"}>{typeOf(t.type)[1]}</Pill>
        <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.det || ""}</span>
        {isClosed(t) ? <Pill tone="ok">clos</Pill> : <span style={{ fontSize: 12, color: T.ink500 }}>{flowOf(t.type)[t.step || 0]}</span>}</div>)}</div>
    <div><div style={{ fontSize: 12, fontWeight: 500, color: T.ink700, marginBottom: 4 }}>Interventions ({I0.length})</div>
      {I0.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune intervention</div> : I0.slice(0, 6).map(([id, i]) => <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm }}>{i.obj || ""}</span>
        <span style={{ fontSize: 12, color: T.ink500 }}>{i.a ? fd(i.a) + " → " + fd(i.b) : "à planifier"}{interTeam(i).length ? " · " + interTeam(i).join(", ") : ""}</span><Pill tone={ST_TONE[i.st] || "neutral"}>{i.st || "—"}</Pill></div>)}</div>
    {mine.length > 0 && <div style={{ fontSize: FZ.sm, color: T.amber600 }}>{mine.length} demande{mine.length > 1 ? "s" : ""} d'intervention en attente du responsable SAV.</div>}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{onRequest && <Btn v="pri" size="sm" onClick={onRequest}>Demander une intervention</Btn>}{onOpenSav && <Btn size="sm" onClick={onOpenSav}>Ouvrir dans SAV / MES →</Btn>}</div>
  </div>;
}

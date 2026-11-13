// v326 — page SAV / MES (demandes D1 à D6, maquette maquettes-design/v325-sav-mes.html validée : « Go tout faire »).
// Le Cockpit est l'outil du SAV (pas d'import) : Tickets · Interventions · Planning des équipes · Parc.
// Droits : level « w » / « a » = équipe SAV (tout modifier) ; « r » = lecture (chefs de projet, direction) + demander une intervention
// sur un jour libre, dans une vue du planning sur UNE seule ligne (demandé : « la vue chef de projet doit être une seule ligne »).
// Coûts des interventions visibles seulement si canCost (équipe SAV, direction, propriétaire).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { mapPoints, parseSavHistory, historyPlan } from "../savImport";
import { usePointerDnD } from "../pointerDrag";
import { T, FZ, btn } from "../theme";
import { getPjMeta } from "../pjMeta";
import { PlanSwitch } from "./PlanSwitch";
import { NavIcon, Panel, Pill, Btn, Segmented, PjPlate, tableTh, tableTd, EmptyState, PageHead, useSheetJS } from "./SharedUI";
import { stageSoft } from "../theme";
import { askConfirm } from "../confirm";
import { TICKET_TYPES, typeOf, flowOf, PRIOS, ORIGINS, INTER_TYPES, INTER_STATUS, PREP_ITEMS, CLO_ITEMS, COST_FIELDS, CONTRACTS, DEM_STATUS,
  nextTicketId, nextInterId, isClosed, ticketAge, interCost, interTeam, interDays, planBars, dayLoad, workDaysFrom, mondayOf,
  acceptDemande, parcOf, savKpis } from "../savModel";

const iso = d => { const x = new Date(d); return isNaN(x) ? "" : x.toISOString().slice(0, 10); };
const todayIso = () => iso(new Date());
const fd = s => (s ? String(s).slice(8, 10) + "/" + String(s).slice(5, 7) : "—");
const fdd = s => { if (!s) return "—"; const d = new Date(s + "T12:00:00"); return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }); };
const eur = v => (v ? Math.round(v).toLocaleString("fr-FR") + " €" : "—");
const TYPE_TONE = { cur: "bad", prev: "ok", mes: "info", dev: "neutral", qtech: "violet", qcom: "violet", audit: "accent", diag: "warn", autre: "neutral" };
const PRIO_TONE = { h: "bad", m: "warn", b: "muted" };
const ST_TONE = { "À planifier": "warn", Planifiée: "info", "En cours": "accent", Réalisée: "ok", Validée: "ok", "Non validée": "bad", Annulée: "muted" };
const lab = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: T.ink500, fontWeight: 600, minWidth: 0 };
const inp = () => ({ minHeight: 32, padding: "0 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, boxSizing: "border-box", width: "100%" });
const SUBS = [["tickets", "Tickets"], ["inters", "Interventions"], ["planning", "Planning des équipes"], ["parc", "Parc"]];
const DESC = { tickets: "Le ticket est la demande (le problème à régler) ; une intervention est un déplacement sur site pour le traiter", inters: "Interventions sur site : équipe, dates, préparation, clôture et coûts",
  planning: "Qui est où, à la semaine ou au mois ; demandes d'intervention des chefs de projet", parc: "Machines en service, contrats de maintenance et tickets ouverts" };

function Kpi({ l, v, tone }) {
  return <div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "10px 12px", minWidth: 0 }}>
    <div style={{ fontSize: 12, color: T.ink500 }}>{l}</div>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 26, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tone === "bad" ? T.red600 : tone === "warn" ? T.amber600 : T.ink900 }}>{v == null ? "—" : v}</div>
  </div>;
}
// v328 (demandé : « la gestion des étapes n'est pas claire sur le ticket ») : frise des étapes toujours visible ; l'équipe SAV clique une étape
// pour y placer le ticket ; « Passer à … » nomme l'étape suivante.
function StepFlow({ t, canEdit, onSet }) {
  const F = flowOf(t.type), cur = Math.min(t.step || 0, F.length - 1), closed = isClosed(t);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <ol aria-label={"Étapes du ticket (" + typeOf(t.type)[1] + ")"} style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
      {F.map((x, i) => { const done = i < cur || (closed && i === cur), now = i === cur && !closed;
        return <li key={x}><button type="button" disabled={!canEdit || i === cur} onClick={() => onSet(i)} aria-current={now ? "step" : undefined} title={canEdit && i !== cur ? "Placer le ticket à cette étape" : undefined}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 30, padding: "0 8px", borderRadius: 8, border: "1px solid " + (now ? T.amber500 : "transparent"), background: now ? T.amber100 : "transparent", color: now ? T.ink900 : done ? T.ink700 : T.ink500, fontSize: FZ.sm, fontWeight: now ? 700 : 500, textAlign: "left", cursor: canEdit && i !== cur ? "pointer" : "default", fontFamily: T.font }}>
          <span aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "inline-grid", placeItems: "center", fontSize: 11, fontWeight: 600, background: done ? T.emerald600 : now ? T.amber500 : T.surfaceAlt, color: done ? T.card : T.ink900 }}>{done ? "✓" : i + 1}</span>
          <span style={{ flex: 1 }}>{x}</span>{now && <span style={{ fontSize: 11, fontWeight: 600, color: T.amber600 }}>en cours</span>}</button></li>; })}
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
    {F.map((_, i) => <i key={i} style={{ flex: 1, height: 6, borderRadius: 2, background: i < s ? T.ink700 : i === s ? (isClosed(t) ? T.emerald600 : T.amber500) : T.surfaceAlt }} />)}</span>;
}
function Modal({ title, onClose, children, width = 640 }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,14,22,.45)", display: "grid", placeItems: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") onClose(); }}
      style={{ width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: T.card, borderRadius: 12, border: "1px solid " + T.line, boxShadow: T.shadowLg, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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
      <span aria-hidden="true" style={{ fontSize: 10, color: T.ink500, transform: open ? "rotate(90deg)" : "none", transition: "transform 120ms" }}>▶</span><span style={{ flex: 1 }}>{title}</span>{info != null && <span style={{ fontSize: 12, fontWeight: 600, color: T.ink500 }}>{info}</span>}</button>
    {open && <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
  </div>;
}
const Field = ({ l, children, span }) => <label style={{ ...lab, gridColumn: span ? "1 / -1" : undefined }}>{l}{children}</label>;
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 };
function Checks({ items, value, onChange, disabled }) {
  const on = new Set(value || []);
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{items.map(x => { const v = on.has(x);
    return <button key={x} type="button" disabled={disabled} aria-pressed={v} onClick={() => { const n = new Set(on); if (v) n.delete(x); else n.add(x); onChange(items.filter(y => n.has(y))); }}
      style={{ minHeight: 28, padding: "0 10px", borderRadius: 8, border: "1px solid " + (v ? "transparent" : T.line), background: v ? T.emerald100 : T.card, color: v ? T.emerald600 : T.ink700, fontSize: 12, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: T.font }}>{v ? "✓ " : ""}{x}</button>; })}</div>;
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
  const [ticketDlg, setTicketDlg] = useState(null), [interDlg, setInterDlg] = useState(null), [parcDlg, setParcDlg] = useState(null), [demDlg, setDemDlg] = useState(null), [teamDlg, setTeamDlg] = useState(false);

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
      {sub === "tickets" && <Btn v="pri" size="sm" onClick={() => setTicketDlg({ id: null, t: { type: "cur", prio: "m", step: 0, orig: "Client", date: todayIso(), resp: myName || "" } })}>＋ Nouveau ticket</Btn>}
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

    {sub === "tickets" && <TicketsView {...{ tickets, inters, canEdit, me, myName, nomOf, onOpenPj, focusPj }} onEdit={(id, t) => setTicketDlg({ id, t })} onStep={(id, t, d) => api.put("tickets", id, { ...t, step: Math.max(0, Math.min(flowOf(t.type).length - 1, (t.step || 0) + d)), ...((t.step || 0) + d >= flowOf(t.type).length - 1 ? { closedAt: t.closedAt || todayIso() } : { closedAt: null }) })}
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
    {sub === "parc" && <ParcView {...{ rows, metaOf, parc: D.parc, tickets, canEdit, onOpenPj }} onEdit={(pj, p) => setParcDlg({ pj, p })} />}

    {ticketDlg && <TicketDialog {...ticketDlg} {...{ pjList, nomOf, techs, canEdit, isAdmin, inters }} onClose={() => setTicketDlg(null)} onSave={saveTicket}
      onDelete={async id => { if (await askConfirm({ title: "Supprimer le ticket " + id + " ?", message: "Ses interventions restent ; le ticket disparaît pour tout le monde.", confirmLabel: "Supprimer", danger: true })) { await api.del("tickets", id); setTicketDlg(null); } }} />}
    {interDlg && <InterDialog {...interDlg} {...{ pjList, nomOf, techs, canEdit, isAdmin, canCost, tickets }} onClose={() => setInterDlg(null)} onSave={saveInter}
      onDelete={async id => { if (await askConfirm({ title: "Supprimer l'intervention " + id + " ?", message: "Elle disparaît du planning et du ticket.", confirmLabel: "Supprimer", danger: true })) { await api.del("inters", id); setInterDlg(null); } }} />}
    {parcDlg && <ParcDialog {...parcDlg} canEdit={canEdit} onClose={() => setParcDlg(null)} onSave={async (pj, p) => { if (await api.put("parc", pj, p)) setParcDlg(null); }} />}
    {demDlg && <DemandeDialog init={demDlg} pjs={(myPjs && myPjs.length ? myPjs : pjList)} nomOf={nomOf} onClose={() => setDemDlg(null)}
      onSave={async d => { const id = "d" + Date.now().toString(36); if (await demApi.put("items", id, { ...d, by: myName || "", byEmail: me || "", at: new Date().toISOString(), st: "attente" })) setDemDlg(null); }} />}
    {teamDlg && <TeamDialog techs={techs} onClose={() => setTeamDlg(false)} onSave={async L => { if (await api.setField("techs", L)) setTeamDlg(false); }} />}
  </div>;
}

/* ── Tickets ── */
function TicketsView({ tickets, inters, canEdit, myName, nomOf, onEdit, onStep, onNewInter, onOpenInter, onOpenPj, focusPj }) {
  const [filt, setFilt] = useState("open"), [q, setQ] = useState(focusPj || ""), [sel, setSel] = useState(null);
  const all = Object.entries(tickets).map(([id, t]) => ({ id, ...t }));
  const L = all.filter(t => (filt === "all" || (filt === "open" && !isClosed(t)) || (filt === "mine" && !isClosed(t) && t.resp && t.resp === myName)))
    .filter(t => !q || (t.id + " " + (t.pj || "") + " " + nomOf(t.pj) + " " + (t.det || "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (isClosed(a) - isClosed(b)) || ({ h: 0, m: 1, b: 2 }[a.prio] - { h: 0, m: 1, b: 2 }[b.prio]) || String(b.date || "").localeCompare(String(a.date || "")));
  const cur = L.find(t => t.id === sel) || L[0] || null;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px, 400px)", gap: 12, alignItems: "start" }} className="enogia-sav-split">
    <Panel title="Tickets" pad={0} right={<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 12px 0 0" }}>
      <Segmented label="Filtrer les tickets" value={filt} onChange={setFilt} options={[["open", "Ouverts"], ["mine", "Les miens"], ["all", "Tous"]]} />
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un ticket…" aria-label="Rechercher un ticket" style={{ ...inp(), width: 220 }} /></div>}>
      {L.length === 0 ? <EmptyState icon="inbox" compact title={all.length ? "Aucun ticket avec ce filtre" : "Aucun ticket pour l'instant"} hint={canEdit && !all.length ? "« ＋ Nouveau ticket » pour enregistrer la première demande." : ""} /> :
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={tableTh()}>Ticket</th><th style={tableTh()}>PJ</th><th style={tableTh()}>Type</th><th style={tableTh()}>Priorité</th><th style={tableTh()}>Avancement</th><th style={tableTh()}>Responsable</th><th style={tableTh({ num: true })}>Depuis</th></tr></thead>
        <tbody>{L.map(t => <tr key={t.id} onClick={() => setSel(t.id)} className="e-hov" data-on={cur && cur.id === t.id ? "1" : "0"} style={{ cursor: "pointer", background: cur && cur.id === t.id ? T.surfaceAlt : "transparent", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{t.id}</span>{t.orig === "Chef de projet" && <span style={{ marginLeft: 6 }}><Pill tone="warn">demande CdP</Pill></span>}</td>
          <td style={tableTd()}><PjPlate pj={t.pj} /> <span style={{ color: T.ink700 }}>{nomOf(t.pj)}</span></td>
          <td style={tableTd()}><Pill tone={TYPE_TONE[t.type] || "neutral"}>{typeOf(t.type)[1]}</Pill></td>
          <td style={tableTd()}><Pill tone={PRIO_TONE[t.prio] || "muted"}>{(PRIOS.find(p => p[0] === t.prio) || PRIOS[1])[1]}</Pill></td>
          <td style={tableTd({ wrap: true })}><Steps t={t} /><div style={{ fontSize: 12, color: T.ink500 }}>{flowOf(t.type)[t.step || 0]}</div></td>
          <td style={tableTd()}>{t.resp || "—"}</td><td style={tableTd({ num: true })}>{ticketAge(t) == null ? "—" : ticketAge(t) + " j"}</td></tr>)}</tbody></table></div>}
    </Panel>
    {cur ? <Panel title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontFamily: T.fontMono, fontSize: 12 }}>{cur.id}</span><Pill tone={TYPE_TONE[cur.type] || "neutral"}>{typeOf(cur.type)[1]}</Pill><Pill tone={PRIO_TONE[cur.prio] || "muted"}>{(PRIOS.find(p => p[0] === cur.prio) || PRIOS[1])[1]}</Pill></span>}
      right={canEdit && <Btn size="sm" onClick={() => onEdit(cur.id, tickets[cur.id])}>Modifier</Btn>}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button type="button" onClick={() => onOpenPj && onOpenPj(cur.pj)} aria-label={"Ouvrir la fiche de " + cur.pj} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PjPlate pj={cur.pj} /></button><b style={{ fontSize: FZ.md, color: T.ink900 }}>{nomOf(cur.pj)}</b></div>
      {cur.det && <p data-no-i18n="1" style={{ margin: 0, fontSize: FZ.sm, color: T.ink900, whiteSpace: "pre-wrap" }}>{cur.det}</p>}
      <StepFlow t={cur} canEdit={canEdit} onSet={n => onStep(cur.id, tickets[cur.id], n - (cur.step || 0))} />
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
      <Field l="PJ"><select value={t.pj || ""} onChange={e => set("pj", e.target.value)} disabled={!canEdit} style={inp()}><option value="">Choisir…</option>{pjList.map(p => <option key={p} value={p}>{p}{nomOf(p) ? " · " + nomOf(p) : ""}</option>)}</select></Field>
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
  return <Panel title="Interventions" pad={0} right={<div style={{ padding: "10px 12px 0 0" }}><Segmented label="Filtrer les interventions" value={filt} onChange={setFilt} options={[["open", "À venir"], ["done", "Réalisées"], ["all", "Toutes"]]} /></div>}>
    {L.length === 0 ? <EmptyState icon="calendar" compact title="Aucune intervention avec ce filtre" /> :
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th style={tableTh()}>N°</th><th style={tableTh()}>PJ</th><th style={tableTh()}>Objectif</th><th style={tableTh()}>Type</th><th style={tableTh()}>Équipe</th><th style={tableTh()}>Dates</th><th style={tableTh()}>Préparation</th><th style={tableTh()}>Clôture</th><th style={tableTh()}>Statut</th>{canCost && <th style={tableTh({ num: true })}>Coût</th>}</tr></thead>
      <tbody>{L.map(i => { const done = ["Réalisée", "Validée", "Non validée"].includes(i.st);
        return <tr key={i.id} onClick={() => onOpen(i.id)} className="e-hov" style={{ cursor: "pointer", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{i.id}</span><div style={{ fontSize: 11, color: T.ink500 }}>{i.tk || ""}</div></td>
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
      {!i0.tk && <Field l="PJ"><select value={i.pj || ""} onChange={e => set("pj", e.target.value)} disabled={!canEdit} style={inp()}><option value="">Choisir…</option>{pjList.map(p => <option key={p} value={p}>{p}{nomOf(p) ? " · " + nomOf(p) : ""}</option>)}</select></Field>}
      <Field l="Objectif" span><input value={i.obj || ""} onChange={e => set("obj", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Arrivée sur site"><input type="date" value={i.a || ""} onChange={e => set("a", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Départ du site"><input type="date" value={i.b || ""} min={i.a || undefined} onChange={e => set("b", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Technicien responsable"><select value={i.resp || ""} onChange={e => set("resp", e.target.value)} disabled={!canEdit} style={inp()}><option value="">À affecter</option>{techs.map(x => <option key={x}>{x}</option>)}</select></Field>
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
      <Btn v="pri" size="sm" disabled={!ok} onClick={() => onSave(id, { ...i, st: i.st === "À planifier" && i.a && i.b ? "Planifiée" : i.st || "À planifier" })}>{id ? "Enregistrer" : "Créer l'intervention"}</Btn></div>}
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
function DayHeader({ days, labW, label, t0 }) {
  const N = days.length, cols = "repeat(" + N + ", minmax(0,1fr))";
  const band = (items, render, h) => <div style={{ display: "grid", gridTemplateColumns: cols, minHeight: h }}>{items.map(it => <div key={it.k} style={{ gridColumn: "span " + it.n, borderLeft: "1px solid " + T.line, padding: "0 6px", display: "flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}>{render(it)}</div>)}</div>;
  return <div style={{ display: "grid", gridTemplateColumns: labW + "px 1fr", borderBottom: "1px solid " + T.line, background: T.surface, position: "sticky", top: 0, zIndex: 2 }}>
    <div style={{ ...tableTh(), borderBottom: "none", display: "flex", alignItems: "flex-end" }}>{label}</div>
    <div>
      {band(runs(days, d => d.slice(0, 7)), it => <b style={{ fontSize: 13, color: T.ink900 }}>{monthName(it.d)}</b>, 26)}
      {band(runs(days, d => isoWeek(d) + "-" + mondayOf(d)), it => <span style={{ fontSize: 12, fontWeight: 600, color: T.ink500 }}>S{isoWeek(it.d)}{it.n >= 3 ? " · du " + fd(mondayOf(it.d)) : ""}</span>, 22)}
      <div style={{ display: "grid", gridTemplateColumns: cols }}>{days.map(d => { const wd = new Date(d + "T12:00:00").getDay(), today = d === t0;
        return <div key={d} style={{ borderLeft: "1px solid " + T.line, textAlign: "center", padding: "3px 0", background: today ? T.amber100 : undefined, borderTop: "1px solid " + T.line }}>
          <div style={{ fontSize: 11, color: today ? T.amber600 : T.ink500, fontWeight: 600 }}>{DOW[wd]}</div><div style={{ fontSize: 13, fontWeight: 600, color: today ? T.amber600 : T.ink900, fontVariantNumeric: "tabular-nums" }}>{d.slice(8, 10)}</div></div>; })}</div>
    </div></div>;
}
// ligne du planning : nom à gauche, piste à droite (hors du composant : pas de remontage pendant un glisser)
function SRow({ label, children, h = 40, ink, labW }) {
  return <div style={{ display: "grid", gridTemplateColumns: labW + "px 1fr", borderBottom: "1px solid " + T.line }}>
    <div style={{ ...tableTd({ ink: ink || T.ink900 }), fontWeight: 600, borderBottom: "none", height: "auto", minHeight: h, display: "flex", alignItems: "center" }}>{label}</div>{children}</div>;
}
function PlanningView({ inters, demandes, techs, canEdit, nomOf, me, myPjs, onOpenInter, onTeam, onRequest, onAnswer, onCancel, onMove }) {
  const t0 = todayIso();
  const [mode, setMode0] = useState(() => { try { return localStorage.getItem("enogia_sav_plan") === "month" ? "month" : "week"; } catch (e) { return "week"; } });
  const setMode = m => { setMode0(m); try { localStorage.setItem("enogia_sav_plan", m); } catch (e) { /* stockage indisponible */ } };
  const [pv, setPv] = useState("tech"), view = canEdit ? pv : "dem";
  const [anchor, setAnchor] = useState(t0);
  const days = useMemo(() => { if (mode === "week") return workDaysFrom(mondayOf(anchor), 10);
    const m = anchor.slice(0, 7), out = []; const d = new Date(m + "-01T12:00:00"); while (iso(d).slice(0, 7) === m) { if (d.getDay() % 6) out.push(iso(d)); d.setDate(d.getDate() + 1); } return out; }, [mode, anchor]);
  const N = days.length;
  const shift = dir => { const d = new Date(anchor + "T12:00:00"); if (mode === "week") d.setDate(d.getDate() + 7 * dir); else { d.setDate(1); d.setMonth(d.getMonth() + dir); } setAnchor(iso(d)); };
  const bars = planBars(inters, techs), load = dayLoad(inters, techs, days);
  const dems = Object.entries(demandes).map(([id, d]) => ({ id, ...d })).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const pend = dems.filter(d => d.st === "attente"), mine = dems.filter(d => d.byEmail && me && d.byEmail.toLowerCase() === me.toLowerCase());
  const toPlan = Object.entries(inters).filter(([, i]) => i && i.st !== "Annulée" && (!i.a || !i.b || !i.resp) && !["Réalisée", "Validée", "Non validée"].includes(i.st));
  const [notes, setNotes] = useState({});
  const dnd = usePointerDnD();
  const pendOn = d => pend.filter(p => workDaysFrom(p.date, Math.max(1, +p.days || 1)).includes(d));
  const barColor = st => st === "Réalisée" || st === "Validée" ? [T.emerald100, T.emerald600] : st === "En cours" ? [T.accentSoft || T.teal100, T.accentInk || T.teal600] : [T.info100, T.info600];
  const moveTo = (p, tech, day) => {
    const i = inters[p.id]; if (!i || !i.a || !i.b) return;
    const len = workCount(i.a, i.b), a = shiftWork(day, -(p.grab || 0)), b = workDaysFrom(firstWork(a), len)[len - 1], patch = { a: firstWork(a), b };
    if (tech !== p.tech) { if (p.lead) { patch.resp = tech; patch.who = (i.who || []).filter(x => x !== tech); } else patch.who = [...new Set((i.who || []).map(x => (x === p.tech ? tech : x)))].filter(x => x !== i.resp); }
    if (patch.a === i.a && patch.b === i.b && tech === p.tech) return;
    onMove(p.id, patch);
  };
  const colW = 100 / N, labW = 160, cols = "repeat(" + N + ", minmax(0,1fr))";
  const weekLines = d => ({ borderLeft: (new Date(d + "T12:00:00").getDay() === 1 ? "2px solid " : "1px solid ") + T.line });
  const cellBg = (d, hot) => hot ? T.amber100 : d === t0 ? "color-mix(in srgb, " + T.amber100 + " 45%, transparent)" : "transparent";
  const tools = <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
    {canEdit && <Segmented label="Planning affiché" value={view} onChange={setPv} options={[["tech", "Techniciens"], ["dem", "Demandes d'intervention" + (pend.length ? " (" + pend.length + ")" : "")]]} />}
    <span style={{ flex: 1 }} />
    <Segmented label="Échelle du planning" value={mode} onChange={setMode} options={[["week", "2 semaines"], ["month", "Mois"]]} />
    <Btn size="sm" aria-label={mode === "week" ? "Semaine précédente" : "Mois précédent"} onClick={() => shift(-1)}>◀</Btn><Btn size="sm" onClick={() => setAnchor(t0)}>Aujourd'hui</Btn><Btn size="sm" aria-label={mode === "week" ? "Semaine suivante" : "Mois suivant"} onClick={() => shift(1)}>▶</Btn>
    {canEdit && view === "tech" && <Btn size="sm" onClick={onTeam}>Équipe ({techs.length})</Btn>}</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {tools}
    {view === "tech" ? <>
      <Panel title="Planning des techniciens" pad={0} right={<span style={{ fontSize: 12, color: T.ink500, padding: "12px 14px 0 0" }}>Glisser une barre : autre jour = autres dates, autre ligne = autre technicien ; un clic l'ouvre.</span>}>
        <div style={{ overflowX: "auto" }}><div style={{ minWidth: N > 12 ? 1200 : 900 }}>
          <DayHeader days={days} labW={labW} label="Technicien" t0={t0} />
          {techs.length ? techs.map(tc => <SRow labW={labW} key={tc} label={tc}>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, minHeight: 40 }}>
              {days.map(d => <div key={d} {...dnd.dropProps(tc + "|" + d, p => !!p, p => moveTo(p, tc, d))} style={{ ...weekLines(d), background: cellBg(d, dnd.over === tc + "|" + d) }} />)}
              {(bars[tc] || []).filter(b => b.to >= days[0] && b.from <= days[N - 1]).map(b => {
                const i0 = Math.max(0, days.findIndex(x => x >= b.from)), i1 = (() => { let k = N - 1; while (k > 0 && days[k] > b.to) k--; return k; })(), [bg, ink] = barColor(b.st);
                const payload = { id: b.id, tech: tc, lead: b.lead, grab: 0 }, dp = dnd.dragProps(payload);
                return <button key={b.id} type="button" {...dp} onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(), span = i1 - i0 + 1; payload.grab = Math.min(span - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * span))) + (b.from < days[0] ? workCount(b.from, days[0]) - 1 : 0); dp.onPointerDown(e); }}
                  onClick={() => onOpenInter(b.id)} title={b.id + " · " + b.pj + " · " + fd(b.from) + " → " + fd(b.to) + (b.lead ? "" : " (appui)")}
                  style={{ position: "absolute", top: 5, bottom: 5, left: "calc(" + (i0 * colW) + "% + 2px)", width: "calc(" + ((i1 - i0 + 1) * colW) + "% - 4px)", border: "none", borderLeft: "3px solid " + ink, borderRadius: 4, background: bg, color: ink, fontSize: 12, fontWeight: 600, textAlign: "left", padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "grab", fontFamily: T.font, opacity: b.lead ? 1 : 0.8, pointerEvents: dnd.drag ? "none" : "auto", touchAction: "none" }}>{b.pj} · {nomOf(b.pj) || b.id}{b.lead ? "" : " (appui)"}</button>; })}
            </div></SRow>)
            : <div style={{ padding: 12 }}><EmptyState compact icon="manager" title="Aucun technicien" hint="« Équipe » pour ajouter les techniciens SAV." /></div>}
        </div></div>
      </Panel>
      <Panel title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>À planifier {toPlan.length > 0 && <Pill tone="warn">{toPlan.length}</Pill>}</span>}>
        {toPlan.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Toutes les interventions ont des dates et un technicien.</div> : toPlan.map(([id, i]) => <div key={id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><PjPlate pj={i.pj} /><span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm }}>{i.obj || "—"}</span>
          <span style={{ fontSize: 12, color: T.ink500 }}>{!i.a ? "sans dates" : "sans technicien"}</span><Btn v="pri" size="sm" onClick={() => onOpenInter(id)}>Planifier</Btn></div>)}
      </Panel></>
    : <>
      <Panel title="Planning des demandes d'intervention" pad={0} right={<span style={{ fontSize: 12, color: T.ink500, padding: "12px 14px 0 0" }}>{"En bleu, les jours déjà réservés ; rayé, une demande en attente de confirmation ; « + » pour demander un jour."}</span>}>
        <div style={{ overflowX: "auto" }}><div style={{ minWidth: N > 12 ? 1200 : 900 }}>
          <DayHeader days={days} labW={labW} label="" t0={t0} />
          {/* v330 (demandé : « une ligne Équipe, les créneaux déjà réservés pour tel PJ, un + sur les jours libres ; la demande rayée en attente
              de confirmation du responsable SAV ») — ouvert à tous : chef de projet comme équipe SAV peuvent demander un jour */}
          <SRow labW={labW} label="Équipe SAV / MES" h={64}><div style={{ display: "grid", gridTemplateColumns: cols }}>{load.map(x => {
            const booked = Object.entries(inters).filter(([, i]) => i && i.a && i.b && i.st !== "Annulée" && i.a <= x.d && i.b >= x.d);
            const waits = pendOn(x.d), past = x.d < t0, full = x.team > 0 && x.free - waits.length <= 0;
            return <div key={x.d} style={{ padding: 3, display: "flex", flexDirection: "column", gap: 3, minWidth: 0, ...weekLines(x.d), background: x.d === t0 ? "color-mix(in srgb, " + T.amber100 + " 45%, transparent)" : undefined }}>
              {booked.map(([id, i]) => <span key={id} title={"Réservé : " + i.pj + " · " + (nomOf(i.pj) || "") + " · " + (i.obj || "") + (interTeam(i).length ? " · " + interTeam(i).join(", ") : "")}
                style={{ display: "block", minHeight: 22, lineHeight: "22px", borderRadius: 4, background: T.info100, color: T.info600, borderLeft: "3px solid " + T.info600, fontSize: 11, fontWeight: 600, padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.pj}</span>)}
              {waits.map(p => <span key={p.id} title={"Demande en attente de confirmation : " + p.pj + " · " + (p.obj || "") + " · " + (p.by || "")}
                style={{ display: "block", minHeight: 22, lineHeight: "22px", borderRadius: 4, border: "1px dashed " + T.amber500, background: "repeating-linear-gradient(135deg, " + T.amber100 + " 0 5px, transparent 5px 10px)", color: T.amber600, fontSize: 11, fontWeight: 600, padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "line-through" }}>{p.pj}</span>)}
              {!past && (full ? <span style={{ fontSize: 11, color: T.ink500, textAlign: "center" }}>complet</span>
                : <button type="button" onClick={() => onRequest(x.d)} title={"Demander une intervention le " + fdd(x.d)} aria-label={"Demander une intervention le " + fdd(x.d)}
                  style={{ width: "100%", minHeight: 24, borderRadius: 4, border: "1.5px dashed " + T.emerald500, background: "transparent", color: T.emerald600, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: T.font, padding: 0, lineHeight: 1 }}>+</button>)}
            </div>; })}</div></SRow>
        </div></div>
      </Panel>
      {canEdit ? <Panel title={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>Demandes des chefs de projet {pend.length > 0 && <Pill tone="warn">{pend.length}</Pill>}</span>}>
        {dems.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune demande pour l'instant</div> : dems.slice(0, 12).map(d => <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
          <PjPlate pj={d.pj} /><span style={{ flex: "1 1 260px", minWidth: 0, fontSize: FZ.sm, color: T.ink900 }}>{d.obj || "—"}<div style={{ fontSize: 12, color: T.ink500 }}>{nomOf(d.pj)} · demandé par {d.by || "—"} · à partir du {fdd(d.date)} · {d.days || 1} j</div></span>
          {d.st === "attente" ? <>
            <input value={notes[d.id] || ""} onChange={e => setNotes(n => ({ ...n, [d.id]: e.target.value }))} placeholder="Réponse (facultative)" aria-label={"Réponse à la demande " + d.pj} style={{ ...inp(), width: 200 }} />
            <Btn size="sm" onClick={() => onAnswer(d.id, d, false, notes[d.id])}>Refuser</Btn><Btn v="pri" size="sm" onClick={() => onAnswer(d.id, d, true, notes[d.id])}>Accepter</Btn></>
            : <Pill tone={d.st === "ok" ? "ok" : "bad"}>{d.st === "ok" ? "Acceptée" + (d.iid ? " · " + d.iid : "") : "Refusée"}</Pill>}</div>)}
      </Panel>
      : <Panel title="Mes demandes">
        {mine.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Vous n'avez pas encore fait de demande. Cliquez sur un jour libre du planning ci-dessus.</div> : mine.map(d => <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid " + T.line }}>
          <PjPlate pj={d.pj} /><span style={{ flex: "1 1 260px", minWidth: 0, fontSize: FZ.sm }}>{d.obj || "—"}<div style={{ fontSize: 12, color: T.ink500 }}>à partir du {fdd(d.date)} · {d.days || 1} j{d.note ? " · « " + d.note + " »" : ""}</div></span>
          <Pill tone={d.st === "ok" ? "ok" : d.st === "ko" ? "bad" : "warn"}>{DEM_STATUS[d.st] || d.st}</Pill>
          {d.st === "attente" && <Btn size="sm" onClick={() => onCancel(d.id)}>Retirer</Btn>}</div>)}
        {!(myPjs && myPjs.length) && <div style={{ fontSize: 12, color: T.ink500 }}>Aucun PJ ne vous est associé : la demande proposera tous les PJ</div>}
      </Panel>}
    </>}
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

/* ── Parc ── */
function ParcView({ rows, metaOf, parc, tickets, canEdit, onEdit, onOpenPj }) {
  const [filt, setFilt] = useState("all"), [q, setQ] = useState("");
  const all = parcOf(rows, metaOf, parc, tickets);
  const L = all.filter(p => filt === "all" || (filt === "ctr" ? p.info.contrat && p.info.contrat !== "Sans contrat" : !p.info.contrat || p.info.contrat === "Sans contrat"))
    .filter(p => !q || (p.pj + " " + p.nom + " " + p.pays + " " + p.sn.join(" ")).toLowerCase().includes(q.toLowerCase()));
  return <><WorldMap points={mapPoints(all)} onPick={pj => setQ(pj)} />
    <Panel title={"Parc ORC (" + all.length + " projets)"} pad={0} right={<div style={{ display: "flex", gap: 8, padding: "10px 12px 0 0", flexWrap: "wrap" }}>
    <Segmented label="Filtrer le parc" value={filt} onChange={setFilt} options={[["all", "Tous"], ["ctr", "Avec contrat"], ["no", "Sans contrat"]]} />
    <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un S/N…" aria-label="Rechercher dans le parc" style={{ ...inp(), width: 200 }} /></div>}>
    {L.length === 0 ? <EmptyState compact icon="gauge" title="Aucun projet" hint="Le parc se remplit avec les machines expédiées du planning ; « ＋ Projet du parc » pour les machines plus anciennes." /> :
    <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th style={tableTh()}>PJ</th><th style={tableTh()}>Pays</th><th style={tableTh()}>ORC</th><th style={tableTh()}>S/N</th><th style={tableTh()}>Mise en service</th><th style={tableTh()}>Application</th><th style={tableTh()}>Contrat</th><th style={tableTh()}>Prochaine préventive</th><th style={tableTh({ num: true })}>Tickets ouverts</th></tr></thead>
      <tbody>{L.map(p => { const c = p.info.contrat;
        return <tr key={p.pj} onClick={() => (canEdit ? onEdit(p.pj, p.info) : onOpenPj && onOpenPj(p.pj))} className="e-hov" style={{ cursor: "pointer", "--e-hov-bg": T.surface }}>
          <td style={tableTd()}><PjPlate pj={p.pj} /> <span style={{ color: T.ink900 }}>{p.nom}</span>{p.manuel && <span style={{ marginLeft: 6 }}><Pill tone="muted">hors planning</Pill></span>}</td>
          <td style={tableTd()}>{p.pays || "—"}</td><td style={tableTd()}>{p.gammes.join(", ") || "—"}</td>
          <td style={tableTd({ wrap: true })}><span style={{ fontFamily: T.fontMono, fontSize: 12 }}>{p.sn.join(", ") || "—"}</span></td>
          <td style={tableTd()}>{p.info.mes ? fd(p.info.mes) + "/" + String(p.info.mes).slice(2, 4) : p.depart ? "partie le " + fd(p.depart) : "—"}</td>
          <td style={tableTd()}>{p.info.application || "—"}</td>
          <td style={tableTd()}>{c && c !== "Sans contrat" ? <><Pill tone={p.info.contratStatut === "En cours" ? "ok" : "warn"}>{c}</Pill> <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink500 }}>{p.info.contratNo || ""}</span></> : <Pill tone="muted">Sans contrat</Pill>}</td>
          <td style={tableTd()}>{p.info.preventive ? fd(p.info.preventive) + "/" + String(p.info.preventive).slice(2, 4) : "—"}</td>
          <td style={tableTd({ num: true, ink: p.ouverts ? T.ink900 : T.ink500 })}>{p.ouverts}</td></tr>; })}</tbody></table></div>}
  </Panel></>;
}
// v330 (demandé : « une carte du monde pour chaque PJ ») : fond de carte (Natural Earth 110 m, world-atlas) chargé à l'ouverture du Parc,
// projection équirectangulaire maison ; un point par projet (coordonnées saisies, sinon centre du pays) ; clic = filtrer le tableau.
let atlasP = null;
function loadAtlas() {
  if (atlasP) return atlasP;
  const lib = window.topojson ? Promise.resolve() : new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
  atlasP = lib.then(() => fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")).then(r => r.json()).then(w => window.topojson.feature(w, w.objects.countries)).catch(e => { atlasP = null; throw e; });
  return atlasP;
}
const MW = 1000, MH = 470, LAT0 = 84, LAT1 = -58;
const px = (lat, lon) => [(lon + 180) / 360 * MW, (LAT0 - lat) / (LAT0 - LAT1) * MH];
function ringPath(ring) { let d = "", prev = null; ring.forEach(([lon, lat]) => { const [x, y] = px(lat, lon); d += (prev == null || Math.abs(x - prev) > MW / 2 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1); prev = x; }); return d + "Z"; }
function geoPath(g) { if (!g) return ""; const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []; return polys.map(p => p.map(ringPath).join("")).join(""); }
function WorldMap({ points, onPick }) {
  const [land, setLand] = useState(null), [err, setErr] = useState(false), [hover, setHover] = useState(null);
  useEffect(() => { let on = true; loadAtlas().then(f => { if (on) setLand(f); }).catch(() => { if (on) setErr(true); }); return () => { on = false; }; }, []);
  const paths = useMemo(() => (land ? land.features.map(f => geoPath(f.geometry)) : []), [land]);
  const byCountry = points.reduce((m, p) => { m[p.pays || "—"] = (m[p.pays || "—"] || 0) + 1; return m; }, {});
  return <Panel title={"Carte du parc (" + points.length + " sites)"} right={<span style={{ fontSize: 12, color: T.ink500 }}>{Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + " " + n).join(" · ")}</span>}>
    <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "0 auto", aspectRatio: MW + " / " + MH, background: T.surface, borderRadius: 8, overflow: "hidden" }}>
      {err && <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: FZ.sm, color: T.ink500 }}>Fond de carte indisponible (connexion) : les points restent placés.</div>}
      <svg viewBox={"0 0 " + MW + " " + MH} role="img" aria-label={"Carte du monde : " + points.length + " sites du parc"} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {paths.map((d, i) => <path key={i} d={d} fill={T.surfaceAlt} stroke={T.line} strokeWidth={0.6} />)}
        {points.map(p => { const [x, y] = px(p.lat, p.lon), ok = p.info && p.info.contrat && p.info.contrat !== "Sans contrat", on = hover === p.pj;
          return <g key={p.pj} onMouseEnter={() => setHover(p.pj)} onMouseLeave={() => setHover(null)} onClick={() => onPick(p.pj)} style={{ cursor: "pointer" }}>
            <title>{p.pj + (p.nom ? " · " + p.nom : "") + (p.pays ? " · " + p.pays : "") + (p.exact ? "" : " (centre du pays)")}</title>
            <circle cx={x} cy={y} r={on ? 8 : 5.5} fill={p.ouverts ? T.red600 : ok ? T.emerald600 : T.info600} stroke={T.card} strokeWidth={1.5} />
            {on && <text x={x + 10} y={y + 4} fontSize={13} fontWeight={700} fill={T.ink900} stroke={T.card} strokeWidth={3} paintOrder="stroke" style={{ fontFamily: T.font }}>{p.pj}{p.nom ? " · " + p.nom : ""}</text>}</g>; })}
      </svg>
    </div>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.ink500 }}>
      {[[T.emerald600, "Sous contrat"], [T.info600, "Sans contrat"], [T.red600, "Ticket ouvert"]].map(([c, l]) => <span key={l} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />{l}</span>)}
      <span>Survol = nom, clic = filtrer le tableau ; sans coordonnées saisies, le point est au centre du pays.</span></div>
  </Panel>;
}

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

function ParcDialog({ pj: pj0, p: p0, isNew, canEdit, onClose, onSave }) {
  const [pj, setPj] = useState(pj0), [p, setP] = useState({ ...p0, sn: Array.isArray(p0.sn) ? p0.sn.join(", ") : p0.sn || "" }); const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  return <Modal title={isNew ? "Projet du parc" : "Parc · " + pj} onClose={onClose}>
    <div style={grid2}>
      {isNew && <Field l="N° de projet (ex. PJ214)"><input value={pj} onChange={e => setPj(e.target.value.trim().toUpperCase())} style={inp()} /></Field>}
      {isNew && <Field l="Nom du projet"><input value={p.nom || ""} onChange={e => set("nom", e.target.value)} style={inp()} /></Field>}
      {isNew && <Field l="Pays"><input value={p.pays || ""} onChange={e => set("pays", e.target.value)} style={inp()} /></Field>}
      {isNew && <Field l="Type d'ORC (gamme)"><input value={p.gamme || ""} onChange={e => set("gamme", e.target.value)} style={inp()} /></Field>}
      <Field l="S/N supplémentaires (séparés par des virgules)"><input value={p.sn} onChange={e => set("sn", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Date de mise en service"><input type="date" value={p.mes || ""} onChange={e => set("mes", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Application"><input value={p.application || ""} onChange={e => set("application", e.target.value)} disabled={!canEdit} placeholder="Biomasse, incinérateur…" style={inp()} /></Field>
      <Field l="Visitable"><select value={p.visitable || ""} onChange={e => set("visitable", e.target.value)} disabled={!canEdit} style={inp()}><option value="">—</option><option>Oui</option><option>Non</option></select></Field>
      <Field l="Contrat de maintenance"><select value={p.contrat || "Sans contrat"} onChange={e => set("contrat", e.target.value)} disabled={!canEdit} style={inp()}>{CONTRACTS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="N° de contrat"><input value={p.contratNo || ""} onChange={e => set("contratNo", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Statut du contrat"><select value={p.contratStatut || ""} onChange={e => set("contratStatut", e.target.value)} disabled={!canEdit} style={inp()}><option value="">—</option>{["En cours", "En attente de signature", "En attente de MES", "Suspendu", "Terminé"].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field l="Prochaine préventive"><input type="date" value={p.preventive || ""} onChange={e => set("preventive", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Adresse du site" span><input value={p.adresse || ""} onChange={e => set("adresse", e.target.value)} disabled={!canEdit} style={inp()} /></Field>
      <Field l="Latitude (carte, facultatif)"><input type="number" step="0.0001" value={p.lat ?? ""} onChange={e => set("lat", e.target.value === "" ? "" : +e.target.value)} disabled={!canEdit} placeholder="ex. 43.3478" style={inp()} /></Field>
      <Field l="Longitude (carte, facultatif)"><input type="number" step="0.0001" value={p.lon ?? ""} onChange={e => set("lon", e.target.value === "" ? "" : +e.target.value)} disabled={!canEdit} placeholder="ex. 5.3698" style={inp()} /></Field>
      <Field l="Dispositions particulières" span><textarea value={p.notes || ""} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} style={{ ...inp(), padding: 8, resize: "vertical" }} /></Field>
    </div>
    {canEdit && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn size="sm" onClick={onClose}>Annuler</Btn>
      <Btn v="pri" size="sm" disabled={!/^PJ\w+/i.test(pj || "")} onClick={() => onSave(pj, { ...p, sn: String(p.sn || "").split(",").map(s => s.trim()).filter(Boolean) })}>Enregistrer</Btn></div>}
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
    <div><div style={{ fontSize: 12, fontWeight: 600, color: T.ink700, marginBottom: 4 }}>Tickets ({T0.length})</div>
      {T0.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucun ticket</div> : T0.slice(0, 6).map(([id, t]) => <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><Pill tone={TYPE_TONE[t.type] || "neutral"}>{typeOf(t.type)[1]}</Pill>
        <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.det || ""}</span>
        {isClosed(t) ? <Pill tone="ok">clos</Pill> : <span style={{ fontSize: 12, color: T.ink500 }}>{flowOf(t.type)[t.step || 0]}</span>}</div>)}</div>
    <div><div style={{ fontSize: 12, fontWeight: 600, color: T.ink700, marginBottom: 4 }}>Interventions ({I0.length})</div>
      {I0.length === 0 ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Aucune intervention</div> : I0.slice(0, 6).map(([id, i]) => <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid " + T.line }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 12, fontWeight: 600 }}>{id}</span><span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm }}>{i.obj || ""}</span>
        <span style={{ fontSize: 12, color: T.ink500 }}>{i.a ? fd(i.a) + " → " + fd(i.b) : "à planifier"}{interTeam(i).length ? " · " + interTeam(i).join(", ") : ""}</span><Pill tone={ST_TONE[i.st] || "neutral"}>{i.st || "—"}</Pill></div>)}</div>
    {mine.length > 0 && <div style={{ fontSize: FZ.sm, color: T.amber600 }}>{mine.length} demande{mine.length > 1 ? "s" : ""} d'intervention en attente du responsable SAV.</div>}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{onRequest && <Btn v="pri" size="sm" onClick={onRequest}>Demander une intervention</Btn>}{onOpenSav && <Btn size="sm" onClick={onOpenSav}>Ouvrir dans SAV / MES →</Btn>}</div>
  </div>;
}

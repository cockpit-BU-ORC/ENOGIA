// v326 — SAV / MES (demandes D1 à D6, maquette v325-sav-mes.html validée : « Go tout faire »). Le Cockpit devient l'outil du SAV :
// tickets, interventions, planning des équipes, parc ; pas d'import du fichier Google Sheets. Calculs purs (testés dans savModel.test.js).
// Données : planning/sav = { tickets: { id: … }, inters: { id: … }, parc: { PJ: … }, techs: [noms] } (écrit par le SAV)
//           planning/savDemandes = { items: { id: … } } (demandes des chefs de projet sur un jour libre, écrit par tout compte ENOGIA)

// Types de demande et leurs étapes (reprises de l'onglet DB du fichier SAV)
export const TICKET_TYPES = [
  ["cur", "Maintenance curative", ["En attente de prise en charge", "Diagnostic", "Échange avec le client", "Planification et préparation d'intervention", "Clôture d'intervention", "Compte rendu client et discussion finale", "Terminé"]],
  ["prev", "Maintenance préventive", ["En attente de prise en charge", "Mail d'échéance et facture", "Discussion client pour planification", "Planification et préparation d'intervention", "Clôture d'intervention", "Compte rendu préventif", "Terminé"]],
  ["mes", "Mise en service", ["En attente de prise en charge", "Réception des informations de MES", "Pré-commissioning", "Planification et préparation d'intervention", "Clôture d'intervention", "Documents au client et en interne", "Clôture du projet et passation SAV", "Terminé"]],
  ["dev", "Devis", ["En attente de prise en charge", "Traitement de la demande", "Réalisation du chiffrage", "Validation du chiffrage", "Chiffrage envoyé", "Chiffrage validé", "Ouverture d'un ticket de maintenance", "Terminé"]],
  ["qtech", "Question technique", ["En attente de prise en charge", "Traitement", "Réponse envoyée", "Terminé"]],
  ["qcom", "Question commerciale", ["En attente de prise en charge", "Traitement", "Réponse envoyée", "Terminé"]],
  ["audit", "Audit machine", ["En attente de prise en charge", "Planification et préparation d'intervention", "Clôture d'intervention", "Rapport envoyé", "Terminé"]],
  ["diag", "Diagnostic uniquement", ["En attente de prise en charge", "Diagnostic", "Retour au client", "Terminé"]],
  ["autre", "Autre", ["En attente de prise en charge", "En cours", "Terminé"]],
];
export const typeOf = k => TICKET_TYPES.find(t => t[0] === k) || TICKET_TYPES[TICKET_TYPES.length - 1];
export const flowOf = k => typeOf(k)[2];
export const PRIOS = [["h", "Haute"], ["m", "Moyenne"], ["b", "Basse"]];
export const ORIGINS = ["Client", "BU ORC", "BU EPC", "BU TUI", "BU Support", "Pôle SAV", "Chef de projet"];
export const INTER_TYPES = ["Mise en service", "Préliminaire à la MES", "Amélioration MES", "Maintenance préventive", "Maintenance curative", "Diagnostic sur site", "Visite de site", "Audit sur site", "Démantèlement", "Autre"];
export const INTER_STATUS = ["À planifier", "Planifiée", "En cours", "Réalisée", "Validée", "Non validée", "Annulée"];
export const PREP_ITEMS = ["Planning d'intervention", "Check-list PdR et matériels", "PPT de présentation", "Réservation", "Communication au client", "Ordre de mission", "Demande d'envoi de matériels"];
export const CLO_ITEMS = ["Certificat de MES ou d'intervention signé", "PPT de clôture", "Inventaire PdR et matériels", "Demande de retour de matériels", "Fiche machine à jour"];
export const COST_FIELDS = [["pdr", "Pièces de rechange"], ["transpPdr", "Transport des pièces"], ["voyage", "Transport (vol / train)"], ["heberg", "Hébergement"], ["repas", "Repas"]];
export const CONTRACTS = ["Premium", "Standard", "Sans contrat"];

const pad = (n, w) => String(n).padStart(w, "0");
const yy = d => String((d || new Date()).getFullYear()).slice(2);
// TC-26-07 : n° suivant de l'année ; INT-084 : n° suivant toutes années confondues
export function nextTicketId(tickets, today = new Date()) {
  const y = yy(today), re = new RegExp("^TC-" + y + "-(\\d+)$");
  const max = Object.keys(tickets || {}).reduce((m, k) => { const r = k.match(re); return r ? Math.max(m, +r[1]) : m; }, 0);
  return "TC-" + y + "-" + pad(max + 1, 2);
}
export function nextInterId(inters) {
  const max = Object.keys(inters || {}).reduce((m, k) => { const r = k.match(/^INT-(\d+)$/); return r ? Math.max(m, +r[1]) : m; }, 0);
  return "INT-" + pad(max + 1, 3);
}
export const isClosed = t => !!t && (!!t.closedAt || (t.step || 0) >= flowOf(t.type).length - 1);
export const progressOf = t => { const n = flowOf(t.type).length - 1; return n ? Math.min(1, (t.step || 0) / n) : 1; };
const dayMs = 864e5;
const isoD = d => { const x = new Date(d); return isNaN(x) ? "" : x.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => (a && b ? Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / dayMs) : null);
export const ticketAge = (t, today) => daysBetween(t.date, t.closedAt || isoD(today || new Date()));
export const interCost = i => COST_FIELDS.reduce((s, [k]) => s + (Number((i.costs || {})[k]) || 0), 0);
export const interTeam = i => [i.resp, ...(Array.isArray(i.who) ? i.who : [])].filter(Boolean);
export const interDays = i => (i.a && i.b ? daysBetween(i.a, i.b) + 1 : 0);

// Jours ouvrés (lun → ven) à partir d'un lundi
export function workDaysFrom(monday, n) {
  const out = [], d = new Date(monday + "T12:00:00");
  while (out.length < n) { if (d.getDay() % 6) out.push(isoD(d)); d.setDate(d.getDate() + 1); }
  return out;
}
export function mondayOf(iso) { const d = new Date(iso + "T12:00:00"), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return isoD(d); }

// Barres du planning des équipes : une par technicien et par intervention datée (non annulée)
export function planBars(inters, techs) {
  const by = Object.fromEntries((techs || []).map(t => [t, []]));
  Object.entries(inters || {}).forEach(([id, i]) => {
    if (!i || !i.a || !i.b || i.st === "Annulée") return;
    interTeam(i).forEach(t => { (by[t] = by[t] || []).push({ id, from: i.a, to: i.b, pj: i.pj, type: i.type, st: i.st, lead: t === i.resp }); });
  });
  Object.values(by).forEach(L => L.sort((a, b) => a.from.localeCompare(b.from)));
  return by;
}
// Vue chef de projet (une seule ligne) : pour chaque jour, techniciens occupés et libres
export function dayLoad(inters, techs, days) {
  const bars = planBars(inters, techs), team = (techs || []).length;
  return days.map(d => { const busy = Object.keys(bars).filter(t => (techs || []).includes(t) && bars[t].some(b => b.from <= d && b.to >= d)).length;
    return { d, busy, free: Math.max(0, team - busy), team }; });
}

// Demandes des chefs de projet : un ou plusieurs jours à partir d'un jour libre
export const DEM_STATUS = { attente: "En attente du responsable SAV", ok: "Acceptée", ko: "Refusée" };
export function demandeDays(dem) { return workDaysFrom(dem.date, Math.max(1, Number(dem.days) || 1)); }
// Acceptation : l'intervention créée (à affecter à un technicien) et le ticket qui la porte
export function acceptDemande(dem, doc, today = new Date()) {
  const tickets = (doc && doc.tickets) || {}, inters = (doc && doc.inters) || {};
  const tid = nextTicketId(tickets, today), iid = nextInterId(inters), days = demandeDays(dem);
  const ticket = { pj: dem.pj, type: dem.type || "cur", prio: "m", step: 3, resp: "", orig: "Chef de projet", date: isoD(today), det: dem.obj || "", inters: [iid], by: dem.by || "", demande: dem.id || "" };
  const inter = { tk: tid, pj: dem.pj, obj: dem.obj || "", type: dem.interType || "Maintenance curative", resp: "", who: [], a: days[0], b: days[days.length - 1], st: "Planifiée", prep: [], clo: [], costs: {} };
  return { tid, ticket, iid, inter };
}

// Parc : machines expédiées du planning (S/N, pays, gamme) regroupées par PJ, complétées par planning/sav.parc[PJ] (contrat, MES…)
// et par les projets ajoutés à la main (machines d'avant le Cockpit)
export function parcOf(rows, metaOf, parc, tickets) {
  const by = {};
  (rows || []).filter(r => r && r.pj && r.etat === "SHIPPED").forEach(r => {
    const m = (metaOf && metaOf(r)) || {}, k = String(r.pj).replace(/-\d+[A-Z]*$/, "") || r.pj;
    const e = by[k] = by[k] || { pj: k, nom: m.nomProjet || "", pays: m.pays || "", gammes: [], sn: [], depart: "" };
    if (r.gamme && !e.gammes.includes(r.gamme)) e.gammes.push(r.gamme);
    if (m.numSerie) e.sn.push(m.numSerie);
    if (r.depart && String(r.depart) > e.depart) e.depart = String(r.depart).slice(0, 10);
  });
  Object.entries(parc || {}).forEach(([k, p]) => { if (!p) return; const e = by[k] = by[k] || { pj: k, nom: "", pays: "", gammes: [], sn: [], depart: "", manuel: true };
    Object.assign(e, { nom: e.nom || p.nom || "", pays: e.pays || p.pays || "", info: p });
    if (Array.isArray(p.sn)) p.sn.forEach(s => { if (s && !e.sn.includes(s)) e.sn.push(s); }); if (p.gamme && !e.gammes.includes(p.gamme)) e.gammes.push(p.gamme); });
  const open = {}; Object.values(tickets || {}).forEach(t => { if (t && !isClosed(t)) { const k = String(t.pj || "").replace(/-\d+[A-Z]*$/, ""); open[k] = (open[k] || 0) + 1; } });
  return Object.values(by).map(e => ({ ...e, info: e.info || {}, ouverts: open[e.pj] || 0 })).sort((a, b) => a.pj.localeCompare(b.pj, "fr", { numeric: true }));
}

// Chiffres de la page (D6)
export function savKpis(doc, dem, today = new Date()) {
  const T = Object.values((doc && doc.tickets) || {}), I = Object.values((doc && doc.inters) || {}), t0 = isoD(today), m0 = t0.slice(0, 7);
  const open = T.filter(t => !isClosed(t)), closed = T.filter(t => isClosed(t) && t.closedAt);
  const ages = closed.map(t => ticketAge(t, today)).filter(x => x != null);
  const sat = T.map(t => Number(t.satisf)).filter(x => x > 0);
  const month = I.filter(i => i.a && String(i.a).slice(0, 7) === m0 && i.st !== "Annulée");
  return {
    open: open.length, high: open.filter(t => t.prio === "h").length,
    avgDays: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
    satisf: sat.length ? Math.round(sat.reduce((a, b) => a + b, 0) / sat.length * 10) / 10 : null,
    toPlan: I.filter(i => i.st !== "Annulée" && (!i.a || !i.b || i.st === "À planifier")).length,
    noTech: I.filter(i => i.st === "Planifiée" && !i.resp).length,
    cloIncomplete: I.filter(i => (i.st === "Réalisée" || i.st === "Validée") && (i.clo || []).length < CLO_ITEMS.length).length,
    manDays: month.reduce((s, i) => s + interDays(i) * interTeam(i).length, 0),
    monthCost: month.reduce((s, i) => s + interCost(i), 0),
    demandes: Object.values((dem && dem.items) || {}).filter(d => d && d.st === "attente").length,
  };
}

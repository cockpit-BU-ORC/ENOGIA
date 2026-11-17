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
  const inter = { tk: tid, pj: dem.pj, obj: dem.obj || "", type: dem.interType || "Maintenance curative", resp: "", who: [], a: days[0], b: days[days.length - 1], st: "À planifier", prep: [], clo: [], costs: {} }; // v335 : dates à confirmer avec le client
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
    Object.assign(e, { nom: e.nom || p.nom || "", pays: p.pays || e.pays || "", info: p }); // v332 : le pays saisi dans le parc l emporte
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

// v332 (demandé : « des KPI sur l'affectation des personnes, interventions, tickets et finance ») — chiffres de la sous-page KPI.
// Période = les `months` derniers mois (glissants, mois en cours compris) ; à venir = interventions planifiées après aujourd'hui.
const DONE_ST = ["Réalisée", "Validée", "Non validée"];
const monthsBack = (t0, n) => { const out = []; const d = new Date(t0.slice(0, 7) + "-01T12:00:00"); for (let k = 0; k < n; k++) { out.unshift(isoD(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); } return out; };
const workDaysIn = (a, b, from, to) => { const s = a > from ? a : from, e = b < to ? b : to; if (!s || !e || s > e) return 0; let n = 0; const d = new Date(s + "T12:00:00"), E = new Date(e + "T12:00:00"); while (d <= E) { if (d.getDay() % 6) n++; d.setDate(d.getDate() + 1); } return n; };
export function savStats(doc, techs, today = new Date(), months = 12) {
  const t0 = isoD(today), M = monthsBack(t0, months), from = M[0] + "-01";
  const ahead = (() => { const d = new Date(t0 + "T12:00:00"); d.setDate(d.getDate() + 90); return isoD(d); })();
  const T = Object.entries((doc && doc.tickets) || {}).map(([id, t]) => ({ id, ...t })).filter(t => t && t.type);
  const I = Object.entries((doc && doc.inters) || {}).map(([id, i]) => ({ id, ...i })).filter(i => i && i.st !== "Annulée");
  const inPer = i => i.a && i.b && i.b >= from && i.a <= t0;
  // personnes : jours d'intervention (jours ouvrés) sur la période et dans les 90 prochains jours, comme responsable ou en appui
  const names = [...new Set([...(techs || []), ...I.flatMap(interTeam)])];
  const people = names.map(n => { const mine = I.filter(i => interTeam(i).includes(n));
    return { name: n, past: mine.reduce((s, i) => s + (inPer(i) ? workDaysIn(i.a, i.b, from, t0) : 0), 0), next: mine.reduce((s, i) => s + (i.a && i.b ? workDaysIn(i.a, i.b, isoD(new Date(new Date(t0 + "T12:00:00").getTime() + dayMs)), ahead) : 0), 0),
      lead: mine.filter(i => i.resp === n && inPer(i)).length, support: mine.filter(i => i.resp !== n && inPer(i)).length }; })
    .sort((a, b) => b.past + b.next - (a.past + a.next) || a.name.localeCompare(b.name));
  const workdays = workDaysIn(from, t0, from, t0) || 1;
  // interventions
  const per = I.filter(inPer), done = per.filter(i => DONE_ST.includes(i.st));
  const byType = {}; per.forEach(i => { byType[i.type || "Autre"] = (byType[i.type || "Autre"] || 0) + 1; });
  const ok = done.filter(i => i.reussite === "Succès").length, judged = done.filter(i => i.reussite).length;
  const inters = { count: per.length, done: done.length, upcoming: I.filter(i => i.a && i.a > t0).length, toPlan: I.filter(i => !i.a || !i.b || !i.resp).filter(i => !DONE_ST.includes(i.st)).length,
    avgDays: per.length ? Math.round(per.reduce((s, i) => s + interDays(i), 0) / per.length * 10) / 10 : null,
    success: judged ? Math.round(ok / judged * 100) : null, prepFull: per.length ? Math.round(per.filter(i => (i.prep || []).length >= PREP_ITEMS.length).length / per.length * 100) : null,
    cloFull: done.length ? Math.round(done.filter(i => (i.clo || []).length >= CLO_ITEMS.length).length / done.length * 100) : null,
    byType: Object.entries(byType).sort((a, b) => b[1] - a[1]) };
  // tickets
  const opened = T.filter(t => t.date && t.date >= from), closed = T.filter(t => isClosed(t) && t.closedAt && t.closedAt >= from);
  const ages = closed.map(t => ticketAge(t, today)).filter(x => x != null);
  const tByType = {}; opened.forEach(t => { const l = typeOf(t.type)[1]; tByType[l] = (tByType[l] || 0) + 1; });
  const sat = closed.map(t => Number(t.satisf)).filter(x => x > 0);
  const tickets = { open: T.filter(t => !isClosed(t)).length, high: T.filter(t => !isClosed(t) && t.prio === "h").length, opened: opened.length, closed: closed.length,
    avgDays: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null, over30: T.filter(t => !isClosed(t) && (ticketAge(t, today) || 0) > 30).length,
    satisf: sat.length ? Math.round(sat.reduce((a, b) => a + b, 0) / sat.length * 10) / 10 : null,
    byType: Object.entries(tByType).sort((a, b) => b[1] - a[1]),
    byMonth: M.map(m => ({ m, opened: T.filter(t => String(t.date || "").slice(0, 7) === m).length, closed: T.filter(t => String(t.closedAt || "").slice(0, 7) === m).length })) };
  // finance : coûts des interventions par mois (mois d'arrivée), par poste, par PJ ; forfaits des contrats en cours
  const costM = M.map(m => ({ m, v: I.filter(i => String(i.a || "").slice(0, 7) === m).reduce((s, i) => s + interCost(i), 0) }));
  const byField = COST_FIELDS.map(([k, l]) => [l, per.reduce((s, i) => s + (Number((i.costs || {})[k]) || 0), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const byPj = {}; per.forEach(i => { const c = interCost(i); if (c) byPj[i.pj] = (byPj[i.pj] || 0) + c; });
  const parc = Object.values((doc && doc.parc) || {}).filter(p => p && p.contrat && p.contrat !== "Sans contrat");
  const finance = { total: costM.reduce((s, x) => s + x.v, 0), byMonth: costM, byField, byPj: Object.entries(byPj).sort((a, b) => b[1] - a[1]).slice(0, 6),
    perInter: per.filter(i => interCost(i) > 0).length ? Math.round(per.reduce((s, i) => s + interCost(i), 0) / per.filter(i => interCost(i) > 0).length) : null,
    contracts: parc.filter(p => (p.contratStatut || "En cours") === "En cours").length, forfaits: parc.filter(p => (p.contratStatut || "En cours") === "En cours").reduce((s, p) => s + (Number(p.forfait) || 0), 0) };
  return { from, months: M, workdays, people, inters, tickets, finance };
}

// v332 (demandé : « dans le parc, les fournitures ENOGIA : ORC, drycooler, conteneur… ; ajouter / supprimer des fournitures »)
export const FOURN_TYPES = ["ORC", "Drycooler", "Conteneur", "Armoire électrique", "Skid", "Turbine", "Échangeur", "Pompe"];
export const fournTypesOf = doc => (doc && Array.isArray(doc.fournTypes) && doc.fournTypes.length ? doc.fournTypes : FOURN_TYPES);
// lit la colonne « Fourniture Enogia » du fichier SAV (« ORC + Drycooler », « ORC, conteneur ») → [{ id, type, qte }]
export function parseFourn(txt, types = FOURN_TYPES) {
  return String(txt || "").split(/[+,;/]| et /i).map(s => s.trim()).filter(Boolean).map((s, k) => {
    const m = /^(\d+)\s*[x×]?\s*(.+)$/i.exec(s), name = (m ? m[2] : s).trim(), t = types.find(x => x.toLowerCase() === name.toLowerCase());
    return { id: "f" + (k + 1), type: t || name.charAt(0).toUpperCase() + name.slice(1), qte: m ? +m[1] : 1 };
  });
}
export const fournLabel = list => (Array.isArray(list) ? list : []).map(f => (f.qte > 1 ? f.qte + " × " : "") + f.type).join(" · ");

// v332 (demandé : « à chaque étape, pouvoir mettre un commentaire ») : ticket.stepNotes = { [n° d'étape]: [{ t, by, at }] }
export function addStepNote(t, step, text, by, at = new Date().toISOString()) {
  const n = { ...((t && t.stepNotes) || {}) }; n[step] = [...(n[step] || []), { t: String(text).trim(), by: by || "", at }]; return { ...t, stepNotes: n };
}
export function delStepNote(t, step, k) { const n = { ...((t && t.stepNotes) || {}) }; n[step] = (n[step] || []).filter((_, j) => j !== k); if (!n[step].length) delete n[step]; return { ...t, stepNotes: n }; }

// v377 (demandé : « une seule ligne pour le chef de projet : réservé en bleu, possible en pointillé, libre = il met sa date ; règle liée au
// nombre de ressources disponibles ») — v379 (demandé : « dans l'équipe, sélectionner ou non les personnes et avoir leur calendrier pour
// indiquer leurs jours off et leurs congés ») : la capacité d'un jour = les personnes de l'équipe qui comptent dans les ressources et sont
// disponibles ce jour-là. planning/sav.dispo = { [nom]: { exclu, weekOff: [jours 1–5], days: { AAAA-MM-JJ: "off" | "conge" } } }.
export const DISPO_KINDS = { off: "Jour off", conge: "Congés" };
export function unavailableWhy(dispo, name, d) {
  const p = (dispo && dispo[name]) || {};
  if (p.exclu) return "hors ressources";
  if ((p.weekOff || []).includes(new Date(d + "T12:00:00").getDay())) return "jour off chaque semaine";
  return p.days && p.days[d] ? DISPO_KINDS[p.days[d]] || "indisponible" : "";
}
export const isAvailable = (dispo, name, d) => !unavailableWhy(dispo, name, d);
export const availTechs = (techs, dispo, d) => (techs || []).filter(t => isAvailable(dispo, t, d));
// Pose (ou retire, kind vide) un type d'absence sur les jours ouvrés d'une période ; renvoie un nouveau dispo
export function setAbsence(dispo, name, from, to, kind) {
  const p = { ...((dispo && dispo[name]) || {}) }, days = { ...(p.days || {}) };
  for (let d = from; d && d <= to; d = addD(d, 1)) { const w = new Date(d + "T12:00:00").getDay(); if (w === 0 || w === 6) continue; if (kind) days[d] = kind; else delete days[d]; }
  return { ...(dispo || {}), [name]: { ...p, days } };
}
const addD = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); const p = v => String(v).padStart(2, "0"); return x.getFullYear() + "-" + p(x.getMonth() + 1) + "-" + p(x.getDate()); };
// État d'un jour pour les chefs de projet : les personnes disponibles occupées par une intervention, les interventions sans personne
// disponible (une ressource chacune) et les demandes en attente (une chacune) prennent la place. full = plus rien de libre ;
// some = déjà des réservations mais encore de la place (« possible sous réserve ») ; free = rien de réservé.
export function slotDays(inters, techs, pend, days, dispo) {
  const list = Object.values(inters || {}).filter(i => i && i.a && i.b && i.st !== "Annulée");
  const dems = (pend || []).map(p => { const L = workDaysFrom(p.date, Math.max(1, Number(p.days) || 1)); return { from: L[0], to: L[L.length - 1] }; });
  return days.map(d => {
    const av = availTechs(techs, dispo, d), on = list.filter(i => i.a <= d && i.b >= d), busy = new Set();
    let extra = 0;
    on.forEach(i => { const t = interTeam(i).filter(x => av.includes(x)); if (t.length) t.forEach(x => busy.add(x)); else extra++; });
    extra += dems.filter(p => p.from <= d && p.to >= d).length;
    const cap = av.length, used = busy.size + extra, left = Math.max(0, cap - used);
    return { d, cap, used, left, state: cap <= 0 || used >= cap ? "full" : used > 0 ? "some" : "free" };
  });
}

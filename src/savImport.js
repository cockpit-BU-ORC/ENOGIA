// v330 (demandé : « une carte du monde pour chaque PJ du parc » + « d'après le fichier Google Sheet, rajoute le passé dans le Cockpit »)
// 1. Positions des sites : coordonnées saisies (parc[PJ].lat / lon), sinon centre du pays (table ci-dessous, noms français ou anglais).
// 2. Reprise unique de l'historique du fichier « [SAV] Tickets et interventions » (export Excel) : feuilles Tickets_SAV, Interventions,
//    Parc_Projets, Parc_ORC, Suivi_contrats → { tickets, inters, parc, techs } au format de planning/sav. Fonctions pures (testées).
import { TICKET_TYPES, flowOf, PREP_ITEMS, CLO_ITEMS, INTER_STATUS, parseFourn } from "./savModel";

const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

// Centre approximatif de chaque pays [latitude, longitude]
const LL = {
  FRANCE: [46.6, 2.4], "LA REUNION": [-21.1, 55.5], "FR LA REUNION": [-21.1, 55.5], REUNION: [-21.1, 55.5], GUADELOUPE: [16.2, -61.6], MARTINIQUE: [14.6, -61], "NOUVELLE CALEDONIE": [-21.3, 165.5], "POLYNESIE FRANCAISE": [-17.6, -149.4], GUYANE: [4, -53],
  ALLEMAGNE: [51.2, 10.4], GERMANY: [51.2, 10.4], ITALIE: [42.8, 12.6], ITALY: [42.8, 12.6], ESPAGNE: [40.2, -3.6], SPAIN: [40.2, -3.6], UK: [53.8, -1.9], "ROYAUME UNI": [53.8, -1.9], ANGLETERRE: [52.5, -1.5], ECOSSE: [56.8, -4.2], "UNITED KINGDOM": [53.8, -1.9],
  BELGIQUE: [50.6, 4.6], "PAYS BAS": [52.2, 5.5], NETHERLANDS: [52.2, 5.5], SUISSE: [46.8, 8.2], AUTRICHE: [47.6, 14.1], POLOGNE: [52.1, 19.4], DANEMARK: [56, 9.6], SUEDE: [62.2, 16.1], NORVEGE: [61.4, 9.1], FINLANDE: [63.2, 26.3], ISLANDE: [64.9, -18.6],
  IRLANDE: [53.2, -8.1], PORTUGAL: [39.6, -8.1], GRECE: [39.1, 22], TCHEQUIE: [49.8, 15.5], "REPUBLIQUE TCHEQUE": [49.8, 15.5], HONGRIE: [47.2, 19.4], ROUMANIE: [45.9, 24.9], BULGARIE: [42.7, 25.2], CROATIE: [45.1, 15.6], SLOVAQUIE: [48.7, 19.7], SLOVENIE: [46.1, 14.8],
  LITUANIE: [55.3, 23.9], LETTONIE: [56.9, 24.9], ESTONIE: [58.7, 25.5], LUXEMBOURG: [49.8, 6.1], TURQUIE: [39, 35.2], RUSSIE: [61.5, 97], UKRAINE: [49, 31.4], SERBIE: [44, 20.9],
  MAROC: [31.8, -7.1], ALGERIE: [28.2, 2.6], TUNISIE: [34.1, 9.6], EGYPTE: [26.6, 30.8], NIGERIA: [9.6, 8.1], KENYA: [0.2, 37.9], "AFRIQUE DU SUD": [-29, 25.1], SENEGAL: [14.4, -14.5], "COTE D IVOIRE": [7.6, -5.5], GHANA: [7.9, -1], ETHIOPIE: [8.6, 39.6], CAMEROUN: [5.7, 12.4], MADAGASCAR: [-19.4, 46.7], MAURICE: [-20.3, 57.6],
  OMAN: [20.6, 56.1], "ARABIE SAOUDITE": [24, 45], "EMIRATS ARABES UNIS": [23.9, 54.3], EAU: [23.9, 54.3], QATAR: [25.3, 51.2], ISRAEL: [31.4, 35], JORDANIE: [31.2, 36.5], LIBAN: [33.9, 35.9],
  INDE: [22.9, 79.6], CHINE: [35.9, 104.2], JAPON: [36.6, 138.2], JAPAN: [36.6, 138.2], JAP: [36.6, 138.2], COREE: [36.4, 127.9], "COREE DU SUD": [36.4, 127.9], TAIWAN: [23.7, 121], THAILANDE: [15.1, 101], VIETNAM: [16.1, 106.3], MALAISIE: [4.2, 102],
  SINGAPORE: [1.35, 103.8], SINGAPOUR: [1.35, 103.8], INDONESIE: [-2.5, 117.9], PHILIPPINES: [12.9, 122.9], AUSTRALIE: [-25.7, 134.5], "NOUVELLE ZELANDE": [-41.8, 172.8],
  CANADA: [56.1, -106.3], "ETATS UNIS": [39.8, -98.6], USA: [39.8, -98.6], MEXIQUE: [23.6, -102.5], BRESIL: [-10.8, -52.9], ARGENTINE: [-35.4, -65.2], CHILI: [-35.7, -71.5], COLOMBIE: [4.1, -72.9], PEROU: [-9.2, -75],
};
export function countryLL(pays) { const k = norm(pays); if (LL[k]) return LL[k]; const hit = Object.keys(LL).find(x => k.startsWith(x) || x.startsWith(k)); return k && hit ? LL[hit] : null; }
// Points de la carte : un par projet du parc ; plusieurs projets d'un même pays sans coordonnées sont écartés en spirale
export function mapPoints(parcList) {
  const seen = {}, out = [];
  (parcList || []).forEach(p => {
    const lat = Number(p.info && p.info.lat), lon = Number(p.info && p.info.lon);
    const has = isFinite(lat) && isFinite(lon) && p.info.lat !== "" && p.info.lat != null;
    // v332 : plusieurs projets dans la même ville sont aussi écartés en spirale
    const c = has ? [lat, lon] : countryLL(p.pays); if (!c) return;
    const k = c.join(","), n = seen[k] = (seen[k] || 0) + 1, r = n > 1 ? 0.9 * Math.sqrt(n - 1) : 0, a = n * 2.4;
    const r2 = has ? r * 0.25 : r;
    out.push({ ...p, lat: c[0] + r2 * Math.sin(a), lon: c[1] + r2 * Math.cos(a), exact: has });
  });
  return out;
}

// ── Reprise de l'historique ──
const s = v => String(v == null ? "" : v).trim();
export function isoOf(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), 12)).toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  const t = s(v); let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  m = t.match(/^(\d{1,2})\/(\d{4})$/); if (m) return m[2] + "-" + m[1].padStart(2, "0") + "-01";
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  return null;
}
export const euros = v => { if (typeof v === "number") return v; const t = s(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); const n = parseFloat(t); return isFinite(n) ? n : null; };
const list = v => s(v).split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
// en-tête : première ligne contenant la colonne clé ; renvoie des objets { nom de colonne normalisé : valeur }
export function rowsOf(aoa, key) {
  const K = norm(key), h = (aoa || []).findIndex(r => (r || []).some(c => norm(c) === K)); if (h < 0) return [];
  const head = aoa[h].map(norm);
  return aoa.slice(h + 1).map(r => { const o = {}; head.forEach((k, i) => { if (k && !(k in o)) o[k] = (r || [])[i]; }); return o; });
}
const g = (o, ...keys) => { for (const k of keys) { const v = o[norm(k)]; if (v != null && s(v) !== "") return v; } return ""; };
const TYPE_MAP = [[/CURATIVE/, "cur"], [/PREVENTIVE/, "prev"], [/MISE EN SERVICE/, "mes"], [/DEVIS/, "dev"], [/QUESTION.*TECH/, "qtech"], [/QUESTION.*COMM/, "qcom"], [/AUDIT/, "audit"], [/DIAGNOSTIC/, "diag"]];
const typeKey = v => { const k = norm(v); const m = TYPE_MAP.find(([re]) => re.test(k)); return m ? m[1] : "autre"; };
const prioKey = v => { const k = norm(v); return k.startsWith("HAUT") ? "h" : k.startsWith("BAS") ? "b" : "m"; };
const pickItems = (v, ref) => { const R = ref.map(x => [norm(x).slice(0, 12), x]); return [...new Set(list(v).map(x => { const k = norm(x).slice(0, 12); const hit = R.find(([r]) => r === k) || R.find(([r]) => r.slice(0, 7) === k.slice(0, 7)); return hit ? hit[1] : null; }).filter(Boolean))]; };
const INTER_ST = { "EN ATTENTE DE PLANIFICATION": "À planifier", CREE: "À planifier", PLANIFIEE: "Planifiée", "EN COURS": "En cours", REALISEE: "Réalisée", VALIDEE: "Validée", "NON VALIDEE": "Non validée", ANNULE: "Annulée", ANNULEE: "Annulée" };
const cap = t => s(t).toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());

export function parseSavHistory(sheets) {
  const tickets = {}, inters = {}, parc = {}, techs = new Set(), skipped = [];
  rowsOf(sheets.Tickets_SAV, "N° de tickets").forEach(r => {
    const id = s(g(r, "N° de tickets")); if (!/^TC-\d{2}-\d+$/i.test(id)) return;
    const type = typeKey(g(r, "Type de demande")), F = flowOf(type), last = F.length - 1;
    const etat = s(g(r, "État de la demande")), n = parseInt(etat, 10), closed = /FERM/.test(norm(g(r, "Statut"))) || (/TERMIN|CLOTUR/.test(norm(etat)) && isFinite(n) && n >= last - 1);
    const step = closed ? last : Math.max(0, Math.min(last - 1, isFinite(n) ? n : 0));
    const date = isoOf(g(r, "Date de la demande")), closedAt = closed ? (isoOf(g(r, "Date de clôture")) || date) : null;
    const notes = [s(g(r, "Actions / Commentaires / Avancement")), s(g(r, "Commentaires"))].filter(Boolean).join("\n");
    const sat = parseInt(g(r, "Satisfaction client"), 10), resp = s(g(r, "Responsable du ticket"));
    tickets[id.toUpperCase()] = { pj: s(g(r, "N° de projet")).toUpperCase(), type, prio: prioKey(g(r, "Priorité")), step, resp, orig: s(g(r, "Origine de la demande")) || "Client", date, det: s(g(r, "Détails")),
      inters: list(g(r, "N° intervention(s) liée(s)", "N° intervention(s) liee(s)")).map(x => x.toUpperCase()).filter(x => /^INT-\d+$/.test(x)),
      ...(closedAt ? { closedAt } : {}), ...(sat >= 1 && sat <= 5 ? { satisf: sat } : {}), ...(notes ? { notes } : {}), ...(s(g(r, "Documents annexes")) ? { docs: s(g(r, "Documents annexes")) } : {}), histo: true };
    if (resp) techs.add(resp);
  });
  rowsOf(sheets.Interventions, "N° d'intervention").forEach(r => {
    const id = s(g(r, "N° d'intervention")).toUpperCase(); if (!/^INT-\d+$/.test(id)) return;
    const st = INTER_ST[norm(g(r, "Statut"))] || (INTER_STATUS.includes(s(g(r, "Statut"))) ? s(g(r, "Statut")) : "Réalisée");
    const resp = s(g(r, "Responsable intervention")), who = list(g(r, "Intervenants")).filter(x => x !== resp);
    const costs = { pdr: euros(g(r, "Coûts PdR")), transpPdr: euros(g(r, "Coûts transport PdR")), voyage: euros(g(r, "Coûts transports (vol/train)")), heberg: euros(g(r, "Coûts hébergements")), repas: euros(g(r, "Coûts repas")) };
    Object.keys(costs).forEach(k => { if (costs[k] == null) delete costs[k]; });
    inters[id] = { tk: (list(g(r, "Ticket(s) lié(s)", "Ticket(s) lie(s)"))[0] || "").toUpperCase(), pj: s(g(r, "N° de projet")).toUpperCase(), obj: s(g(r, "Objectifs de l'intervention")), type: s(g(r, "Type d'intervention")) || "Autre",
      resp, who, a: isoOf(g(r, "Date d'arrivée")), b: isoOf(g(r, "Date de départ")), st, prep: pickItems(g(r, "Préparation d'intervention"), PREP_ITEMS), clo: pickItems(g(r, "Clôture d'intervention"), CLO_ITEMS),
      ...(s(g(r, "Réussite intervention")) ? { reussite: s(g(r, "Réussite intervention")) } : {}), ...(isoOf(g(r, "Date de clôture")) ? { closedAt: isoOf(g(r, "Date de clôture")) } : {}), costs, histo: true };
    if (!inters[id].a) delete inters[id].a; if (!inters[id].b) delete inters[id].b;
    [resp, ...who].filter(Boolean).forEach(x => techs.add(x));
  });
  // Parc : projets (sans coordonnées personnelles des clients), S/N des machines, contrats
  rowsOf(sheets.Parc_Projets, "PROJET").forEach(r => {
    const pj = s(g(r, "PROJET")).toUpperCase(); if (!/^PJ\w+/.test(pj)) return;
    const c = s(g(r, "Contrat de maintenance")), contrat = /PREMIUM/i.test(c) ? "Premium" : /STANDARD/i.test(c) ? "Standard" : "Sans contrat";
    parc[pj] = { ...(parc[pj] || {}), nom: s(g(r, "Nom du projet")), pays: cap(g(r, "Pays")), gamme: s(g(r, "Type d'ORC")), nbOrc: parseInt(g(r, "Nombre d'ORC"), 10) || null, mes: isoOf(g(r, "Date de mise en service")),
      application: s(g(r, "Application")), visitable: s(g(r, "Visitable")), contrat, contratNo: s(g(r, "N° de contrat")), adresse: s(g(r, "Adresse du site")), notes: s(g(r, "Dispositions particulières")).replace(/^-$/, ""), statut: s(g(r, "Statut")) };
    // v332 : fournitures ENOGIA (« ORC + Drycooler ») ; le nombre d ORC de la ligne fixe la quantité d ORC
    const fo = parseFourn(g(r, "Fourniture Enogia", "Fourniture ENOGIA")); if (fo.length) { const n = parc[pj].nbOrc; parc[pj].fourn = fo.map(x => (x.type === "ORC" && n ? { ...x, qte: n } : x)); }
  });
  rowsOf(sheets.Parc_ORC, "N° de série").forEach(r => {
    const sn = s(g(r, "N° de série")), pjs = list(g(r, "Projet(s) rattaché(s)", "Projet(s) rattache(s)")).map(x => x.toUpperCase()).filter(x => /^PJ/.test(x));
    if (!sn || !pjs.length) return; const pj = pjs[0]; const e = parc[pj] = parc[pj] || {};
    e.sn = [...new Set([...(e.sn || []), sn])]; if (!e.gamme && s(g(r, "Type d'ORC"))) e.gamme = s(g(r, "Type d'ORC")); if (!e.mes) e.mes = isoOf(g(r, "Date de MES"));
  });
  rowsOf(sheets.Suivi_contrats, "N° de contrat").forEach(r => {
    const pj = s(g(r, "N° de projet")).toUpperCase(); if (!/^PJ/.test(pj)) return; const e = parc[pj] = parc[pj] || {};
    const t = s(g(r, "Type de contrat")); if (t) e.contrat = /PREMIUM/i.test(t) ? "Premium" : /STANDARD/i.test(t) ? "Standard" : e.contrat || "Sans contrat";
    Object.assign(e, { contratNo: s(g(r, "N° de contrat")) || e.contratNo || "", contratStatut: s(g(r, "Statut du contrat")), forfait: euros(g(r, "Montant du forfait annuel (€)")), contratDebut: isoOf(g(r, "Date de lancement")),
      preventive: isoOf(g(r, "Date de notification de la prochaine maintenance préventive")) || e.preventive || null, contratFin: isoOf(g(r, "Date de fin/suspension du contrat")) });
  });
  Object.values(parc).forEach(e => Object.keys(e).forEach(k => { if (e[k] == null || e[k] === "") delete e[k]; }));
  return { tickets, inters, parc, techs: [...techs].sort((a, b) => a.localeCompare(b, "fr")), skipped };
}
// Ce que la reprise ajoute sans écraser ce qui a déjà été saisi dans le Cockpit
export function historyPlan(doc, hist) {
  const D = doc || {}, keep = (cur, inc) => Object.fromEntries(Object.entries(inc).filter(([k]) => !(cur || {})[k]));
  const tickets = keep(D.tickets, hist.tickets), inters = keep(D.inters, hist.inters);
  const parc = Object.fromEntries(Object.entries(hist.parc).map(([k, v]) => [k, { ...v, ...((D.parc || {})[k] || {}) }]));
  return { tickets, inters, parc, techs: (Array.isArray(D.techs) && D.techs.length ? D.techs : hist.techs),
    counts: { tickets: Object.keys(tickets).length, inters: Object.keys(inters).length, parc: Object.keys(parc).length, dejaT: Object.keys(hist.tickets).length - Object.keys(tickets).length, dejaI: Object.keys(hist.inters).length - Object.keys(inters).length } };
}
export const TYPES_LABELS = TICKET_TYPES.map(t => t[1]);

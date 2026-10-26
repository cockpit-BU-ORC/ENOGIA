// Import d'un export MS Project (Excel) EN CONSERVANT les liens : colonnes Nom, Début (obligatoires) + Durée, Fin, Prédécesseurs,
// Niveau hiérarchique, ID (recommandées). Les lignes de niveau 1 sont les PJ, celles de niveau 2 portant le nom d'une des
// 5 étapes sont les étapes. Un lien vers une ligne qui n'est pas une étape est ignoré et signalé dans le rapport.
import { parseDateAny, toLocalISO } from "../parsers";
import { nodeKey, STEP_KEYS, schedule, rebuildOrder, DEFAULT_CAP, DEFAULT_RULES } from "./engine";

const STEP_MAP = { "arrivée": "arrivee", "arrivee": "arrivee", "production": "production", "tests": "tests", "test": "tests", "fin de production": "finProd", "fin production": "finProd", "départ": "depart", "depart": "depart" };
const TYPE_MAP = { FS: "FS", FD: "FS", SS: "SS", DD: "SS", FF: "FF", SF: "SF", DF: "SF" };

// "12 jours", "3 j", "2 sem", "0 jour", "4,5 j?" → jours ouvrés (arrondi au-dessus) ; null si illisible
export function parseDuration(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.max(0, Math.ceil(v));
  const m = String(v).trim().toLowerCase().replace(",", ".").match(/^(-?\d+(?:\.\d+)?)\s*([a-zé%.]*)\??$/);
  if (!m) return null;
  const n = parseFloat(m[1]), u = m[2];
  let d = n;
  if (/^(sem|w)/.test(u)) d = n * 5; else if (/^(mois|mo)/.test(u)) d = n * 21; else if (/^(h|hr|heure)/.test(u)) d = n / 8;
  else if (/^(ed|jc|jcal|edays)/.test(u)) d = n * 5 / 7;
  return Math.max(0, Math.ceil(d - 1e-9));
}

// "12;14FS+3 jours;15SS-2j;20DD" → [{id, type, lag, warn}]
export function parsePredecessors(txt) {
  if (txt == null) return [];
  const s = String(txt).trim().replace(/([+-]\s*\d+),(\d+)/g, "$1.$2");
  if (!s) return [];
  return s.split(/[;,]/).map(x => x.trim()).filter(Boolean).map(piece => {
    const m = piece.match(/^(\d+)\s*([A-Za-z]{2})?\s*(?:([+-])\s*(\d+(?:\.\d+)?)\s*([A-Za-zéÉ%.]*))?\s*$/);
    if (!m) return { id: null, raw: piece, warn: "lien illisible : « " + piece + " »" };
    const type = m[2] ? TYPE_MAP[m[2].toUpperCase()] : "FS";
    if (!type) return { id: null, raw: piece, warn: "type de lien inconnu : « " + piece + " »" };
    let lag = 0, warn = null;
    if (m[3]) {
      const n = parseFloat(m[4]) * (m[3] === "-" ? -1 : 1), u = (m[5] || "").toLowerCase();
      if (u.includes("%")) { warn = "décalage en % ignoré (« " + piece + " »)"; }
      else if (/^(sem|w)/.test(u)) lag = n * 5;
      else if (/^(mois|mo)/.test(u)) lag = n * 21;
      else if (/^(h|hr|heure)/.test(u)) lag = Math.round(n / 8);
      else if (/^(ed|jc|jcal|edays)/.test(u)) { lag = Math.round(n * 5 / 7); warn = "décalage en jours calendaires converti en jours ouvrés (« " + piece + " »)"; }
      else lag = Math.round(n);
    }
    return { id: Number(m[1]), type, lag, warn };
  });
}

const firstOf = (steps, order) => order.find(k => steps[k]) || null;

export function parseMsPlan(rows, cal, currentRows) {
  if (!rows || rows.length < 2) return null;
  const header = rows[0].map(h => (h || "").toString().toLowerCase().trim());
  const idx = f => header.findIndex(f);
  const iNom = idx(h => h.includes("nom") || h.includes("name"));
  const iDeb = idx(h => h.includes("début") || h.includes("debut") || h.includes("start"));
  const iFin = idx(h => h === "fin" || h === "finish" || h === "end" || h.startsWith("fin "));
  const iNiv = idx(h => h.includes("niveau") || h.includes("level") || h.includes("hiérar") || h.includes("hierar"));
  const iId = idx(h => ["id", "n°", "no", "no.", "numéro", "numero", "identifiant", "id tâche", "id tache", "unique id"].includes(h));
  const iPred = idx(h => h.includes("prédécesseur") || h.includes("predecesseur") || h.includes("predecessor"));
  const iDur = idx(h => h === "durée" || h === "duree" || h === "duration" || h.startsWith("durée") || h.startsWith("duree"));
  if (iNom < 0 || iDeb < 0) return null;

  const report = { hasIds: iId >= 0, hasPreds: iPred >= 0, hasDur: iDur >= 0, ignoredLinks: [], warnings: [], pjCount: 0, stepCount: 0, linkCount: 0 };
  if (iPred < 0) report.warnings.push("Aucune colonne « Prédécesseurs » dans ce fichier : le plan sera créé sans liens.");
  if (iId < 0) report.warnings.push("Pas de colonne « ID » : le numéro de ligne du fichier sert d'identifiant dans les prédécesseurs (valable si l'export contient toutes les tâches, dans l'ordre).");

  const cur = {}; (currentRows || []).forEach(r => { cur[r.pj] = r; });
  const pjs = []; const msDates = {}; const idMap = {}; const predText = {}; const names = {};
  let pj = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]; if (!row || row.length < 2) continue;
    const nom = (row[iNom] || "").toString().trim(); if (!nom) continue;
    const rowId = iId >= 0 && row[iId] !== "" && row[iId] != null && !isNaN(Number(row[iId])) ? Number(row[iId]) : i;
    const nomL = nom.toLowerCase(); names[rowId] = nom;
    const niv = iNiv >= 0 ? parseInt(row[iNiv]) || 0 : 0;
    const deb = parseDateAny(row[iDeb]), fin = iFin >= 0 ? parseDateAny(row[iFin]) : null;
    const step = STEP_MAP[nomL];
    if (niv === 1 || (niv === 0 && !step)) {
      const m = nom.match(/PJ[\w-]+/i) || nom.match(/SAV\d+/i);
      const code = m ? m[0].toUpperCase() : nom.split(/[-–]/)[0].trim();
      let extra = null;
      if (m) { const rest = nom.slice(m.index + m[0].length).replace(/^[\s\-–:]+/, "").trim(); if (rest) extra = rest; }
      pj = { pj: code, nomProjet: extra || (cur[code] && cur[code].nomProjet) || null, hAt: cur[code] ? cur[code].heuresAtelier || 0 : 0, hAu: cur[code] ? cur[code].heuresAutom || 0 : 0, steps: {} };
      pjs.push(pj); idMap[rowId] = { kind: "pj", pj: code };
    } else if (pj && step) {
      const startIso = deb ? toLocalISO(deb) : null, endIso = fin ? toLocalISO(fin) : startIso;
      const isMs = step === "arrivee" || step === "depart";
      let dur = 0;
      if (!isMs) {
        const fromCol = iDur >= 0 ? parseDuration(row[iDur]) : null;
        dur = fromCol != null ? fromCol : (startIso && endIso ? cal.countBetween(startIso, endIso) : 1);
        dur = Math.max(1, dur);
      }
      pj.steps[step] = { dur, snet: null, _ms: startIso };
      if (startIso) msDates[nodeKey(pj.pj, step)] = { start: startIso, finish: endIso || startIso };
      idMap[rowId] = { kind: "step", pj: pj.pj, step };
    } else {
      idMap[rowId] = { kind: "other" };
    }
    if (iPred >= 0 && row[iPred] != null && String(row[iPred]).trim() !== "") predText[rowId] = String(row[iPred]);
  }

  // Liens
  const links = []; const seen = new Set();
  const pjByCode = {}; pjs.forEach(p => { pjByCode[p.pj] = p; });
  const ref = (node, edge, type) => { // edge : "start" | "finish"
    if (node.kind === "step") return nodeKey(node.pj, node.step);
    if (node.kind === "pj") {
      const p = pjByCode[node.pj]; if (!p) return null;
      const k = edge === "start" ? firstOf(p.steps, STEP_KEYS) : firstOf(p.steps, [...STEP_KEYS].reverse());
      return k ? nodeKey(node.pj, k) : null;
    }
    return null;
  };
  Object.keys(predText).forEach(rid => {
    const target = idMap[rid]; if (!target) return;
    parsePredecessors(predText[rid]).forEach(p => {
      if (p.warn) report.warnings.push((names[rid] || "ligne " + rid) + " : " + p.warn);
      if (p.id == null) return;
      const src = idMap[p.id];
      if (!src || src.kind === "other" || target.kind === "other") {
        report.ignoredLinks.push({ to: names[rid] || String(rid), from: names[p.id] || String(p.id), reason: !src ? "ligne introuvable" : "étape non reprise (hors Arrivée / Production / Tests / Fin de production / Départ)" });
        return;
      }
      const fromEdge = (p.type === "FS" || p.type === "FF") ? "finish" : "start";
      const toEdge = (p.type === "FS" || p.type === "SS") ? "start" : "finish";
      const from = ref(src, fromEdge), to = ref(target, toEdge);
      if (!from || !to || from === to) return;
      const sig = from + ">" + to + ">" + p.type + ">" + p.lag; if (seen.has(sig)) return; seen.add(sig);
      links.push({ id: "I" + rid + "_" + p.id, from, to, type: p.type, lag: p.lag || 0 });
    });
  });

  // Dates imposées : uniquement pour les étapes sans prédécesseur (les autres sont pilotées par leurs liens)
  const hasIn = new Set(links.map(l => l.to));
  pjs.forEach(p => Object.keys(p.steps).forEach(k => {
    const st = p.steps[k]; const ms = st._ms; delete st._ms;
    st.snet = !hasIn.has(nodeKey(p.pj, k)) ? ms : null;
  }));
  const kept = pjs.filter(p => p.steps.arrivee || p.steps.depart || Object.keys(p.steps).length);
  report.pjCount = kept.length; report.stepCount = kept.reduce((a, p) => a + Object.keys(p.steps).length, 0); report.linkCount = links.length;
  return { plan: rebuildOrder({ v: 2, cal: { holidays: true }, rules: { ...DEFAULT_RULES }, cap: { ...DEFAULT_CAP }, pjs: kept, links }, cal), msDates, report };
}

// Écarts entre le calcul du moteur et les dates du fichier MS Project : [{key, ms, calc, days, fixable}]
export function compareWithMs(plan, msDates, cal) {
  const sched = schedule({ ...plan, rules: { prod: false, banc: false } }, cal); const out = []; // sans les règles de ressources : on compare l'interprétation des liens
  Object.keys(msDates).forEach(k => {
    const n = sched.nodes[k]; if (!n || n.s === null) return;
    const ms = msDates[k].start; if (n.start === ms) return;
    const a = cal.idxOnOrAfter(ms), b = n.s;
    out.push({ key: k, ms, calc: n.start, days: b - a, fixable: b < a });
  });
  return out;
}
// Cale les étapes en retard sur MS (date calculée plus tôt que dans MS) par une date imposée = date MS
export function applyCalibration(plan, diffs) {
  const fix = new Set(diffs.filter(d => d.fixable).map(d => d.key)); const ms = {}; diffs.forEach(d => { ms[d.key] = d.ms; });
  return { ...plan, pjs: plan.pjs.map(p => ({ ...p, steps: Object.fromEntries(Object.entries(p.steps).map(([k, st]) => [k, fix.has(nodeKey(p.pj, k)) ? { ...st, snet: ms[nodeKey(p.pj, k)] } : st])) })) };
}

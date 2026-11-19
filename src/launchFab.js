// v404 (maquette maquettes-design/v407-passeport-complet.html validée : « Go, code-la ») : fiche de lancement de fab et passeport complet.
// Données (document planning/machines, préfixe beta_ en bêta) :
//   components : [{ id, label, kind: "choix" | "achat" | "option", opts: [..], refs: { gamme: valeur }, scope, off }] — catalogue réglé par le
//                propriétaire et les admins de la page ; « achat » = suivi par Achats / Appro (pas de référence), « option » = « Non requis » possible
//   dims       : { gamme: { L, l, H, P } } — dimensions et poids par gamme (repris tout seuls dans la fiche)
//   elecLists  : { neutre: [..], freq: [..], tension: [..] } — choix électriques proposés
//   launch     : { [PJ]: fiche de lancement de fab } = { date, design: { id: v }, elec: { neutre, freq, tension }, txt: { id: texte },
//                ok: { id: "ok" | "nok" }, inj: { roue, injecteur, plugs: [8 booléens] }, comps: { id: valeur | "__nr" },
//                signs: { rôle: { by, at } }, at, by }
// Le « standard » de la gamme n'est qu'une référence : il propose une valeur et signale un écart (avertissement), jamais un point à suivre.
import { achatsOf } from "./pjDossier";

export const NR = "__nr"; // composant optionnel « Non requis »
export const HOLES = 8;   // trous de l'injecteur
export const SIGN_ROLES = ["Responsable projet", "Responsable production", "Qualité ou RPI", "Chef BE"];
export const ELEC_DEFAULT = { neutre: ["TT", "TN-S", "TN-C", "IT"], freq: ["50 Hz", "60 Hz"], tension: ["400 V", "415 V", "480 V", "690 V"] };
export const ELEC_LABEL = { neutre: "Régime de neutre", freq: "Fréquence", tension: "Tension" };
export const DESIGN_FIELDS = [
  { id: "application", label: "Application", opts: ["Terrestre", "Maritime"] },
  { id: "integration", label: "Intégration", opts: ["Intérieur", "Extérieur"] },
  { id: "multiOrc", label: "Multi-ORC", opts: ["Non", "Oui"] },
  { id: "cem", label: "Optimisé CEM", opts: ["Non", "Oui"] },
  { id: "v2v", label: "Contrôle V2V", opts: ["On/Off", "Proportionnel"] },
  { id: "pid", label: "P&ID", opts: [] },
];
export const QUALITY = [["qChassis", "Châssis"], ["qTuyau", "Tuyauterie"], ["qPeinture", "Peinture"], ["qTank", "Tank"]];
export const DEFAULT_COMPONENTS = [
  { id: "pompe", label: "Pompe cycle", kind: "choix", opts: [] },
  { id: "choke", label: "Choke", kind: "choix", opts: ["Aucun", "0,1 mH", "0,2 mH"] },
  { id: "drive", label: "Drive", kind: "choix", opts: [] },
  { id: "vprop", label: "Vannes proportionnelles", kind: "choix", opts: ["Non", "Oui"] },
  { id: "capteursVib", label: "Capteurs de vibration", kind: "choix", opts: ["IFM", "Wago"] },
  { id: "chassis", label: "Châssis", kind: "achat", scope: "" },
  { id: "armoire", label: "Armoire électrique", kind: "achat", scope: "" },
  { id: "silent", label: "Silent blocs", kind: "option", opts: [] },
  { id: "transfo", label: "Transformateur", kind: "option", opts: [] },
];

const has = v => v != null && String(v).trim() !== "";
export const componentsOf = doc => (doc && Array.isArray(doc.components) && doc.components.length ? doc.components : DEFAULT_COMPONENTS);
export const activeComponents = doc => componentsOf(doc).filter(c => c && !c.off);
// v415 (demandé : « classer par grandeur ou par alphabet les éléments ») : tri naturel, nombres compris
export const sortOpts = list => [...new Set((list || []).map(x => String(x == null ? "" : x).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" }));
export const elecListsOf = doc => Object.fromEntries(Object.entries({ ...ELEC_DEFAULT, ...(((doc && doc.elecLists) || {})) }).map(([k, v]) => [k, Array.isArray(v) ? sortOpts(v) : v]));
export const dimsOf = (doc, gk) => (((doc && doc.dims) || {})[gk]) || null;
export const launchOf = (doc, pj) => (((doc && doc.launch) || {})[pj]) || {};
export const plugsOf = L => { const p = (L && L.inj && Array.isArray(L.inj.plugs)) ? L.inj.plugs : []; return Array.from({ length: HOLES }, (_, i) => !!p[i]); };
export const plugCount = L => plugsOf(L).filter(Boolean).length;
export const refOf = (c, gk) => (c && c.kind !== "achat" && c.refs && has(c.refs[gk]) ? String(c.refs[gk]) : "");
// écart à la référence : avertissement seulement (une valeur plus précise qui commence par la référence n'en est pas un)
export const offRef = (v, ref) => has(v) && has(ref) && v !== NR && !String(v).trim().toLowerCase().startsWith(String(ref).trim().toLowerCase());

// une modification de la fiche : chemin « a.b » → valeur ; horodatée
export function setLaunch(L, path, v, by, at = new Date().toISOString()) {
  const out = JSON.parse(JSON.stringify(L || {})), ks = String(path).split(".");
  let o = out; ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; });
  const last = ks[ks.length - 1];
  if (v == null || v === "") delete o[last]; else o[last] = v;
  out.at = at; out.by = by || "";
  return out;
}
export function togglePlug(L, i, by, at) { const p = plugsOf(L); p[i] = !p[i]; return setLaunch(L, "inj.plugs", p, by, at); }
export function signLaunch(L, role, by, on = true, at = new Date().toISOString()) { return setLaunch(L, "signs." + role, on ? { by: by || "", at } : null, by, at); }
export function launchState(L) {
  const signs = (L && L.signs) || {}, n = SIGN_ROLES.filter(r => signs[r]).length;
  const last = SIGN_ROLES.map(r => signs[r] && signs[r].at).filter(Boolean).sort().pop() || "";
  return { signed: n, total: SIGN_ROLES.length, launched: n === SIGN_ROLES.length, at: n === SIGN_ROLES.length ? last : "" };
}

// pièces arrivées (Achats / Appro) : au lancement de la fab, en général ~90 % des lignes sont livrées
export const READY_PCT = 90;
export function piecesArrived(achatsDoc, pj, todayIso) {
  const a = achatsOf(achatsDoc, pj, todayIso);
  if (!a || !a.lignes) return null;
  const n = a.counts.livre || 0, t = a.lignes, pct = Math.round(n / t * 100);
  const waiting = a.pos.filter(p => p.statut !== "livre").map(p => ({ numero: p.numero, livraison: p.livraison, retard: !!p.retard }));
  return { n, t, pct, ready: pct >= READY_PCT, aCommander: a.counts.apasser || 0, waiting, pos: a.pos, retards: a.retards };
}

// composant suivi par Achats : état de son scope (achatScopes de passport.js)
export function achatOfComp(c, scopes) {
  const k = String((c && c.scope) || "").trim().toUpperCase(); if (!k) return null;
  const s = (scopes || {})[k]; if (!s) return { scope: c.scope, none: true };
  const st = s.lines && s.livre === s.lines ? "livré" : s.late ? "en retard" : s.cmd ? "commandé" : s.apasser ? "à commander" : "—";
  return { scope: c.scope, st, pos: s.pos || [], livre: s.livre, lines: s.lines, late: !!s.late, bad: !!s.late || !!s.nc };
}

// phase courante de la machine d'après son état (fil du passeport)
export const PASS_PHASES = [
  ["arr", "Arrivée dans l'outil"], ["design", "Design"], ["appro", "Appro / Achats"], ["fab", "Fabrication et turbine"],
  ["tests", "Tests"], ["rai", "RAI"], ["depart", "Départ"], ["sav", "MES et SAV"]];
const ETAT_PHASE = { "NOT ORDERED": "design", NON_DESIGNEE: "design", A_DEFINIR: "design", "En fabrication": "appro", STOCKAGE_EXT: "appro",
  MONTAGE: "fab", ELEC: "fab", TESTS: "tests", PACKAGING: "depart", SHIPPED: "sav" };
export function phaseOfEtat(etat) { return ETAT_PHASE[etat] || "design"; }

// fiche de lancement de fab imprimable (PDF par le navigateur) — chaque valeur échappée
const x = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function launchHtml({ pj, gamme, info, L, comps, dims, ready }) {
  const ok = id => { const v = (L.ok || {})[id]; return v === "ok" ? "OK" : v === "nok" ? "NOK" : ""; };
  const row = (l, v, id) => "<tr><td>" + x(l) + "</td><td>" + x(v).replace(/\n/g, "<br>") + "</td><td class=c>" + (id ? ok(id) : "") + "</td></tr>";
  const sec = t => "<tr class=s><td colspan=3>" + x(t) + "</td></tr>";
  const t = L.txt || {}, e = L.elec || {}, d = L.design || {}, inj = L.inj || {}, n = plugCount(L), st = launchState(L);
  let h = "<!doctype html><html lang=fr><head><meta charset=utf-8><title>" + x(pj + " - Fiche de lancement de fab") + "</title><style>body{font:11px/1.4 Roboto,Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0 0 4px}table{border-collapse:collapse;width:100%}td{border:1px solid #999;padding:4px 6px;vertical-align:top}td:first-child{width:32%}.c{width:48px;text-align:center}.s td{background:#D9E2EC;font-weight:600}.m{color:#555}</style></head><body>";
  h += "<h1>Fiche de lancement de fab</h1><div class=m>" + x(pj) + " · " + x(gamme || "") + " · " + (st.launched ? "lancée le " + x(String(st.at).slice(0, 10)) : "brouillon, " + st.signed + " / " + st.total + " signatures") + "</div><br><table><tr class=s><td>Informations / documents</td><td>Commentaires / actions</td><td class=c>OK / NOK</td></tr>";
  h += sec("Informations générales") + row("Numéro de projet", pj) + row("Gamme", gamme) + row("Date du lancement", L.date || "") + row("Responsable du lancement", info.chef || "");
  h += sec("Description de la machine") + row("Numéro de série", info.sn || "") + row("Certification", info.certif || "") + row("Dimensions et poids", dims ? "L " + dims.L + " × l " + dims.l + " × H " + dims.H + " · " + dims.P : "") + row("Spécifications techniques particulières", t.spec || "", "spec")
    + row("Spécifications électriques", [e.neutre, e.freq, e.tension].filter(Boolean).join(", "), "elec") + DESIGN_FIELDS.map(f => row(f.label, d[f.id] || "")).join("") + row("Autre", t.descAutre || "");
  h += sec("Données de fabrication") + row("Plan / nomenclature validée (BOM)", t.bom || "", "bom") + row("Autres modifications", t.mods || "", "mods") + row("Fichiers à imprimer", t.print || "", "print") + row("Délais de fabrication", info.delais || "");
  h += sec("Turbine") + row("Roue", inj.roue || "", "roue") + row("Injecteur", inj.injecteur || "", "injecteur") + row("Bouchages", n + " / " + HOLES + " · " + (HOLES - n) + " ouvertures", "bouchages");
  h += sec("Composants installés" + (ready ? " · pièces arrivées " + ready.pct + " %" : "")) + comps.map(c => row(c.label, c.v, "c-" + c.id)).join("");
  h += sec("Qualité et contrôles") + QUALITY.map(([id, l]) => row(l, t[id] || "", id)).join("");
  h += sec("Logistique et organisation") + row("Planning", info.planning || "") + row("Ressources", t.res || "", "res") + row("Risques identifiés et plans de mitigation", t.risk || "", "risk") + row("Autre", t.logAutre || "");
  h += sec("Validation du lancement") + SIGN_ROLES.map(r => row("Signature " + r, L.signs && L.signs[r] ? L.signs[r].by + " · " + String(L.signs[r].at).slice(0, 10) : "")).join("");
  return h + "</table></body></html>";
}

// v408 : RAI pré-rempli — pour chaque élément du passeport, la valeur connue avant la vérification sur la machine :
// commande Achats (référence · n° de PO, via les lignes du passeport et leur scope), choix du CdP dans la fiche de lancement de fab, roue / injecteur.
const COMP_EL = { pompe: "pompeCycle" };
export function raiPrefill(L, comps, rows) {
  const out = {}, put = (el, v, src) => { if (el && has(v) && !out[el]) out[el] = { v: String(v), src, live: true }; };
  (rows || []).forEach(x => { const a = x && x.achatSt; if (a && ((a.refs || []).length || (a.pos || []).length)) put(x.el.id, [(a.refs || [])[0], (a.pos || []).join(", ")].filter(Boolean).join(" · "), "Achats"); });
  const cv = (L && L.comps) || {};
  (comps || []).forEach(c => { const v = cv[c.id]; if (c.kind !== "achat" && has(v) && v !== NR) put(COMP_EL[c.id] || c.id, v, "Fiche de lancement de fab"); });
  const inj = (L && L.inj) || {}; put("roue", inj.roue, "Fiche de lancement de fab"); put("injecteur", inj.injecteur, "Fiche de lancement de fab");
  return out;
}

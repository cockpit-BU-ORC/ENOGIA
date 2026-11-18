// v394 (maquette v393-rai-photos.html : « Oui, le RAI ») : Rapport d'acceptation interne — la conclusion de la fabrication et des tests
// avant le départ, d'après le modèle Excel « PJXXX-74X-RA001 » : informations, identification des composants, documentation,
// dossier qualité, inspection visuelle, plan d'actions, validation par service. Les S/N des composants sont ceux du passeport
// (élément `pass`) : saisis ici, ils y retournent (phase fabrication, source « RAI »).
// Données : planning/machines.rai[PJ] = { rows: { [id]: { ok: "OK" | "NOK" | "SO", c, loc, sn, by, at } },
//   actions: [{ id, t, bloq, pole, at, done, nc, by }], signs: { [service]: { by, at, rem } }, at }

import { safeImgUrl, STEP_LABEL } from "./photos";

const it = (id, label, svc, verif, x) => ({ id, label, svc, verif, ...(x || {}) });
export const RAI_SECTIONS = [
  { id: "comps", title: "Identification des composants", kind: "sn", groups: [
    ["Skid", [it("c-evap", "Évaporateur", "PROD / RPI", "RPI", { el: "evaporateur" }), it("c-cond", "Condenseur", "PROD / RPI", "RPI", { el: "condenseur" }), it("c-pcyc", "Pompe cycle", "PROD / RPI", "RPI", { el: "pompeCycle" }),
      it("c-pcool", "Pompe cooling", "PROD / RPI", "RPI", { el: "pompeCooling" }), it("c-flush", "Vanne « flush »", "PROD / RPI", "RPI", { el: "vanneFlush" }), it("c-plub", "Pompe lub", "PROD / RPI", "RPI", { el: "pompeLub" }),
      it("c-turb", "Turbine", "PROD / RPI", "RPI"), it("c-aero", "Aérotherme ORC", "PROD / RPI", "RPI", { el: "aerotherme" }), it("c-res", "Réservoir", "PROD / RPI", "RPI", { el: "reservoir" }), it("c-chassis", "Châssis", "PROD / RPI", "RPI", { el: "chassis" })]],
    ["Bypass", [it("c-bpact", "Actionneurs de vanne bypass ORC", "PROD / RPI", "RPI", { el: "bypassAct" }), it("c-bpv", "Vannes bypass ORC", "PROD / RPI", "RPI", { el: "bypassVannes" })]],
    ["Électricité", [it("c-arm", "Armoire électrique", "PROD / RPI", "RPI", { el: "armoire" }), it("c-plc", "PLC (automate)", "PROD / RPI", "RPI", { el: "plc" }), it("c-sim", "Carte SIM", "PRODUIT", "RPI", { el: "sim" }),
      it("c-afe", "AFE", "PROD / RPI", "RPI", { el: "afe" }), it("c-dpc", "Drive pompe cycle", "PROD / RPI", "RPI"), it("c-dturb", "Drive turbine", "PROD / RPI", "RPI", { el: "drive" })]],
    ["Auxiliaires", [it("c-armc", "Armoire électrique conteneur", "PROD / RPI", "RPI"), it("c-pbf", "Pompe BF", "PROD / RPI", "RPI", { el: "pompeBF" }), it("c-aerox", "Aérotherme", "PROD / RPI", "RPI")]],
  ] },
  { id: "docs", title: "Documentation", kind: "doc", groups: [["", [
    it("d-manuel", "ORC · Manuel utilisateur ORC", "PRODUIT", "CdP / RPI"), it("d-schema", "Élec · Schéma électrique ORC", "PRODUIT", "CdP / RPI"), it("d-modbus", "Automatisme · Table d'échange Modbus", "PRODUIT", "CdP / RPI"),
    it("d-plan", "Skid · Plan de l'ORC", "PRODUIT", "CdP / RPI"), it("d-certif", "ORC · Certificat BV / LRQA", "PRODUIT / SCCM", "CdP / RPI"), it("d-fat", "Process · FAT / Protocol report", "PRODUIT", "CdP / RPI"),
    it("d-araignee", "Élec · Araignée de câblage", "PRODUIT", "CdP / RPI"), it("d-carnet", "Élec · Carnet de câbles", "PRODUIT", "CdP / RPI"), it("d-photos", "ORC · Photos ORC", "SCCM", "CdP / RPI")]]] },
  { id: "qual", title: "Dossier qualité", kind: "doc", groups: [["", [
    it("q-pression", "Skid · Fiche de test de pression", "PRODUCTION", "CdP / RPI"), it("q-remplissage", "Skid · Fiche de remplissage", "PRODUCTION", "CdP / RPI"), it("q-montage", "Skid · Checklist de montage ORC", "PRODUCTION", "CdP / RPI"),
    it("q-cablage", "Élec · Checklist câblage", "PRODUCTION", "CdP / RPI"), it("q-turbine", "Turbine · Rapport de test turbine", "RPI", "CdP / RPI"), it("q-nc", "ORC · Rapport des NC clôturées", "SCCM / QHSE", "CdP / RPI"),
    it("q-tuyau", "Fournisseur · Test et essai tuyauterie", "RPI", "CdP / RPI"), it("q-conformite", "Fournisseur · Certificat de conformité", "RPI", "CdP / RPI"), it("q-reception", "Contrôle réception · Rapport contrôle conformité", "RPI", "CdP / RPI")]]] },
  { id: "visu", title: "Inspection visuelle", kind: "visu", groups: [
    ["Skid", [it("v-multi", "Multicouche · droit et positionnement", "PROD / RPI", "CdP / RPI"), it("v-flexlub", "Flexible lub · positionnement", "PROD / RPI", "CdP / RPI"), it("v-propre", "Propreté · poussières, traces", "PROD / RPI", "CdP / RPI"),
      it("v-purge", "Vannes de purge · bouchons", "PROD / RPI", "CdP / RPI"), it("v-fluide", "Fluide · présence du fluide", "PROD / RPI", "CdP / RPI"), it("v-ce", "Plaque CE · positionnement", "PROD / RPI", "CdP / RPI"),
      it("v-levage", "Anneaux de levage · positionnement", "PROD / RPI", "CdP / RPI"), it("v-ailettes", "Aérotherme / ailettes · positionnement", "PROD / RPI", "CdP / RPI")]],
    ["Tuyauterie", [it("v-tpropre", "Propreté · poussières, corps étrangers", "PROD / RPI", "CdP / RPI", { hint: "à contrôler lors de la réception du skid" }), it("v-serrage", "Traits de serrage cycle ORC · présence", "PROD / RPI", "CdP / RPI"), it("v-obtu", "Tuyauterie · obturateurs", "PROD / RPI", "CdP / RPI")]],
    ["Bypass", [it("v-bpropre", "Propreté · poussières, traces", "PROD / RPI", "CdP / RPI"), it("v-bobtu", "Tuyauterie · obturateurs", "PROD / RPI", "CdP / RPI")]],
    ["Électricité", [it("v-verrine", "Verrine · positionnement", "PROD / RPI", "CdP / RPI"), it("v-4g", "Antenne 4G · positionnement", "PROD / RPI", "CdP / RPI"), it("v-fusible", "Fusible batterie · débranché", "PROD / RPI", "CdP / RPI"),
      it("v-epropre", "Propreté · poussières, traces", "PROD / RPI", "CdP / RPI"), it("v-cables", "Câbles de puissance serrés · positionnement", "PROD / RPI", "CdP / RPI"), it("v-plaque", "Plaque fluidique · positionnement", "PROD / RPI", "CdP / RPI"),
      it("v-pochette", "Pochette de rangement · positionnement", "PROD / RPI", "CdP / RPI"), it("v-schema", "Schéma électrique · positionnement", "PROD / RPI", "CdP / RPI")]],
    ["Auxiliaires", [it("v-apropre", "Propreté · poussières, traces", "PROD / RPI", "CdP / RPI"), it("v-apurge", "Vannes de purge · bouchons", "PROD / RPI", "CdP / RPI"), it("v-bf", "Tuyauterie BF · positionnement", "PROD / RPI", "CdP / RPI"),
      it("v-bac", "Bac de rétention · positionnement", "PROD / RPI", "CdP / RPI"), it("v-cuve", "Cuve de réservoir · positionnement", "PROD / RPI", "CdP / RPI")]],
  ] },
];
// signataires du modèle : service et fonction (les noms sont ceux des comptes qui signent, jamais écrits dans le code)
export const RAI_SIGNERS = [["SCCM", "Project Manager"], ["CS", "Maintenance Project Manager Engineer"], ["PROD", "Chef d'atelier"], ["PRODUIT", "Chef pôle Produit"],
  ["Perf. industrielle", "Responsable Performance Industrielle"], ["QHSE", "Coordinatrice QHSE"]];
export const RAI_POLES = ["SCCM", "CS", "PROD", "PRODUIT", "Perf. industrielle", "QHSE", "RPI"];

export const raiItems = () => RAI_SECTIONS.flatMap(s => s.groups.flatMap(([g, L]) => L.map(x => ({ ...x, sec: s.id, group: g }))));
const has = v => v != null && String(v).trim() !== "";

// avancement d'une section : éléments avec OK / NOK / S.O. ; NOK comptés à part
export function raiSection(R, sec) {
  const L = sec.groups.flatMap(([, x]) => x), rows = (R && R.rows) || {};
  const done = L.filter(x => rows[x.id] && rows[x.id].ok).length, nok = L.filter(x => rows[x.id] && rows[x.id].ok === "NOK").length;
  return { total: L.length, done, nok };
}
// Verdict : non acceptée tant qu'une action bloquante est ouverte ou qu'un service n'a pas signé ; acceptée avec réserves
// si tout est signé mais qu'il reste un NOK, un contrôle non fait ou une action ouverte ; sinon acceptée.
export function raiVerdict(R) {
  const acts = (R && R.actions) || [], signs = (R && R.signs) || {};
  const blocking = acts.filter(a => a.bloq && !a.done).length, openActs = acts.filter(a => !a.done).length;
  const signed = RAI_SIGNERS.filter(([s]) => signs[s] && signs[s].at).length;
  const secs = RAI_SECTIONS.map(s => raiSection(R, s)), nok = secs.reduce((n, s) => n + s.nok, 0), todo = secs.reduce((n, s) => n + s.total - s.done, 0);
  const k = blocking || signed < RAI_SIGNERS.length ? "no" : nok || todo || openActs ? "reserve" : "ok";
  return { k, label: k === "ok" ? "Acceptée pour départ" : k === "reserve" ? "Acceptée avec réserves" : "Non acceptée pour départ", blocking, openActs, signed, signers: RAI_SIGNERS.length, nok, todo };
}
// S/N d'un composant : celui du passeport (réel) s'il est relié à un élément, sinon celui saisi dans le RAI
export function compSn(R, pass, x) {
  if (x.el) { const r = ((pass && pass.real) || {})[x.el]; if (r && has(r.v)) return { v: r.v, from: "passport", src: r.src || "" }; }
  const own = ((R && R.rows) || {})[x.id]; return own && has(own.sn) ? { v: own.sn, from: "rai" } : { v: "", from: "" };
}
export function setRow(R, id, patch, by, at = new Date().toISOString()) {
  const rows = { ...((R && R.rows) || {}) }, cur = { ...(rows[id] || {}) };
  Object.entries(patch).forEach(([k, v]) => { if (v == null || v === "") delete cur[k]; else cur[k] = v; });
  if (Object.keys(cur).some(k => ["ok", "c", "loc", "sn"].includes(k))) rows[id] = { ...cur, by: by || "", at }; else delete rows[id];
  return { ...(R || {}), rows, at };
}
export function addAction(R, t, bloq, pole, by, at = new Date().toISOString()) {
  const L = (R && R.actions) || [], id = "a" + (L.reduce((m, a) => Math.max(m, +String(a.id).slice(1) || 0), 0) + 1);
  return { ...(R || {}), actions: [...L, { id, t: String(t || "").trim(), bloq: !!bloq, pole: pole || "", at, by: by || "", done: "", nc: "" }], at };
}
export const setAction = (R, id, patch, at = new Date().toISOString()) => ({ ...(R || {}), actions: ((R && R.actions) || []).map(a => (a.id === id ? { ...a, ...patch } : a)), at });
export const delAction = (R, id, at = new Date().toISOString()) => ({ ...(R || {}), actions: ((R && R.actions) || []).filter(a => a.id !== id), at });
export function sign(R, svc, by, rem, on = true, at = new Date().toISOString()) {
  const signs = { ...((R && R.signs) || {}) };
  if (on) signs[svc] = { by: by || "", at, rem: String(rem || "").trim() }; else delete signs[svc];
  return { ...(R || {}), signs, at };
}

// v395 : photos de la machine dans le PDF (vignettes par étape ; adresses vérifiées, légendes échappées)
const photoBlock = photos => { const L = (photos || []).filter(p => safeImgUrl(p.turl || p.url)); if (!L.length) return "";
  const steps = [...new Set(L.map(p => p.step))];
  return "<h2>Photos</h2>" + steps.map(st => '<div style="margin:6px 0 2px;font-weight:600">' + x(STEP_LABEL[st] || st) + '</div><div style="display:flex;flex-wrap:wrap;gap:6px">'
    + L.filter(p => p.step === st).map(p => '<figure style="margin:0;width:150px"><img src="' + x(safeImgUrl(p.turl || p.url)) + '" alt="" style="width:150px;height:110px;object-fit:cover;border:1px solid #BFBFBF"><figcaption style="font-size:9px;color:#5F6979">' + x(p.shot || "Photo") + " · " + x(p.by || "") + "</figcaption></figure>").join("") + "</div>").join(""); };
// ── PDF imprimable (même principe que le PV de debug : fenêtre + impression) ; chaque valeur est échappée (règle V354)
const x = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function raiHtml({ R, pass, info, photos }) {
  const rows = (R && R.rows) || {}, v = raiVerdict(R), fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "");
  const okCell = o => '<td class="ok ' + (o === "OK" ? "g" : o === "NOK" ? "r" : "") + '">' + x(o || "—") + "</td>";
  const sec = s => '<h2>' + x(s.title) + '</h2><table><thead><tr><th>' + (s.kind === "sn" ? "Composant" : s.kind === "visu" ? "Désignation · point de vérification" : "Catégorie · nom") + "</th><th>" + (s.kind === "sn" ? "N° de série et référence" : s.kind === "doc" ? "Emplacement réseau" : "Commentaire") + "</th><th>Service</th><th>Vérificateur</th><th>Validation</th></tr></thead><tbody>"
    + s.groups.map(([g, L]) => (g ? '<tr class="g"><td colspan="5">' + x(g) + "</td></tr>" : "") + L.map(it2 => { const r = rows[it2.id] || {};
      const mid = s.kind === "sn" ? compSn(R, pass, it2).v : s.kind === "doc" ? r.loc : r.c;
      return "<tr><td>" + x(it2.label) + "</td><td>" + x(mid || "") + (s.kind !== "visu" && r.c ? '<div class="c">' + x(r.c) + "</div>" : "") + "</td><td>" + x(it2.svc) + "</td><td>" + x(it2.verif) + "</td>" + okCell(r.ok) + "</tr>"; }).join("")).join("") + "</tbody></table>";
  const acts = (R && R.actions) || [];
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + x(info.ref) + "</title><style>@page{size:A4;margin:14mm}body{font:11px/1.45 Roboto,Arial,sans-serif;color:#18202E}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px;border-bottom:2px solid #18202E;padding-bottom:3px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #BFBFBF;padding:4px 6px;text-align:left;vertical-align:top}th{background:#E7E9EE;font-weight:600}tr.g td{background:#F3F4F6;font-weight:600}td.ok{text-align:center;font-weight:600;width:62px}td.ok.g{color:#1D7350}td.ok.r{color:#B3322E}.c{color:#5F6979}.v{border:2px solid " + (v.k === "ok" ? "#1D7350" : v.k === "reserve" ? "#8A5A00" : "#B3322E") + ";padding:8px 10px;margin:10px 0;font-weight:600}.info td:nth-child(odd){background:#F3F4F6;font-weight:600;width:18%}</style></head><body>"
    + "<h1>Rapport d'acceptation interne</h1><div>" + x(info.ref) + "</div>"
    + '<div class="v">' + x(v.label) + " — " + v.signed + " / " + v.signers + " signatures · " + v.blocking + " action(s) bloquante(s) ouverte(s) · " + v.nok + " NOK</div>"
    + '<h2>1 Informations générales</h2><table class="info"><tr><td>Date</td><td>' + x(fd(info.date)) + "</td><td>Projet</td><td>" + x(info.pj) + "</td></tr><tr><td>Client</td><td>" + x(info.client) + "</td><td>Gamme ORC</td><td>" + x(info.gamme) + "</td></tr><tr><td>Configuration du produit</td><td>" + x(info.config) + "</td><td>N° de série</td><td>" + x(info.sn) + "</td></tr><tr><td>Version software</td><td>" + x(info.software) + "</td><td>Responsable projet</td><td>" + x(info.chef) + "</td></tr></table>"
    + RAI_SECTIONS.map(sec).join("")
    + "<h2>Plan d'actions</h2><table><thead><tr><th>N°</th><th>Action</th><th>Bloquant</th><th>Pôle</th><th>Créée</th><th>Validée</th><th>NC ClickUp</th></tr></thead><tbody>"
    + (acts.length ? acts.map((a, i) => "<tr><td>" + (i + 1) + "</td><td>" + x(a.t) + "</td><td>" + (a.bloq ? "Oui" : "Non") + "</td><td>" + x(a.pole) + "</td><td>" + x(fd(a.at)) + "</td><td>" + x(fd(a.done)) + "</td><td>" + x(a.nc) + "</td></tr>").join("") : '<tr><td colspan="7">Aucune action</td></tr>') + "</tbody></table>"
    + photoBlock(photos)
    + "<h2>Validation</h2><table><thead><tr><th>Service</th><th>Fonction</th><th>Nom</th><th>Date</th><th>Remarques</th></tr></thead><tbody>"
    + RAI_SIGNERS.map(([s, f]) => { const g = ((R && R.signs) || {})[s] || {}; return "<tr><td>" + x(s) + "</td><td>" + x(f) + "</td><td>" + x(g.by || "") + "</td><td>" + x(fd(g.at)) + "</td><td>" + x(g.rem || "") + "</td></tr>"; }).join("") + "</tbody></table>"
    + "<script>window.onload=function(){setTimeout(function(){window.print()},300)}" + ["</", "script>"].join("") + "</body></html>";
}

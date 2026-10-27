// ── v189 : procès-verbal de tests FAT (fiche PDF), d'après le modèle Word « Template Word CdC » de Gabriel ─────────
// Bandeau ENOGIA en tête, tableau d'identification, tableau des tests (résultat, testeur, date et heure, commentaire),
// tableau de validation (Nom / Fonction / Visa) avec les signatures faites à l'écran, pied de page société.
// Rendu : une fenêtre imprimable (Imprimer → « Enregistrer au format PDF »), comme les autres rapports.
// Signature : tracés compacts « x,y x,y …|x,y … » dans un repère 300 × 100 (voir SignaturePad dans TestsTab).
import { SECTIONS, selectedIds, statusOf, statusByOf, TEST_STATUS } from "./testPlan";

const esc = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const frD = iso => { if (!iso) return ""; const d = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR"); };
const frDT = iso => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export const sigToSvg = (paths, w = 180, h = 60) => {
  const d = String(paths || "").split("|").filter(Boolean).map(s => "M" + s.trim().split(" ").join(" L")).join(" ");
  return d ? `<svg viewBox="0 0 300 100" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="${esc(d)}" fill="none" stroke="#0B2440" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : "";
};

export function testReportHtml({ r, meta, plan, catalog, act, testers, signs, certs, base, kindLabel, presence }) {
  const label = st => (TEST_STATUS.find(x => x[0] === st) || [])[1] || "À faire";
  const tone = st => st === "ok" ? "#3B6620" : st === "ko" ? "#B8331A" : st === "wip" ? "#8A5700" : "#5F5E5A";
  const stamps = [];
  const sections = act.map(k => {
    const name = (SECTIONS.find(x => x[0] === k) || [])[1] || k;
    const lines = selectedIds(plan, catalog, k).map(id => {
      const t = (catalog[k] || []).find(x => x.id === id) || { name: id };
      const st = statusOf(plan, k, id), by = statusByOf(plan, k, id);
      if (by && by.at && st !== "todo") stamps.push(by.at);
      return `<tr><td><b>${esc(t.name)}</b>${t.obj ? `<div class="obj">${esc(t.obj)}</div>` : ""}</td><td style="color:${tone(st)};font-weight:700">${esc(label(st))}</td><td>${esc(by && st !== "todo" ? by.by : "")}</td><td>${esc(by && st !== "todo" ? frDT(by.at) : "")}</td><td>${esc(plan.notes[id] || "")}</td></tr>`;
    }).join("");
    const extra = plan.extra[k] ? `<tr><td colspan="5"><i>Test supplémentaire :</i> ${esc(plan.extra[k])}</td></tr>` : "";
    return `<h3>${esc(name)}</h3><table class="grid"><thead><tr><th style="width:38%">Test</th><th>Résultat</th><th>Par</th><th>Date · heure</th><th>Commentaire</th></tr></thead><tbody>${lines || `<tr><td colspan="5">Aucun test retenu.</td></tr>`}${extra}</tbody></table>`;
  }).join("");
  const n = { ok: 0, ko: 0, wip: 0, todo: 0 };
  act.forEach(k => selectedIds(plan, catalog, k).forEach(id => { n[statusOf(plan, k, id)]++; }));
  stamps.sort();
  const assigned = plan.assign.map(a => testers.find(t => t.id === a.tid)).filter(Boolean);
  const docName = "PV-DEBUG-" + r.pj;
  // v195 : la personne saisit son nom et sa fonction ; la signature est une image déposée (s.img), à défaut l'ancien tracé (s.paths).
  const visa = s => !s ? "" : (s.img ? `<img src="${esc(s.img)}" alt="Signature" style="max-width:200px;max-height:70px;display:block">` : s.paths ? sigToSvg(s.paths) : "") + `<div class="when">Signé le ${esc(frDT(s.at))}</div>`;
  const sigRow = (role, name, fn, s) => `<tr><td>${esc(role)}</td><td><b>${esc((s && s.name) || name || "")}</b></td><td>${esc((s && s.fn) || fn || "")}</td><td class="visa">${visa(s)}</td></tr>`;
  const testerRows = (assigned.length ? assigned : [{ id: "", name: "" }]).map(t => sigRow("Réalisé par", t.name, "", signs["t:" + t.id])).join("");
  const nom = meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "";
  // v202 (demandé : « c'est un PV de debug machine interne ; bien se servir du modèle Word pour la forme ») : mise en page du modèle
  // « Template Word CdC » — page 1 : grand bandeau, titre, tableau de suivi du document, sommaire, pied de page société ;
  // pages suivantes : en-tête avec le logo et la référence, titres numérotés, pied de page « Document / Projet / Version ».
  // Plus d'encadré de résultat ni de phrases d'introduction au-dessus des tableaux.
  const title = "PV de debug machine";
  const foot = `<footer class="pfoot"><table><tr><td><b>Document :</b> ${esc(docName)}</td><td><b>Projet :</b> ${esc(r.pj)}${nom ? " · " + esc(nom) : ""}</td><td><b>Version :</b> A</td></tr></table></footer>`;
  const head = `<header class="phead"><img src="${esc(base)}cdc-logo.png" alt="ENOGIA"><span>${esc(title)} · ${esc(r.pj)}</span></header>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="color-scheme" content="light"><title>${esc(docName)}${nom ? " – " + esc(nom) : ""}</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:10mm 12mm}
html{background:#fff}body{font-family:Roboto,Arial,sans-serif;color:#003366;background:#fff;font-size:10pt;margin:0 auto;max-width:186mm}
.page{min-height:275mm;display:flex;flex-direction:column;page-break-after:always;break-after:page}
.page.last{page-break-after:auto;break-after:auto}
@media screen{body{padding:8mm 0}.page{box-shadow:0 0 0 1px #D3DAE2;padding:8mm 10mm;margin-bottom:8mm;min-height:auto}}
.main{flex:1}
.banner{width:100%;display:block}
.phead{display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #003366;padding-bottom:4px;margin-bottom:10mm}
.phead img{height:9mm}.phead span{font-size:8.5pt;color:#5F5E5A}
.pfoot{margin-top:8mm;font-size:8pt;color:#003366}
.pfoot table{width:100%;border-collapse:collapse}.pfoot td{border:1px solid #003366;padding:3px 6px}
.cfoot{margin-top:8mm;border-top:1px solid #9FB3C8;padding-top:4px;font-size:7.5pt;color:#5F5E5A;text-align:center;line-height:1.5}
.ctitle{font-size:24pt;font-weight:700;margin:22mm 0 3mm;line-height:1.15}
.csub{font-size:12pt;color:#003366;margin:0 0 16mm}
h2{font-size:13pt;margin:0 0 8px;color:#003366;font-weight:700}
h2 .n{display:inline-block;min-width:9mm}
h3{font-size:10.5pt;margin:12px 0 5px;font-weight:700}
table{border-collapse:collapse;width:100%}
.id td{border:1px solid #003366;padding:5px 7px;vertical-align:top}
.id td.k{background:#E6EEF5;font-weight:700;width:24%}
.doc th,.doc td{border:1px solid #003366;padding:5px 7px;text-align:left}
.doc th{background:#003366;color:#fff;font-weight:500}
.toc{margin-top:12mm}.toc div{display:flex;gap:6px;padding:3px 0;border-bottom:1px dotted #9FB3C8}.toc b{min-width:9mm}
.grid th{background:#003366;color:#fff;text-align:left;padding:5px 6px;font-weight:500}
.grid td{border:1px solid #9FB3C8;padding:5px 6px;vertical-align:top}
.grid tr{page-break-inside:avoid}
.obj{color:#5F5E5A;font-size:8.5pt;white-space:pre-line;margin-top:2px}
.sum{width:auto;margin:0 0 10px}.sum td{border:1px solid #003366;padding:4px 10px}.sum td.k{background:#E6EEF5;font-weight:700}
.val td{border:1px solid #003366;padding:6px 8px;vertical-align:middle;height:64px}
.val th{background:#E6EEF5;border:1px solid #003366;text-align:left;padding:5px 8px}
.visa{width:36%}.when{font-size:8pt;color:#5F5E5A}
.no-print{position:fixed;top:10px;right:10px}
@media print{.no-print{display:none}}
</style></head><body>
<div class="no-print"><button onclick="window.print()" style="font:600 13px Roboto,Arial;padding:8px 14px;border-radius:8px;border:none;background:#003366;color:#fff;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>

<section class="page">
<div class="main">
<img class="banner" src="${esc(base)}cdc-banner.jpg" alt="ENOGIA">
<div class="ctitle">${esc(title)} · ${esc(r.pj)}</div>
<div class="csub">${nom ? esc(nom) + " · " : ""}${r.gamme ? "ORC " + esc(r.gamme) : ""} · document interne</div>
<table class="doc"><thead><tr><th>Version</th><th>Date</th><th>Rédacteur</th><th>Objet</th><th>Pages</th></tr></thead>
<tbody><tr><td>A</td><td>${esc(frD(new Date().toISOString()))}</td><td>${esc(assigned.map(t => (signs["t:" + t.id] && signs["t:" + t.id].name) || t.name).join(", ") || "—")}</td><td>Création</td><td>Toutes</td></tr></tbody></table>
<div class="toc"><h3>Sommaire</h3>
<div><b>1</b><span>Informations de la machine</span></div>
<div><b>2</b><span>Résultats du debug</span></div>
<div><b>3</b><span>Validation</span></div></div>
</div>
<div class="cfoot">Siège social : 19 Avenue Paul Héroult 13015 Marseille – www.enogia.com<br>Enogia – S.A. au capital de 628 753,20 € · Siren 514 692 045 RCS Marseille · Siret 514 692 045 00065 – code APE NAF 7490B</div>
</section>

<section class="page">
${head}
<div class="main">
<h2><span class="n">1</span>Informations de la machine</h2>
<table class="id">
<tr><td class="k">PJ</td><td>${esc(r.pj)}</td><td class="k">Gamme</td><td>${esc(r.gamme || "—")}</td></tr>
<tr><td class="k">Projet</td><td>${esc(nom || "—")}</td><td class="k">N° de série</td><td>${esc(meta.numSerie || "—")}</td></tr>
<tr><td class="k">Chef de projet</td><td>${esc(meta.chefProjet && meta.chefProjet !== "—" ? meta.chefProjet : "—")}</td><td class="k">Pays</td><td>${esc(meta.pays && meta.pays !== "—" ? meta.pays : "—")}</td></tr>
<tr><td class="k">Certification</td><td colspan="3">${esc((certs || []).join(", ") || "N/A")}</td></tr>
</table>
<h3>Planning</h3>
<table class="id">
<tr><td class="k">Arrivée</td><td>${esc(frD(r.arrivee) || "—")}</td><td class="k">Debug / tests</td><td>${esc(frD(r.tests) || "—")}${r.testsFin ? " → " + esc(frD(r.testsFin)) : ""}</td></tr>
<tr><td class="k">Fin de production</td><td>${esc(frD(r.finProd) || "—")}</td><td class="k">Départ</td><td>${esc(frD(r.depart) || "—")}</td></tr>
<tr><td class="k">Présence</td><td colspan="3">${esc(kindLabel)}${presence ? " · " + esc(presence) : ""}</td></tr>
</table>
<h3>Équipe</h3>
<table class="id">
<tr><td class="k">Testeurs</td><td colspan="3">${esc(assigned.map(t => t.name).join(", ") || "—")}</td></tr>
<tr><td class="k">Début / fin des saisies</td><td colspan="3">${stamps.length ? esc(frDT(stamps[0])) + " → " + esc(frDT(stamps[stamps.length - 1])) : "—"}</td></tr>
${plan.forced ? `<tr><td class="k">Validation forcée</td><td colspan="3">par ${esc(plan.forced.by || "")} le ${esc(frD(plan.forced.at))}</td></tr>` : ""}
</table>
</div>
${foot}
</section>

<section class="page last">
${head}
<div class="main">
<h2><span class="n">2</span>Résultats du debug</h2>
<table class="sum"><tr><td class="k">Réussis</td><td>${n.ok}</td><td class="k">Échecs</td><td>${n.ko}</td><td class="k">En cours</td><td>${n.wip}</td><td class="k">Non réalisés</td><td>${n.todo}</td></tr></table>
${sections}
<h2 style="margin-top:14px"><span class="n">3</span>Validation</h2>
<table class="val"><thead><tr><th style="width:16%"></th><th>Nom</th><th>Fonction</th><th>Visa</th></tr></thead><tbody>
${testerRows}
</tbody></table>
</div>
${foot}
</section>
</body></html>`;
}

export function openTestReport(args) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open(); w.document.write(testReportHtml(args)); w.document.close();
  return true;
}

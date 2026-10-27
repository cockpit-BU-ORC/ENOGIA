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
    return `<h2>${esc(name)}</h2><table class="grid"><thead><tr><th style="width:38%">Test</th><th>Résultat</th><th>Par</th><th>Date · heure</th><th>Commentaire</th></tr></thead><tbody>${lines || `<tr><td colspan="5">Aucun test retenu.</td></tr>`}${extra}</tbody></table>`;
  }).join("");
  const n = { ok: 0, ko: 0, wip: 0, todo: 0 };
  act.forEach(k => selectedIds(plan, catalog, k).forEach(id => { n[statusOf(plan, k, id)]++; }));
  stamps.sort();
  const assigned = plan.assign.map(a => testers.find(t => t.id === a.tid)).filter(Boolean);
  const docName = "PV-FAT-" + r.pj;
  // v195 : la personne saisit son nom et sa fonction ; la signature est une image déposée (s.img), à défaut l'ancien tracé (s.paths).
  const visa = s => !s ? "" : (s.img ? `<img src="${esc(s.img)}" alt="Signature" style="max-width:200px;max-height:70px;display:block">` : s.paths ? sigToSvg(s.paths) : "") + `<div class="when">Signé le ${esc(frDT(s.at))}</div>`;
  const sigRow = (role, name, fn, s) => `<tr><td>${esc(role)}</td><td><b>${esc((s && s.name) || name || "")}</b></td><td>${esc((s && s.fn) || fn || "")}</td><td class="visa">${visa(s)}</td></tr>`;
  const testerRows = (assigned.length ? assigned : [{ id: "", name: "" }]).map(t => sigRow("Réalisé par", t.name, "", signs["t:" + t.id])).join("");
  const nom = meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : "";
  const total = n.ok + n.ko + n.wip + n.todo;
  const verdict = plan.forced ? { k: "ok", label: "Validé manuellement" } : n.ko > 0 ? { k: "ko", label: "Non conforme" } : total > 0 && n.ok === total ? { k: "ok", label: "Conforme" } : { k: "wip", label: "Tests non terminés" };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="color-scheme" content="light"><title>${esc(docName)}${nom ? " – " + esc(nom) : ""}</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:12mm 12mm 18mm}
html{background:#fff}body{font-family:Roboto,Arial,sans-serif;color:#003366;background:#fff;font-size:10.5pt;margin:0 auto;max-width:190mm;padding:8mm 0}
@media print{body{max-width:none;padding:0}}
.banner{width:100%;display:block;border-radius:2px}
h1{font-size:18pt;margin:14px 0 2px;font-weight:700}
.sub{color:#5F5E5A;margin:0 0 12px}
h2{font-size:12pt;margin:16px 0 6px;border-bottom:2px solid #003366;padding-bottom:3px}
table{border-collapse:collapse;width:100%}
.id td{border:1px solid #003366;padding:5px 7px;vertical-align:top}
.id td.k{background:#E6EEF5;font-weight:700;width:22%}
.grid th{background:#003366;color:#fff;text-align:left;padding:5px 6px;font-weight:500}
.grid td{border:1px solid #9FB3C8;padding:5px 6px;vertical-align:top}
.grid tr{page-break-inside:avoid}
.obj{color:#5F5E5A;font-size:8.5pt;white-space:pre-line;margin-top:2px}
.sum{display:flex;gap:8px;margin:10px 0}
.sum div{flex:1;border:1px solid #003366;padding:6px 8px}
.sum b{display:block;font-size:15pt}
.val td{border:1px solid #003366;padding:6px 8px;vertical-align:middle;height:64px}
.val th{background:#E6EEF5;border:1px solid #003366;text-align:left;padding:5px 8px}
.visa{width:36%}.when{font-size:8pt;color:#5F5E5A}
.foot{position:fixed;bottom:-12mm;left:0;right:0;font-size:7.5pt;color:#5F5E5A;border-top:1px solid #9FB3C8;padding-top:3px;display:flex;justify-content:space-between}
.page{page-break-after:always;break-after:page}
.page.last{page-break-after:auto;break-after:auto}
@media screen{.page{border-bottom:1px dashed #9FB3C8;padding-bottom:10mm;margin-bottom:10mm}.page.last{border-bottom:none}}
h2.top{margin-top:0}
.cover-main{padding:22mm 0 14mm}
.kind{font-size:12pt;font-weight:500;color:#5F5E5A}
h1.big{font-size:30pt;line-height:1.1;margin:6px 0 6px}
.verdict{display:inline-flex;flex-direction:column;gap:2px;border:2px solid #003366;padding:10px 14px;margin-top:12mm;min-width:70mm}
.verdict span{font-size:9pt;color:#5F5E5A}.verdict b{font-size:18pt}.verdict i{font-style:normal;font-size:9pt;color:#5F5E5A}
.verdict.ok{border-color:#3B6620}.verdict.ok b{color:#3B6620}.verdict.ko{border-color:#B8331A}.verdict.ko b{color:#B8331A}.verdict.wip b{color:#8A5700}
.no-print{position:fixed;top:10px;right:10px}
@media print{.no-print{display:none}}
</style></head><body>
<div class="no-print"><button onclick="window.print()" style="font:600 13px Roboto,Arial;padding:8px 14px;border-radius:8px;border:none;background:#003366;color:#fff;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>
<!-- v200 (demandé) : 1) page de garde, 2) informations de la machine, 3) résultats des tests et validation -->
<section class="page cover">
<img class="banner" src="${esc(base)}cdc-banner.jpg" alt="ENOGIA">
<div class="cover-main">
<div class="kind">Procès-verbal de tests FAT</div>
<h1 class="big">${esc(r.pj)}${nom ? " · " + esc(nom) : ""}</h1>
<p class="sub">${r.gamme ? "Machine ORC " + esc(r.gamme) + " · " : ""}Tests du ${esc(frD(r.tests))}${r.testsFin ? " au " + esc(frD(r.testsFin)) : ""}</p>
<div class="verdict ${verdict.k}"><span>Résultat</span><b>${esc(verdict.label)}</b><i>${n.ok} réussi${n.ok > 1 ? "s" : ""} · ${n.ko} échec${n.ko > 1 ? "s" : ""} · ${n.wip + n.todo} non terminé${n.wip + n.todo > 1 ? "s" : ""} sur ${total} test${total > 1 ? "s" : ""}</i></div>
</div>
<h2>Suivi du document</h2>
<table class="id">
<tr><td class="k">Document</td><td>${esc(docName)}</td><td class="k">Version</td><td>A</td></tr>
<tr><td class="k">Date d'édition</td><td>${esc(frD(new Date().toISOString()))}</td><td class="k">Objet</td><td>Création</td></tr>
<tr><td class="k">Rédigé par</td><td colspan="3">${esc(assigned.map(t => (signs["t:" + t.id] && signs["t:" + t.id].name) || t.name).join(", ") || "—")}</td></tr>
<tr><td class="k">Pages</td><td colspan="3">1 · Page de garde — 2 · Informations de la machine — 3 · Résultats des tests et validation</td></tr>
</table>
</section>

<section class="page">
<h2 class="top">Informations de la machine</h2>
<table class="id">
<tr><td class="k">PJ</td><td>${esc(r.pj)}</td><td class="k">Gamme</td><td>${esc(r.gamme || "—")}</td></tr>
<tr><td class="k">Projet</td><td>${esc(nom || "—")}</td><td class="k">N° de série</td><td>${esc(meta.numSerie || "—")}</td></tr>
<tr><td class="k">Chef de projet</td><td>${esc(meta.chefProjet && meta.chefProjet !== "—" ? meta.chefProjet : "—")}</td><td class="k">Pays</td><td>${esc(meta.pays && meta.pays !== "—" ? meta.pays : "—")}</td></tr>
<tr><td class="k">Certification</td><td colspan="3">${esc((certs || []).join(", ") || "N/A")}</td></tr>
</table>
<h2>Planning</h2>
<table class="id">
<tr><td class="k">Arrivée</td><td>${esc(frD(r.arrivee) || "—")}</td><td class="k">Tests</td><td>${esc(frD(r.tests) || "—")}${r.testsFin ? " → " + esc(frD(r.testsFin)) : ""}</td></tr>
<tr><td class="k">Fin de production</td><td>${esc(frD(r.finProd) || "—")}</td><td class="k">Départ</td><td>${esc(frD(r.depart) || "—")}</td></tr>
<tr><td class="k">Présence aux tests</td><td colspan="3">${esc(kindLabel)}${presence ? " · " + esc(presence) : ""}</td></tr>
</table>
<h2>Équipe de test</h2>
<table class="id">
<tr><td class="k">Testeurs</td><td colspan="3">${esc(assigned.map(t => t.name).join(", ") || "—")}</td></tr>
<tr><td class="k">Début / fin des saisies</td><td colspan="3">${stamps.length ? esc(frDT(stamps[0])) + " → " + esc(frDT(stamps[stamps.length - 1])) : "—"}</td></tr>
${plan.forced ? `<tr><td class="k">Validation forcée</td><td colspan="3">par ${esc(plan.forced.by || "")} le ${esc(frD(plan.forced.at))}</td></tr>` : ""}
</table>
</section>

<section class="page last">
<h2 class="top">Résultats des tests</h2>
<div class="sum"><div>Réussis<b style="color:#3B6620">${n.ok}</b></div><div>Échecs<b style="color:#B8331A">${n.ko}</b></div><div>En cours<b style="color:#8A5700">${n.wip}</b></div><div>Non réalisés<b>${n.todo}</b></div></div>
${sections}
<h2>Validation</h2>
<p class="sub" style="margin:0 0 6px">Les signataires attestent que les tests ci-dessus ont été réalisés et que les résultats indiqués sont exacts.</p>
<table class="val"><thead><tr><th style="width:16%"></th><th>Nom</th><th>Fonction</th><th>Visa</th></tr></thead><tbody>
${testerRows}
</tbody></table>
</section>
<div class="foot"><span>Document : ${esc(docName)} · Projet : ${esc(r.pj)} · Version : A</span><span>Siège social : 19 Avenue Paul Héroult 13015 Marseille – www.enogia.com · Enogia – S.A. au capital de 628 753,20 € · Siren 514 692 045 RCS Marseille</span></div>
</body></html>`;
}

export function openTestReport(args) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open(); w.document.write(testReportHtml(args)); w.document.close();
  return true;
}

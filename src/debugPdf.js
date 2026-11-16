// v272 (demandé : « exporter la checklist de debug en PDF uniquement ») : même mise en page que le modèle Word
// « PI105-047-XX0003-A-Check list debug » (A4 paysage, en-tête logo | Procédure mise en service / Checklist de Debug ORC | Version,
// N° projet / date / nom, tableau des contrôles à en-têtes gris BFBFBF, bloc « Validation » avec la signature), ouverte dans une
// fenêtre qui lance l'impression : « Enregistrer au format PDF ». Le titre du document = nom du fichier proposé.
import { DEBUG_DOC, DEBUG_SECTIONS } from "./debugChecklist";
import { DEBUG_LOGO_PNG } from "./debugLogo";

const x = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const br = s => x(s).replace(/\n/g, "<br>");
const frD = iso => { if (!iso) return ""; const d = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR"); };
export const debugPdfName = pj => DEBUG_DOC.ref + "-" + DEBUG_DOC.version + "-Check list debug - " + (pj || "PJ");

export function debugHtml({ pj, date, name, debug, sign, sections = DEBUG_SECTIONS, vib = [], spd = null }) {
  const rows = (debug && debug.rows) || {};
  const mark = (r, v) => (r === v ? "X" : r === "na" && v === "ok" ? "S.O." : "");
  const body = sections.map((s, si) => {
    const heads = si === 0 ? [s.title, "OK", "NOK", "Problème rencontré", "Causalité", "Correctif", "Temps correctif", "Commentaires"] : [s.title, "OK", "NOK", "", "", "", "", "Commentaires"];
    return '<tr class="sec">' + heads.map((h, i) => "<th" + (i ? ' class="c"' : "") + ">" + x(h) + "</th>").join("") + "</tr>"
      + s.items.map(it => { const v = rows[it.id] || {};
        return "<tr><td>" + x(it.label) + '</td><td class="c b">' + mark(v.r, "ok") + '</td><td class="c b">' + mark(v.r, "nok") + "</td><td>" + br(v.pb) + "</td><td>" + br(v.cause) + "</td><td>" + br(v.fix) + "</td><td>" + br(v.temps) + '</td><td class="h">' + br(it.hint) + "</td></tr>"; }).join("");
  }).join("");
  // v354 (revue de sécurité) : la signature vient de Firestore (testsign_<PJ>, inscriptible par tout compte) — seule une image PNG / JPEG
  // en base64 est acceptée, et la valeur est échappée (sinon un faux « data:image/… » pouvait ajouter un script à la page)
  const sigImg = sign && typeof sign.img === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sign.img) ? '<img src="' + x(sign.img) + '" alt="Signature" style="max-height:60px;max-width:220px">' : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${x(debugPdfName(pj))}</title><style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}body{margin:0;font:9pt Calibri,Carlito,Arial,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{border:1px solid #000;padding:2px 4px;vertical-align:top;word-wrap:break-word}
.head td{text-align:center;vertical-align:middle;font-size:12pt}.info td{font-size:10pt}
.sec th{background:#BFBFBF;font-weight:600;text-align:left}.sec th.c,.c{text-align:center}.b{font-weight:600}.h{font-size:8pt}
tr{page-break-inside:avoid}.in{background:#D9F0E3;color:#14532D}.out{background:#F9D6D2;color:#8A1C12}.rg{font-size:7.5pt;font-weight:400;color:#444}thead{display:table-header-group}.gap{height:8px}
.bar{position:fixed;top:8px;right:8px;font:600 13px Arial}.bar button{padding:8px 14px;border-radius:8px;border:none;background:#003366;color:#fff;cursor:pointer}
@media print{.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Enregistrer en PDF</button></div>
<table class="head"><colgroup><col style="width:28%"><col style="width:44%"><col style="width:28%"></colgroup>
<tr><td rowspan="2"><img src="data:image/png;base64,${DEBUG_LOGO_PNG}" alt="ENOGIA" style="height:46px"></td><td>${x(DEBUG_DOC.title)}</td><td rowspan="2">Version : ${x(DEBUG_DOC.version)}</td></tr>
<tr><td>${x(DEBUG_DOC.subtitle)}</td></tr></table>
<table class="info"><tr><td>N° Projet : ${x(pj || "PJ")}</td><td>Date : ${x(frD(date))}</td></tr><tr><td colspan="2">Nom et prénom : ${x(name || "")}</td></tr></table>
<div class="gap"></div>
<table><colgroup>${[1795, 574, 555, 1720, 1843, 2410, 992, 4333].map(w => '<col style="width:' + (w / 142.22).toFixed(2) + '%">').join("")}</colgroup>${body}</table>
<div class="gap"></div>${vib.length ? '<table><colgroup><col style="width:28%"><col style="width:18%"><col style="width:18%"><col style="width:18%"><col style="width:18%"></colgroup><tr class="sec"><th>Fréquences turbines et vibrations</th><th class="c">Fréquence (figée)</th><th class="c">Vibrations relevées</th><th class="c">Limite</th><th class="c">Résultat</th></tr>' + vib.map(v => "<tr><td>" + x(v.label) + '</td><td class="c">' + x(v.freq || "") + '</td><td class="c b">' + x(v.val || "") + '</td><td class="c">' + x(v.limit || "") + '</td><td class="c b">' + x(v.res || "") + "</td></tr>").join("") + '</table><div class="gap"></div>' : ""}${spd && spd.speeds && spd.speeds.length ? '<table><tr class="sec"><th>Fréquences par vitesse (Hz)</th>' + spd.speeds.map(l => '<th class="c">' + x(l) + "</th>").join("") + "</tr>" + spd.rows.map(rw => "<tr><td>" + x(rw.label) + "</td>" + rw.cells.map(c => '<td class="c b' + (c.st === "in" ? " in" : c.st === "out" ? " out" : "") + '">' + x(c.val || "") + (c.st === "in" ? " ✓" : c.st === "out" ? " · hors plage" : "") + (c.min || c.max ? '<br><span class="rg">plage ' + x(c.min || "…") + " – " + x(c.max || "…") + "</span>" : "") + "</td>").join("") + "</tr>").join("") + '</table><div class="gap"></div>' : ""}
<table><colgroup><col style="width:28.7%"><col style="width:23%"><col style="width:15.8%"><col style="width:32.5%"></colgroup>
<tr class="sec"><th>Validation · Nom et prénom</th><th>Fonction</th><th>Date</th><th>Signature</th></tr>
<tr style="height:70px"><td>${x(sign ? sign.name : name)}</td><td>${x(sign ? sign.fn : "")}</td><td>${x(sign ? frD(sign.at) : "")}</td><td style="text-align:center;vertical-align:middle">${sigImg}</td></tr></table>
<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)});</script>
</body></html>`;
}
// La fenêtre s'ouvre tout de suite (au clic, sinon le navigateur la bloque), puis reçoit le document une fois la signature chargée.
export function openDebugPdf(load) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write('<!DOCTYPE html><title>Préparation…</title><p style="font:14px Arial;padding:20px">Préparation du PDF…</p>');
  Promise.resolve(load()).then(args => { w.document.open(); w.document.write(debugHtml(args)); w.document.close(); }).catch(() => { w.document.body.innerHTML = '<p style="font:14px Arial;padding:20px">Le PDF n’a pas pu être préparé.</p>'; });
  return true;
}

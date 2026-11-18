// v401 (demandé : « dossier machine PDF ») : un document imprimable qui assemble le passeport (prévu / réel par sous-ensemble),
// le RAI (verdict, plan d'actions, signatures) et les photos par étape — remis au client à la livraison, base du SAV.
// Même principe que le PV de debug : fenêtre + impression ; chaque valeur est échappée (règle V354), images vérifiées (safeImgUrl).
import { raiVerdict, RAI_SIGNERS } from "./rai";
import { safeImgUrl, STEP_LABEL } from "./photos";
import { GROUPS, PHASE_LABEL } from "./passport";

const x = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "");

export function dossierHtml({ r, meta, rows, R, photos, std }) {
  const m = meta || {}, v = raiVerdict(R), today = new Date().toISOString().slice(0, 10);
  const title = "Dossier machine " + (r && r.pj);
  const groups = GROUPS.concat([...new Set((rows || []).map(y => y.el.group))].filter(g => !GROUPS.includes(g)));
  const pass = groups.map(g => { const G = (rows || []).filter(y => y.el.group === g && (y.planned || (y.real && y.real.v))); if (!G.length) return "";
    return '<tr class="g"><td colspan="4">' + x(g) + "</td></tr>" + G.map(y => "<tr><td>" + x(y.el.label) + "</td><td>" + x(y.planned || "—") + (y.dev ? ' <span class="dev">écart</span>' : "") + "</td><td" + (y.gap ? ' class="bad"' : "") + ">" + x((y.real && y.real.v) || "—") + "</td><td class=\"s\">" + x(y.real ? [PHASE_LABEL[y.real.phase], y.real.src].filter(Boolean).join(" · ") : "") + "</td></tr>").join(""); }).join("");
  const acts = (R && R.actions) || [];
  const signs = RAI_SIGNERS.map(([s, f]) => { const g = ((R && R.signs) || {})[s] || {}; return "<tr><td>" + x(s) + "</td><td>" + x(f) + "</td><td>" + x(g.by || "—") + "</td><td>" + x(fd(g.at)) + "</td></tr>"; }).join("");
  const P = (photos || []).filter(p => safeImgUrl(p.turl || p.url)), steps = [...new Set(P.map(p => p.step))];
  const pics = steps.map(st => '<h3>' + x(STEP_LABEL[st] || st) + '</h3><div class="ph">' + P.filter(p => p.step === st).map(p => '<figure><img src="' + x(safeImgUrl(p.url || p.turl)) + '" alt=""><figcaption>' + x(p.shot || "Photo") + " · " + x(fd(p.at)) + "</figcaption></figure>").join("") + "</div>").join("");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + x(title) + "</title><style>@page{size:A4;margin:14mm}body{font:11px/1.45 Roboto,Arial,sans-serif;color:#18202E}h1{font-size:24px;margin:0}h2{font-size:15px;margin:20px 0 6px;border-bottom:2px solid #18202E;padding-bottom:3px;page-break-after:avoid}h3{font-size:12px;margin:10px 0 4px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #BFBFBF;padding:4px 6px;text-align:left;vertical-align:top}th{background:#E7E9EE;font-weight:600}tr.g td{background:#F3F4F6;font-weight:600}td.s{color:#5F6979;font-size:10px}td.bad{color:#B3322E;font-weight:600}.dev{color:#8A5A00;font-size:9px;font-weight:600}.id td:nth-child(odd){background:#F3F4F6;font-weight:600;width:20%}.v{border:2px solid " + (v.k === "ok" ? "#1D7350" : v.k === "reserve" ? "#8A5A00" : "#B3322E") + ";padding:6px 10px;font-weight:600;margin:8px 0}.ph{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0;width:31%;page-break-inside:avoid}figure img{width:100%;height:150px;object-fit:cover;border:1px solid #BFBFBF}figcaption{font-size:9px;color:#5F6979}.cover{border-bottom:4px solid #1B2A55;padding-bottom:10px;margin-bottom:10px}.muted{color:#5F6979}</style></head><body>"
    + '<div class="cover"><div class="muted">ENOGIA · BU ORC</div><h1>' + x(title) + "</h1><div>" + x([m.nomProjet && m.nomProjet !== "—" ? m.nomProjet : "", m.pays, r && r.gamme].filter(Boolean).join(" · ")) + '</div><div class="muted">Édité le ' + x(fd(today)) + "</div></div>"
    + '<table class="id"><tr><td>Projet</td><td>' + x(r && r.pj) + "</td><td>N° de série</td><td>" + x(m.numSerie || "—") + "</td></tr><tr><td>Gamme</td><td>" + x((r && r.gamme) || "—") + "</td><td>Standard appliqué</td><td>" + x(std || "—") + "</td></tr><tr><td>Responsable projet</td><td>" + x(m.chefProjet || "—") + "</td><td>Départ</td><td>" + x(fd(r && r.depart)) + "</td></tr></table>"
    + "<h2>1 Configuration de la machine</h2><table><thead><tr><th>Élément</th><th>Prévu</th><th>Réel sur la machine</th><th>Source</th></tr></thead><tbody>" + pass + "</tbody></table>"
    + "<h2>2 Rapport d'acceptation interne</h2><div class=\"v\">" + x(v.label) + " — " + v.signed + " / " + v.signers + " signatures · " + v.nok + " NOK · " + v.blocking + " action(s) bloquante(s) ouverte(s)</div>"
    + (acts.length ? "<h3>Plan d'actions</h3><table><thead><tr><th>Action</th><th>Bloquant</th><th>Pôle</th><th>Validée</th></tr></thead><tbody>" + acts.map(a => "<tr><td>" + x(a.t) + "</td><td>" + (a.bloq ? "Oui" : "Non") + "</td><td>" + x(a.pole) + "</td><td>" + x(fd(a.done) || "—") + "</td></tr>").join("") + "</tbody></table>" : "")
    + "<h3>Validation</h3><table><thead><tr><th>Service</th><th>Fonction</th><th>Signé par</th><th>Date</th></tr></thead><tbody>" + signs + "</tbody></table>"
    + (pics ? "<h2>3 Photos</h2>" + pics : "")
    + "<script>window.onload=function(){setTimeout(function(){window.print()},400)}" + ["</", "script>"].join("") + "</body></html>";
}

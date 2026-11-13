// v337 (D13, demandé : « découpe le manuel Word en chapitres et en étapes, et produis un livret : case de validation, statut (À faire, OK,
// Problème) et commentaire par étape ; barre de progression, filtres, synthèse des problèmes ; exports CSV, JSON, PDF imprimable ;
// réimport d'un export pour reprendre une session ») — logique pure (testée), sans React ni Firestore.
// Découpage : un chapitre par titre de niveau 1 ; une étape par titre (niveau 1 à 4) qui porte du contenu (texte, tableau ou image),
// avec le chemin des titres au-dessus (« AFE › MD050N › Tension de travail »). Ce qui précède le premier titre 1 (page de garde,
// sommaire) est ignoré. L'identifiant d'une étape vient de son chemin : une nouvelle version du manuel garde les réponses déjà saisies.
const ent = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const runText = s => ent((s.match(/<w:t[^>]*>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || []).map(t => t.startsWith("<w:tab") ? " " : t.startsWith("<w:br") ? "\n" : t.replace(/<[^>]+>/g, "")).join(""));
export const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "x";

export function parseManual({ documentXml, stylesXml = "", relsXml = "" }) {
  const sname = {}; for (const m of stylesXml.matchAll(/<w:style [^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<w:name w:val="([^"]+)"/g)) sname[m[1]] = m[2];
  const rel = {}; for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rel[m[1]] = m[2];
  const levelOf = st => { const n = (sname[st] || st || "").toLowerCase(); const m = /^(?:heading|titre)\s*([1-6])$/.exec(n.replace(/\s+/g, " ").trim()); return m ? +m[1] : 0; };
  const body = documentXml.slice(Math.max(0, documentXml.indexOf("<w:body")));
  const chapters = [], path = [], used = {};
  let chap = null, step = null;
  const newStep = (lvl, title) => {
    path.length = lvl - 1; path[lvl - 1] = title;
    let id = path.map(slug).join("/"); if (used[id]) id += "-" + (++used[id]); else used[id] = 1;
    step = { id, title, path: path.slice(0, lvl - 1).filter(Boolean), level: lvl, blocks: [] };
    if (chap) chap.steps.push(step);
  };
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    const b = m[0];
    if (b.startsWith("<w:tbl")) {
      if (!step) continue;
      const rows = [...b.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map(r => [...r[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map(c => runText(c[0]).replace(/\s+/g, " ").trim()));
      // Firestore refuse les tableaux de tableaux : une ligne = { c: [cellules] }
      if (rows.some(r => r.some(Boolean))) step.blocks.push({ t: "table", rows: rows.map(c => ({ c })) });
      continue;
    }
    const st = (b.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "", lvl = levelOf(st), text = runText(b).replace(/[ \t]+/g, " ").trim();
    if (lvl) {
      if (!text) continue;
      if (lvl === 1) { chap = { id: slug(text), title: text, steps: [] }; chapters.push(chap); }
      if (!chap) continue;
      newStep(lvl, text); continue;
    }
    if (!step) continue;
    const imgs = [...b.matchAll(/r:embed="([^"]+)"/g)].map(x => rel[x[1]]).filter(Boolean).map(t => t.replace(/^\/?word\//, ""));
    const sn = (sname[st] || st || "").toLowerCase();
    if (text) step.blocks.push({ t: "p", text, ...(/<w:numPr>/.test(b) || /list/.test(sn) ? { list: true } : {}), ...(/caption|légende/.test(sn) ? { cap: true } : {}) });
    for (const src of imgs) step.blocks.push({ t: "img", src });
  }
  chapters.forEach(c => { c.steps = c.steps.filter(s => s.blocks.length); });
  return { chapters: chapters.filter(c => c.steps.length) };
}
export const bookStepsOf = book => ((book && book.chapters) || []).flatMap(c => c.steps.map(s => ({ ...s, chap: c.id, chapTitle: c.title })));
export const bookImages = book => [...new Set(bookStepsOf(book).flatMap(s => s.blocks.filter(b => b.t === "img").map(b => b.src)))];

// ── réponses d'un PJ : rows[id] = { v: true (case de validation), s: "ok" | "pb" (statut, absent = À faire), c: "commentaire", at, by }
export const STEP_STATUS = [["todo", "À faire"], ["ok", "OK"], ["pb", "Problème"]];
export const stepStatus = row => (row && (row.s === "ok" || row.s === "pb") ? row.s : "todo");
export function setStep(rows, id, patch, by, at = new Date().toISOString()) {
  const cur = { ...((rows || {})[id] || {}) };
  Object.entries(patch).forEach(([k, v]) => { if (v === "" || v == null || v === false || (k === "s" && v === "todo")) delete cur[k]; else cur[k] = v; });
  const out = { ...(rows || {}) }; const keep = ["v", "s", "c"].some(k => k in cur);
  if (keep) out[id] = { ...cur, at, ...(by ? { by } : {}) }; else delete out[id];
  return out;
}
export function manualProgress(book, rows) {
  const steps = bookStepsOf(book), R = rows || {};
  const n = k => steps.filter(s => k(R[s.id] || {})).length;
  const byChap = ((book && book.chapters) || []).map(c => ({ id: c.id, title: c.title, total: c.steps.length, valid: c.steps.filter(s => (R[s.id] || {}).v).length, ok: c.steps.filter(s => stepStatus(R[s.id]) === "ok").length, pb: c.steps.filter(s => stepStatus(R[s.id]) === "pb").length }));
  return { total: steps.length, valid: n(r => r.v), ok: n(r => stepStatus(r) === "ok"), pb: n(r => stepStatus(r) === "pb"), todo: n(r => stepStatus(r) === "todo"), byChap,
    problems: steps.filter(s => stepStatus(R[s.id]) === "pb").map(s => ({ id: s.id, chap: s.chapTitle, title: s.title, path: s.path, c: (R[s.id] || {}).c || "", by: (R[s.id] || {}).by || "", at: (R[s.id] || {}).at || "" })) };
}
// filtres du livret : statut (all, todo, ok, pb, novalid), chapitre (id ou ""), texte
export function filterSteps(book, rows, { status = "all", chap = "", q = "" } = {}) {
  const R = rows || {}, nrm = x => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), qq = nrm(q);
  return bookStepsOf(book).filter(s => (!chap || s.chap === chap)
    && (status === "all" || (status === "novalid" ? !(R[s.id] || {}).v : stepStatus(R[s.id]) === status))
    && (!qq || nrm([s.chapTitle, ...s.path, s.title, (R[s.id] || {}).c || "", ...s.blocks.filter(b => b.t === "p").map(b => b.text)].join(" ")).includes(qq)));
}

// ── exports et réimport (reprendre une session)
const csvCell = v => { const s = String(v == null ? "" : v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function exportCsv(book, rows, meta = {}) {
  const R = rows || {}, lab = Object.fromEntries(STEP_STATUS);
  const head = ["id", "chapitre", "etape", "chemin", "valide", "statut", "commentaire", "par", "le"];
  const lines = bookStepsOf(book).map(s => { const r = R[s.id] || {}; return [s.id, s.chapTitle, s.title, s.path.join(" › "), r.v ? "oui" : "non", lab[stepStatus(r)], r.c || "", r.by || "", r.at || ""].map(csvCell).join(";"); });
  return "﻿" + ["# " + [meta.title || "Livret", meta.pj || "", meta.at || ""].filter(Boolean).join(" · "), head.join(";"), ...lines].join("\r\n");
}
export function exportJson(book, rows, meta = {}) {
  return JSON.stringify({ format: "enogia-livret", version: 1, pj: meta.pj || "", livret: meta.title || "", ref: meta.ref || "", exporte: meta.at || new Date().toISOString(), etapes: bookStepsOf(book).length, reponses: rows || {} }, null, 2);
}
const splitCsv = line => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ";" || ch === ",") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
// lit un export JSON ou CSV du livret → { rows, pj, n, unknown } ; les étapes absentes du livret actuel sont comptées et ignorées
export function parseExport(text, book) {
  const ids = new Set(bookStepsOf(book).map(s => s.id)), t = String(text || "").replace(/^﻿/, "").trim();
  let rows = {}, pj = "";
  if (t.startsWith("{")) { const j = JSON.parse(t); if (j.format !== "enogia-livret" || typeof j.reponses !== "object") throw new Error("ce fichier JSON n'est pas un export de livret"); rows = j.reponses || {}; pj = j.pj || ""; }
  else {
    const L = t.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#")); const head = splitCsv(L.shift() || "").map(h => slug(h));
    const ix = k => head.indexOf(k); if (ix("id") < 0 || ix("statut") < 0) throw new Error("ce fichier CSV n'est pas un export de livret (colonnes id et statut attendues)");
    const toS = v => { const s = slug(v); return s === "ok" ? "ok" : /^probl/.test(s) ? "pb" : ""; };
    L.forEach(l => { const c = splitCsv(l), id = c[ix("id")]; if (!id) return; const r = {}; if (/^(oui|yes|1|true|x)$/i.test(String(c[ix("valide")] || "").trim())) r.v = true; const s = toS(c[ix("statut")]); if (s) r.s = s; const cm = ix("commentaire") >= 0 ? c[ix("commentaire")] : ""; if (cm) r.c = cm; if (ix("par") >= 0 && c[ix("par")]) r.by = c[ix("par")]; if (ix("le") >= 0 && c[ix("le")]) r.at = c[ix("le")]; if (Object.keys(r).length) rows[id] = r; });
  }
  const keep = {}; let unknown = 0; Object.entries(rows).forEach(([id, r]) => { if (ids.has(id)) keep[id] = r; else unknown++; });
  return { rows: keep, pj, n: Object.keys(keep).length, unknown };
}
// PDF imprimable : page HTML (le navigateur imprime en PDF)
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export function printHtml(book, rows, meta = {}) {
  const R = rows || {}, pr = manualProgress(book, rows), lab = Object.fromEntries(STEP_STATUS);
  const col = { ok: "#3B6620", pb: "#A82F15", todo: "#52607A" };
  const chap = ((book && book.chapters) || []).map(c => "<h2>" + esc(c.title) + "</h2><table><thead><tr><th>Étape</th><th>Validée</th><th>Statut</th><th>Commentaire</th></tr></thead><tbody>"
    + c.steps.map(s => { const r = R[s.id] || {}, st = stepStatus(r); return "<tr><td>" + (s.path.length ? '<span class="p">' + esc(s.path.join(" › ")) + " › </span>" : "") + esc(s.title) + '</td><td class="c">' + (r.v ? "☑" : "☐") + '</td><td style="color:' + col[st] + ';font-weight:600">' + lab[st] + "</td><td>" + esc(r.c || "") + (r.by ? '<div class="p">' + esc(r.by) + "</div>" : "") + "</td></tr>"; }).join("") + "</tbody></table>").join("");
  const pbs = pr.problems.length ? "<h2>Synthèse des problèmes (" + pr.problems.length + ")</h2><ul>" + pr.problems.map(p => "<li><b>" + esc(p.title) + "</b> <span class=\"p\">(" + esc(p.chap) + ")</span>" + (p.c ? " : " + esc(p.c) : "") + "</li>").join("") + "</ul>" : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc((meta.title || "Livret") + " - " + (meta.pj || ""))}</title><style>
@page{size:A4;margin:14mm}body{font:10pt Calibri,Carlito,Arial,sans-serif;color:#101828;margin:0}h1{font-size:18pt;margin:0 0 4px}h2{font-size:13pt;margin:16px 0 6px;border-bottom:1.5px solid #1D2C4E;padding-bottom:2px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #BFC6D1;padding:4px 6px;text-align:left;vertical-align:top}th{background:#E9EDF3;font-size:9pt}.c{text-align:center;width:52px}.p{color:#52607A;font-size:9pt}
.sum{display:flex;gap:18px;margin:8px 0 4px;font-size:11pt}.bar{height:8px;background:#E9EDF3;border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:#548C2F}tr{break-inside:avoid}
</style></head><body><h1>${esc(meta.title || "Livret de configuration")}</h1><div class="p">${esc([meta.ref, meta.pj, meta.nom, "exporté le " + new Date(meta.at || Date.now()).toLocaleDateString("fr-FR")].filter(Boolean).join(" · "))}</div>
<div class="sum"><span>${pr.valid} / ${pr.total} étapes validées</span><span style="color:#3B6620">${pr.ok} OK</span><span style="color:#A82F15">${pr.pb} problème${pr.pb > 1 ? "s" : ""}</span><span>${pr.todo} à faire</span></div>
<div class="bar"><i style="width:${pr.total ? Math.round(pr.valid / pr.total * 100) : 0}%"></i></div>${pbs}${chap}<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}

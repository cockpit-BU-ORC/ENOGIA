// v413 / v414 : demandes de transport ClickUp (liste « LOGISTIQUE V2 » de l'espace SCCM) → planning/transports (+ beta_transports), lues par l'accueil.
// Lecture seule dans ClickUp. Le jeton est dans Secret Manager (secret CLICKUP_TOKEN) : jamais dans Firestore, la page ni le dépôt.
// Recopiés : nom (« PJ | origine > destination | N colis »), état, urgence, dates souhaitées / prévues / réelles, PJ, transporteur, nombre de colis,
// demandeur. Jamais : adresses, personne à contacter, valeur de la marchandise, prix du transport, détails douaniers.
"use strict";

const API = "https://api.clickup.com/api/v2";
const LIST_ID = "901524181433";      // SCCM › LOGISTIQUE V2
const LIST_URL = "https://app.clickup.com/2618431/v/li/" + LIST_ID;
const KEEP_DAYS = 60;                // demandes livrées / closes gardées 60 jours
const F = {                          // champs personnalisés de la liste (identifiants ClickUp)
  projet: "96fe120d-d8fe-44d3-af6c-4731c6ba8455", type: "52b15f05-e132-4266-9c59-e863f48db330", demandeur: "71e2fff1-af58-445e-826d-237ce952d537",
  enlSouhaitee: "44e82667-1586-4dcc-a7b4-3e8b4720197e", enlPrevue: "ea0c4d19-4078-4e47-896e-0cdd90a2b8a3", enlReelle: "3d2b8d32-4da4-4fe0-a3ec-f111170a0639",
  livSouhaitee: "01fd8bf2-436b-4b86-a8fc-72a5324d1d59", livPrevue: "9b2383ae-a61d-4cf3-8be3-fce0a3791937", livReelle: "2e61e8f1-ff04-4461-a7df-d6f97d03454a",
  transporteur: "1c9d5161-6d31-4883-84f5-69e1d8d617df", colis: "9466c43a-c3fb-4940-b9a7-9b0c27219eda",
  // v416
  horsUE: "05dea813-b510-4d98-9960-2face8dd3898", incoterm: "d6ca9e9b-9f1d-4774-92b2-897d0d0efec8", cond: "2cc9ae71-8e9d-4dd7-93c7-8df695f2dc36",
  poids: "e6ed684c-afc8-4aa3-a6a8-39e3f2e878eb", dangereux: "69e5ea09-800f-4d7e-931b-b017641faa47", codeUN: "870048f1-71b8-4883-92fe-c28cc59f3cda", commentaire: "5c4f529d-3ec7-4ae4-96d8-8156a696de32",
};
// v416 : mode de transport — champ « Mode de transport » (liste à ajouter dans ClickUp) lu en priorité, sinon déduit du texte de la demande
// (le texte n est pas recopié). truck = route, plane = aérien / express aérien, boat = maritime
const MODE_WORDS = [["boat", /maritim|navire|bateau|conteneur|container|flat ?rack|\bport\b|booking|\bfcl\b|\blcl\b|fret mer|sea ?freight/i], ["plane", /avion|a[ée]rien|fret a[ée]r|air ?freight|by air|\bvol\b/i]];
function modeOf(t) {
  const f = (t.custom_fields || []).find(x => x && /mode/i.test(String(x.name || "")) && x.type === "drop_down"), v = f ? String(fieldVal(t, f.id) || "").toLowerCase() : "";
  if (v) return { mode: /mari|mer|bateau|sea/.test(v) ? "boat" : /a[ée]r|avion|air/.test(v) ? "plane" : "truck", modeEst: false };
  const txt = [t.name, t.text_content || t.description || "", fieldVal(t, F.commentaire) || ""].join(" ");
  const hit = MODE_WORDS.find(([, re]) => re.test(txt)); return { mode: hit ? hit[0] : "truck", modeEst: true };
}
function labelsOf(task, id) {
  const f = (task.custom_fields || []).find(x => x && x.id === id); if (!f || !Array.isArray(f.value)) return [];
  const opts = (f.type_config && f.type_config.options) || [];
  return f.value.map(v => (v && typeof v === "object" ? v.label : (opts.find(o => o.id === v) || {}).label)).filter(Boolean);
}
const unShort = l => { const m = String(l).match(/^(UN\d{4})\s*-?\s*(.*)$/i); if (!m) return cut(l, 30); const w = m[2].toLowerCase().replace(/au litihum|au lithium/, "lithium").replace(/ installée.*$/, "").replace(/ comprim[ée]$/, ""); return m[1].toUpperCase() + (w ? " " + cut(w, 22) : ""); };
// états « terminés » : colis livré (closed) et clôture des documents fournisseur ; « colis ramassé » = en route
const DONE_STATUS = ["colis livre", "cloture doc frn"];
const isDone = it => it.statusType === "closed" || DONE_STATUS.includes(String(it.status || "").toLowerCase().trim());

const iso = ms => { const n = Number(ms); return n > 0 ? new Date(n).toISOString().slice(0, 10) : ""; };
const pjOf = s => { const m = String(s || "").toUpperCase().match(/\b(PJ|SAV|PI)\s?(\d{3})(-\d+)?\b/); return m ? m[1] + m[2] + (m[3] || "") : ""; };
const cut = (s, n) => { const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

function fieldVal(task, id) {
  const f = (task.custom_fields || []).find(x => x && x.id === id); if (!f || f.value == null || f.value === "") return null;
  if (f.type === "drop_down") { const opts = (f.type_config && f.type_config.options) || []; const o = opts.find(x => x.id === f.value || x.orderindex === f.value); return o ? o.name : null; }
  return f.value;
}
// « PJ443 | ENOGIA > KAICI TECH | 3 colis » → { ref, from, to }
function routeOf(name) {
  const parts = String(name || "").split("|").map(s => s.trim());
  const leg = parts.find(p => p.includes(">")) || "", [from, to] = leg ? leg.split(">").map(s => s.trim()) : ["", ""];
  return { ref: parts.length > 1 ? parts[0] : "", from: cut(from, 60), to: cut(to, 60) };
}

// tâche ClickUp → demande de transport (données réduites)
function toItem(t) {
  const st = t.status || {}, rt = routeOf(t.name), n = Number(fieldVal(t, F.colis));
  const proj = fieldVal(t, F.projet);
  return {
    name: cut(t.name, 140), url: t.url || ("https://app.clickup.com/t/" + t.id),
    pj: pjOf(proj) || pjOf(rt.ref) || pjOf(t.name), ref: cut(proj || rt.ref, 40), from: rt.from, to: rt.to,
    status: String(st.status || ""), statusType: String(st.type || ""), order: Number(st.orderindex) || 0,
    urgent: String(fieldVal(t, F.type) || "").toLowerCase() === "urgent",
    enlSouhaitee: iso(fieldVal(t, F.enlSouhaitee)), enlPrevue: iso(fieldVal(t, F.enlPrevue)), enlReelle: iso(fieldVal(t, F.enlReelle)),
    livSouhaitee: iso(fieldVal(t, F.livSouhaitee)), livPrevue: iso(fieldVal(t, F.livPrevue)), livReelle: iso(fieldVal(t, F.livReelle)),
    transporteur: cut(fieldVal(t, F.transporteur), 40), colis: n > 0 ? n : null, demandeur: cut(fieldVal(t, F.demandeur), 60),
    ...modeOf(t), horsUE: String(fieldVal(t, F.horsUE) || "").toUpperCase() === "OUI", incoterm: cut(String(fieldVal(t, F.incoterm) || "").replace(/\s*\(.*\)$/, ""), 12),
    cond: cut(String(fieldVal(t, F.cond) || "").replace(/\s*\(.*\)$/, ""), 40), poids: Number(fieldVal(t, F.poids)) > 0 ? Number(fieldVal(t, F.poids)) : null,
    dangereux: String(fieldVal(t, F.dangereux) || "").toUpperCase() === "OUI", un: labelsOf(t, F.codeUN).map(unShort).slice(0, 3),
    created: iso(t.date_created), updated: iso(t.date_updated), updatedAt: Number(t.date_updated) > 0 ? new Date(Number(t.date_updated)).toISOString() : "", // v418 : heure exacte (fil « En direct ») closed: iso(t.date_closed || t.date_done),
  };
}
// garder : tout ce qui est en cours, et ce qui a été livré / clos depuis moins de KEEP_DAYS jours
function keep(item, now) {
  if (!isDone(item)) return true;
  const d = item.livReelle || item.closed || item.updated; return !!d && (Date.parse(now) - Date.parse(d)) / 864e5 <= KEEP_DAYS;
}
function buildTransports(tasks, now) {
  const items = {};
  (tasks || []).forEach(t => { if (!t || !t.id || t.archived) return; const it = toItem(t); if (keep(it, now)) items[t.id] = it; });
  return items;
}

// toutes les demandes ouvertes + celles fermées ou modifiées depuis KEEP_DAYS jours (deux lectures, doublons fusionnés)
async function readTasks(token, now) {
  const since = Date.parse(now || new Date().toISOString()) - KEEP_DAYS * 864e5;
  const a = await readPages(token, "include_closed=false"), b = await readPages(token, "include_closed=true&date_updated_gt=" + since);
  const by = {}; [...a, ...b].forEach(t => { if (t && t.id) by[t.id] = t; }); return Object.values(by);
}
async function readPages(token, base) {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const q = base + "&subtasks=false&order_by=updated&page=" + page;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 30000);
    let res; try { res = await fetch(API + "/list/" + LIST_ID + "/task?" + q, { headers: { Authorization: token }, signal: ctl.signal }); } finally { clearTimeout(tm); }
    if (!res.ok) throw new Error("ClickUp a répondu " + res.status + (res.status === 401 ? " (jeton refusé)" : res.status === 404 ? " (liste introuvable pour ce jeton)" : ""));
    const j = await res.json(), tasks = j.tasks || []; out.push(...tasks);
    if (j.last_page || tasks.length < 100) break;
  }
  return out;
}

module.exports = { LIST_ID, LIST_URL, toItem, keep, isDone, buildTransports, readTasks, pjOf, routeOf, modeOf };

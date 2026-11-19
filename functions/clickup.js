// v413 : demandes de transport ClickUp (liste « Logistique » de l'espace SCCM) → planning/transports (+ beta_transports), lues par l'accueil.
// Lecture seule dans ClickUp. Le jeton est dans Secret Manager (secret CLICKUP_TOKEN) : jamais dans Firestore, la page ni le dépôt.
// Ne sont recopiés que le nom de la demande, l'état, les dates, le PJ, le transporteur et l'auteur (pas d'adresse e-mail, de téléphone ni de prix).
"use strict";

const API = "https://api.clickup.com/api/v2";
const LIST_ID = "38157935";          // SCCM › Logistique
const KEEP_DAYS = 60;                // demandes livrées / closes gardées 60 jours
const F = {                          // champs personnalisés de la liste (identifiants ClickUp)
  projetDd: "d61d2631-638a-4b3f-bc46-1ffffafe8cf4", projetTxt: "cb9f016f-a6af-4fab-ace5-0c249e77a549",
  enlevement: "bb3d5a4e-a94d-409a-b72e-27c2da825a57", enlevementSouhaite: "0ceb40c2-1435-4b11-9151-a17b2491ee38",
  expeSouhaitee: "509f399d-02f8-4b97-80cf-24dc288ad9e2", livraisonEst: "c4bcfc80-4def-4140-a75a-d9ed689029a5",
  livraisonSouhaitee: "74358379-28e1-45e9-9474-abab030641c4", transporteur: "bef6c140-1489-44cf-ac46-27958bbc3196", contenu: "097dd218-fb04-49ae-ab20-26d1694fcb27",
};

const iso = ms => { const n = Number(ms); return n > 0 ? new Date(n).toISOString().slice(0, 10) : ""; };
const pjOf = s => { const m = String(s || "").toUpperCase().match(/\b(PJ|SAV|PI)\s?(\d{3})(-\d+)?\b/); return m ? m[1] + m[2] + (m[3] || "") : ""; };
const cut = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

function fieldVal(task, id) {
  const f = (task.custom_fields || []).find(x => x && x.id === id); if (!f || f.value == null || f.value === "") return null;
  if (f.type === "drop_down") { const opts = (f.type_config && f.type_config.options) || []; const o = opts.find(x => x.id === f.value || x.orderindex === f.value); return o ? o.name : null; }
  return f.value;
}

// tâche ClickUp → demande de transport (données réduites)
function toItem(t) {
  const st = t.status || {};
  const pj = pjOf(fieldVal(t, F.projetDd)) || pjOf(fieldVal(t, F.projetTxt)) || pjOf(t.name);
  return {
    name: cut(t.name, 140), url: t.url || ("https://app.clickup.com/t/" + t.id), pj,
    status: String(st.status || ""), statusType: String(st.type || ""), order: Number(st.orderindex) || 0,
    enlevement: iso(fieldVal(t, F.enlevement)) || iso(fieldVal(t, F.enlevementSouhaite)) || iso(fieldVal(t, F.expeSouhaitee)),
    livraison: iso(fieldVal(t, F.livraisonEst)) || iso(fieldVal(t, F.livraisonSouhaitee)),
    transporteur: cut(fieldVal(t, F.transporteur), 60), contenu: cut(fieldVal(t, F.contenu), 100),
    by: cut((t.creator && t.creator.username) || "", 60), created: iso(t.date_created), updated: iso(t.date_updated), closed: iso(t.date_closed || t.date_done),
  };
}
// garder : tout ce qui est ouvert, et ce qui a été livré / clos depuis moins de KEEP_DAYS jours
function keep(item, now) {
  const done = item.statusType === "closed" || item.statusType === "done";
  if (!done) return true;
  const d = item.closed || item.updated; return !!d && (Date.parse(now) - Date.parse(d)) / 864e5 <= KEEP_DAYS;
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
    if (!res.ok) throw new Error("ClickUp a répondu " + res.status + (res.status === 401 ? " (jeton refusé)" : ""));
    const j = await res.json(), tasks = j.tasks || []; out.push(...tasks);
    if (j.last_page || tasks.length < 100) break;
  }
  return out;
}

module.exports = { LIST_ID, toItem, keep, buildTransports, readTasks, pjOf };

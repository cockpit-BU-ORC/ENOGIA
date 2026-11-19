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
};
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
    created: iso(t.date_created), updated: iso(t.date_updated), closed: iso(t.date_closed || t.date_done),
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

module.exports = { LIST_ID, LIST_URL, toItem, keep, isDone, buildTransports, readTasks, pjOf, routeOf };

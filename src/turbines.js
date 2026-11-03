// v146.22 — Pool de turbines (100LT / 20LT) : logique pure (stock à venir par semaine, mise à jour du pool).
// v260 : lecture de l'Excel, fichier du responsable turbines, import / export et « à communiquer » retirés (plus utilisés depuis la v257).
// Modèle : une turbine = { id, type, ref, mad, target, wheel:{name,ok}, injector:{name,ok}, note }.
//  · mad     = date de mise à disposition (MàD) ISO « AAAA-MM-JJ »
//  · target  = null (libre) | { kind:"PJ", ref:"PJ482-1" } | { kind:"SAV", ref:"texte libre" }
//  · wheel / injector = nom pris dans la liste (wheelNames / injectorNames) + case cochée = élément réservé pour CETTE turbine.
//    Décocher libère l'élément pour autre chose (un nom coché ne peut servir qu'une seule fois).
export const TURBINE_TYPES = ["100LT", "20LT"];

const pad = n => String(n).padStart(2, "0");
export const isoOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const dateOf = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
export const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
// Numéro de semaine ISO et lundi d'une semaine ISO
export function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / 864e5 + 1) / 7) }; }
export const weekLabel = iso => { const d = dateOf(iso); return d ? "S" + isoWeek(d).week : ""; };
export const fmtFr = iso => { const d = dateOf(iso); return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2) : ""; };

let SEQ = 0;
export const newTurbineId = () => "t" + Date.now().toString(36) + (SEQ++).toString(36) + Math.random().toString(36).slice(2, 4);
export const makeTurbine = (p = {}) => ({ id: p.id || newTurbineId(), type: p.type || "100LT", ref: p.ref || "", mad: p.mad || "", target: p.target || null, wheel: p.wheel || { name: "", ok: false }, injector: p.injector || { name: "", ok: false }, note: p.note || "", ...(p.origin ? { origin: p.origin } : {}), ...(p.need ? { need: p.need } : {}), ...(p.serial ? { serial: p.serial } : {}), ...(p.model ? { model: p.model } : {}) });
export const isFree = t => !t.target;

// Référence automatique stable : T100-001, T100-002… (T20-001…) — sert à recoller les lignes d'un export/import.
export function autoRef(turbines, type, extra = []) {
  const pre = type === "20LT" ? "T20-" : "T100-";
  const used = new Set([...(turbines || []), ...extra].map(t => String(t.ref || "").toLowerCase()));
  let n = 1; while (used.has((pre + String(n).padStart(3, "0")).toLowerCase())) n++;
  return pre + String(n).padStart(3, "0");
}
// Changement de date de MàD « en direct » : on garde la date de référence du dernier import / export (madSrc) pour ne pas perdre la correction au prochain import
export const withMad = (t, mad) => ({ ...t, mad, madSrc: t.madSrc || t.mad });

export function turbineStatus(t, todayIso) {
  const late = lateDays(t);
  if (t.mad && t.mad <= todayIso) return "Livré";
  return late > 10 ? "Critique" : late > 0 ? "En retard" : "OK";
}
// Pré-remplissage depuis le planning : une turbine « à prévoir » par besoin non couvert, daté de l'arrivée de l'ORC (la date de besoin).
// Le responsable turbines ajuste ensuite les dates (live ou par ré-import) et peut en ajouter. origin = PJ à l'origine du besoin.
export function planningNeeds(rows, turbines, isDone) {
  const have = {}; (turbines || []).forEach(t => { const k = t.target && t.target.kind === "PJ" ? t.target.ref : t.origin; if (k) have[k] = (have[k] || 0) + 1; });
  const out = [];
  (rows || []).forEach(r => {
    if (!r || !r.pj || (isDone && isDone(r)) || r.etat === "SLOT_LIBRE") return;
    const need = turbinesNeeded(r.gamme); if (!need) return;
    const missing = need.n - (have[r.pj] || 0);
    for (let i = 0; i < missing; i++) out.push({ type: need.type, mad: r.arrivee || r.tests || "", origin: r.pj });
  });
  return out.filter(x => x.mad);
}

export const byMad = (a, b) => (a.mad || "9999").localeCompare(b.mad || "9999") || a.type.localeCompare(b.type) || (a.ref || "").localeCompare(b.ref || "");

// Noms de roues / d'injecteurs déjà pris (case cochée) : nom -> turbine
export function takenNames(turbines, kind, exceptId) {
  const m = new Map();
  (turbines || []).forEach(t => { const e = t[kind]; if (e && e.ok && e.name && t.id !== exceptId) m.set(e.name, t); });
  return m;
}
export const targetLabel = t => !t.target ? "" : (t.target.kind === "SAV" ? "SAV" + (t.target.ref ? " · " + t.target.ref : "") : t.target.ref);

// Stock à venir par semaine : pour chaque type et chaque lundi → { arrivent, libres (cumul : MàD ≤ fin de semaine, non attribuées), attribuees (cumul) }
export function stockByWeek(turbines, mondays) {
  const out = {};
  TURBINE_TYPES.forEach(type => {
    out[type] = mondays.map(mon => {
      const end = isoOf(addDays(mon, 6)), start = isoOf(mon);
      const L = (turbines || []).filter(t => t.type === type && t.mad);
      return {
        arrivent: L.filter(t => t.mad >= start && t.mad <= end).length,
        libres: L.filter(t => t.mad <= end && isFree(t)).length,
        attribuees: L.filter(t => t.mad <= end && !isFree(t)).length,
      };
    });
  });
  return out;
}
export function summary(turbines, todayIso) {
  const out = {};
  TURBINE_TYPES.forEach(type => {
    const L = (turbines || []).filter(t => t.type === type);
    out[type] = { libresMaintenant: L.filter(t => isFree(t) && t.mad && t.mad <= todayIso).length, libresAVenir: L.filter(t => isFree(t) && (!t.mad || t.mad > todayIso)).length, attribuees: L.filter(t => !isFree(t)).length, total: L.length };
  });
  return out;
}

// ── v146.24 : tableau d'attribution (glisser-déposer) ───────────────────────────────────────────
// Une turbine « 100 kW » (type 100LT) équipe les gammes 100 (LT/MT : 1 turbine) et 180 (LT/MT : 2 turbines) ;
// une turbine « 20 kW » (type 20LT) équipe les gammes 20 (1 turbine) et 40 (2 turbines). Les autres gammes n'ont pas de turbine à attribuer.
export const TYPE_LABEL = { "100LT": "100 kW", "20LT": "20 kW" };
export function turbinesNeeded(gamme) {
  const m = /^(\d+)\s*(LT|MT)/i.exec(String(gamme || "").trim());
  if (!m) return null;
  const n = +m[1];
  if (n === 100) return { type: "100LT", n: 1 };
  if (n === 180) return { type: "100LT", n: 2 };
  if (n === 20) return { type: "20LT", n: 1 };
  if (n === 40) return { type: "20LT", n: 2 };
  return null;
}
export const urgencyOf = (iso, todayIso, horizon = 7) => { const d = iso ? dayDiff(iso, todayIso) : null; return d == null ? null : d <= horizon ? "error" : d <= horizon * 3 ? "warn" : null; };
export const hasEl = e => !!(e && e.name);
export const dayDiff = (iso, todayIso) => { const a = dateOf(iso), b = dateOf(todayIso); return a && b ? Math.round((a - b) / 86400000) : null; };

// Échéances d'un PJ (v146.27) : tout part de l'ARRIVÉE de la machine chez nous (row.arrivee) —
//   · turbine MàD au plus tard à l'arrivée ; · roue connue au plus tard 1 semaine avant l'arrivée ; · injecteur disponible le jour de l'arrivée.
// Sans date d'arrivée : on retombe sur le début des tests (turbine, roue) et le départ (injecteur).
export function dueDates(row) {
  const ar = row && row.arrivee ? row.arrivee : "";
  const d = ar && dateOf(ar);
  return {
    turbine: ar || (row && row.tests) || "",
    wheel: d ? isoOf(addDays(d, -7)) : (row && row.tests) || "",
    injector: ar || (row && row.depart) || "",
    fromArrival: !!d,
  };
}
// Contrôle d'un PJ : turbines manquantes, roue (1 semaine avant l'arrivée) et injecteur (jour de l'arrivée) absents.
//   row : ligne du planning (gamme, arrivee, tests, depart, etat) ; assigned : turbines attribuées à ce PJ ; horizon : jours avant lesquels c'est une erreur ;
//   loose : roues / injecteurs posés sur le PJ sans turbine ([{kind,name}]) — ils comblent les turbines qui n'ont pas encore le leur.
// → { need, have, wheels, injectors, complete, missing, issues:[{level:"error"|"warn", scope, text}] }
export function pjCheck(row, assigned, todayIso, horizon = 7, loose = []) {
  const need = (row && row.needOverride) || turbinesNeeded(row && row.gamme), have = (assigned || []).length, issues = [];
  const shipped = row && row.etat === "SHIPPED";
  const due = dueDates(row);
  const dT = due.turbine ? dayDiff(due.turbine, todayIso) : null, dW = due.wheel ? dayDiff(due.wheel, todayIso) : null, dI = due.injector ? dayDiff(due.injector, todayIso) : null;
  const lvl = d => d == null ? null : d <= horizon ? "error" : d <= horizon * 3 ? "warn" : null;
  const when = (d, what) => d < 0 ? what + " dépassé" : d === 0 ? what + " aujourd'hui" : what + " dans " + d + " j";
  const ref = due.fromArrival ? "arrivée" : "tests";
  let looseW = (loose || []).filter(l => l.kind === "wheel").length, looseI = (loose || []).filter(l => l.kind === "injector").length;
  const wheels = (assigned || []).filter(t => hasEl(t.wheel)).length + looseW, injectors = (assigned || []).filter(t => hasEl(t.injector)).length + looseI;
  const target = need ? need.n : have;
  const missing = { turbines: need ? Math.max(0, need.n - have) : 0, wheels: Math.max(0, target - wheels), injectors: Math.max(0, target - injectors) };
  if (!shipped) {
    if (missing.turbines) { const l = lvl(dT); if (l) issues.push({ level: l, scope: "card", text: missing.turbines + " turbine" + (missing.turbines > 1 ? "s" : "") + " à attribuer — " + when(dT, ref) }); }
    (assigned || []).forEach(t => {
      const nm = t.ref || TYPE_LABEL[t.type] || "turbine";
      if (!hasEl(t.wheel)) { if (looseW > 0) looseW--; else { const l = lvl(dW); if (l) issues.push({ level: l, scope: "wheel", id: t.id, text: "Roue manquante sur " + nm + " — " + (due.fromArrival ? "à connaître 1 sem. avant l'arrivée (" + fmtFr(due.wheel) + ")" : when(dW, "tests")) }); } }
      if (!hasEl(t.injector)) { if (looseI > 0) looseI--; else { const l = lvl(dI); if (l) issues.push({ level: l, scope: "injector", id: t.id, text: "Injecteur manquant sur " + nm + " — " + when(dI, due.fromArrival ? "arrivée" : "départ") }); } }
      if (need && t.type !== need.type) issues.push({ level: "warn", scope: "card", text: nm + " est une " + TYPE_LABEL[t.type] + " alors que la gamme demande une " + TYPE_LABEL[need.type] });
      if (t.mad && due.turbine && t.mad > due.turbine) issues.push({ level: "warn", scope: "card", text: nm + " : MàD le " + fmtFr(t.mad) + ", après " + (due.fromArrival ? "l'arrivée de la machine (" : "le début des tests (") + fmtFr(due.turbine) + ")" });
    });
    if (need && have > need.n) issues.push({ level: "warn", scope: "card", text: have + " turbines attribuées pour " + need.n + " attendue" + (need.n > 1 ? "s" : "") });
  }
  // « Complet » seulement quand tout est rempli : toutes les turbines, avec leur roue ET leur injecteur
  const complete = !!need && !shipped && have >= need.n && wheels >= need.n && injectors >= need.n && issues.length === 0;
  return { need, have, wheels, injectors, complete, missing, issues };
}

// Déplacements (fonctions pures sur la liste de turbines)
export function moveTurbine(turbines, id, target) {
  return (turbines || []).map(t => t.id !== id ? t : { ...t, target: target || null, ...(target ? {} : { wheel: { name: "", ok: false }, injector: { name: "", ok: false } }) });
}
// Pose (ou retire, si turbineId est nul) une roue / un injecteur : un nom ne sert qu'à une seule turbine
export function placeElement(turbines, kind, name, turbineId) {
  return (turbines || []).map(t => {
    if (t[kind] && t[kind].name === name && t.id !== turbineId) return { ...t, [kind]: { name: "", ok: false } };
    if (t.id === turbineId) return { ...t, [kind]: { name, ok: true } };
    return t;
  });
}

// Roues / injecteurs « seuls » (sans turbine), posés sur un PJ ou un SAV : looseEls = [{kind:"wheel"|"injector", name, target:{kind,ref}}]
// Un nom ne sert qu'une fois : le poser ici le retire de toute turbine et de tout autre PJ ; target nul = retour dans la liste.
export function placeLoose(turbines, loose, kind, name, target) {
  const L = (turbines || []).map(t => t[kind] && t[kind].name === name ? { ...t, [kind]: { name: "", ok: false } } : t);
  const rest = (loose || []).filter(l => !(l.kind === kind && l.name === name));
  return { turbines: L, looseEls: target ? [...rest, { kind, name, target: { kind: target.kind, ref: target.ref } }] : rest };
}
// Un élément posé sur une turbine quitte la liste des « seuls »
export const dropLoose = (loose, kind, name) => (loose || []).filter(l => !(l.kind === kind && l.name === name));
export const looseOf = (loose, target) => (loose || []).filter(l => l.target && target && l.target.kind === target.kind && l.target.ref === target.ref);
// Quand une turbine arrive sur un PJ / SAV qui a déjà une roue ou un injecteur « seul », elle le prend s'il lui manque
export function absorbLoose(turbines, loose, turbineId) {
  let L = turbines || [], out = loose || [];
  const t = L.find(x => x.id === turbineId); if (!t || !t.target) return { turbines: L, looseEls: out };
  let cur = t;
  ["wheel", "injector"].forEach(kind => {
    if (hasEl(cur[kind])) return;
    const l = looseOf(out, t.target).find(x => x.kind === kind);
    if (l) { cur = { ...cur, [kind]: { name: l.name, ok: true } }; out = dropLoose(out, kind, l.name); }
  });
  return { turbines: L.map(x => x.id === turbineId ? cur : x), looseEls: out };
}

// Projet SAV : « SAV » + numéro du PJ concerné (PJ411 → SAV411, PJ411-1 → SAV411-1)
export const savName = pj => { const m = /(\d+)(?:\s*-\s*(\d+))?/.exec(String(pj == null ? "" : pj)); return m ? "SAV" + m[1] + (m[2] ? "-" + m[2] : "") : ""; };
// Retard de la MàD sur l'échéance du fichier du responsable (jours, 0 si dans les temps ou sans échéance)
export const lateDays = t => { if (!t || !t.mad || !t.need) return 0; const a = dateOf(t.mad), b = dateOf(t.need); return a && b ? Math.max(0, Math.round((a - b) / 86400000)) : 0; };

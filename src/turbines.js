// v146.22 — Pool de turbines (100LT / 20LT) : logique pure (lecture de l'Excel, stock à venir par semaine, mise à jour du pool).
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
export function mondayOfIsoWeek(year, week) { const j4 = new Date(year, 0, 4); const m = mondayOf(j4); return addDays(m, (week - 1) * 7); }
export const weekLabel = iso => { const d = dateOf(iso); return d ? "S" + isoWeek(d).week : ""; };
export const fmtFr = iso => { const d = dateOf(iso); return d ? pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + String(d.getFullYear()).slice(2) : ""; };

export function normType(v) {
  const s = String(v == null ? "" : v).toUpperCase().replace(/\s+/g, "");
  if (/^(100|100KW|100LT|LT100)/.test(s) || /100/.test(s)) return "100LT";
  if (/^(20|20KW|20LT|LT20)/.test(s) || /(^|[^0-9])20([^0-9]|$)/.test(s)) return "20LT";
  return null;
}

// Date : objet Date, numéro de série Excel, « 2026-11-05 », « 05/11/2026 », « 05/11/26 », ou semaine « S45 », « 2026-S45 », « S45 2026 », « 45 »
export function parseWhen(v, today = new Date()) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return isoOf(new Date(v.getFullYear(), v.getMonth(), v.getDate() + (v.getHours() >= 12 ? 1 : 0)));   // SheetJS décale parfois les dates de quelques heures (fuseau) : on arrondit au jour le plus proche
  if (typeof v === "number") {
    if (v > 20000 && v < 80000) { const u = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return isoOf(new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate())); }
    if (v >= 1 && v <= 53) return weekIso(Math.round(v), null, today);
    return null;
  }
  let s = String(v).trim();
  if (/^(#n\/?a|nc|n\/a|-+)$/i.test(s)) return null;
  s = s.replace(/^[A-Za-zÀ-ÿ]{2,9}\.?\s+(?=\d)/, "");   // « lun. 07/09/26 » → « 07/09/26 »
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; const d = new Date(y, +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? isoOf(d) : null; }
  m = /^(?:(\d{4})[\s/-]*)?(?:S|W|SEM(?:AINE)?)\s*(\d{1,2})(?:[\s/-]*(\d{4}))?$/i.exec(s);
  if (m) return weekIso(+m[2], +(m[1] || m[3]) || null, today);
  m = /^(\d{1,2})$/.exec(s); if (m && +m[1] >= 1 && +m[1] <= 53) return weekIso(+m[1], null, today);
  return null;
}
// Lundi d'une semaine ISO ; sans année : l'année qui rend la date la plus proche d'aujourd'hui (jamais plus de 6 mois dans le passé)
function weekIso(week, year, today) {
  if (week < 1 || week > 53) return null;
  if (year) return isoOf(mondayOfIsoWeek(year, week));
  const y = today.getFullYear();
  const c = [y - 1, y, y + 1].map(yy => mondayOfIsoWeek(yy, week)).filter(d => d >= addDays(today, -183));
  return c.length ? isoOf(c[0]) : null;
}

const hdr = s => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// rows = tableau de lignes (feuille Excel lue avec header:1). Retour : { items:[{type,mad,ref}], errors:[texte] }
export function parseTurbineRows(rows, today = new Date()) {
  const out = { items: [], errors: [] };
  const R = (rows || []).filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ""));
  if (!R.length) { out.errors.push("Fichier vide."); return out; }
  let col = { type: 0, when: 1, ref: 2, qty: 3 }, start = 0;
  const h = R[0].map(hdr);
  const find = re => h.findIndex(x => re.test(x));
  const iType = find(/type|gamme|puissance|kw|turbine/), iWhen = find(/mad|date|semaine|dispo|livraison|arrivee/);
  if (iType >= 0 && iWhen >= 0 && iType !== iWhen) {
    const iId = find(/^id\b|identifiant/);
    col = { type: iType, when: iWhen, ref: find(/ref|serie|n°|numero/), qty: find(/quant|qte|nombre|nb/), id: iId };
    start = 1;
  }
  R.slice(start).forEach((r, k) => {
    const line = k + start + 1;
    const type = normType(r[col.type]); const mad = parseWhen(r[col.when], today);
    if (!type) { out.errors.push("Ligne " + line + " : type de turbine non reconnu (« " + (r[col.type] == null ? "" : r[col.type]) + " »)."); return; }
    if (!mad) { out.errors.push("Ligne " + line + " : date ou semaine illisible (« " + (r[col.when] == null ? "" : r[col.when]) + " »)."); return; }
    const q = col.qty >= 0 && r[col.qty] !== "" && r[col.qty] != null ? Math.round(+r[col.qty]) : 1;
    if (!(q >= 1 && q <= 50)) { out.errors.push("Ligne " + line + " : quantité invalide."); return; }
    const ref = col.ref >= 0 && r[col.ref] != null ? String(r[col.ref]).trim() : "";
    const id = col.id >= 0 && r[col.id] != null ? String(r[col.id]).trim() : "";
    for (let i = 1; i <= q; i++) out.items.push({ type, mad, ref: ref && q > 1 ? ref + "-" + i : ref, id: q === 1 ? id : "" });
  });
  return out;
}

// ── v146.26 : fichier du responsable turbines (« Livraisons_Turbines_ORC ») ───────────────────────
// Deux présentations, reconnues automatiquement :
//  · feuille large « Dates_livraison_turbines » : Projet | Modèle | N° Série | Échéance | Livraison S06 … S42 | Status | Retard → la MàD est la dernière date de livraison renseignée ;
//  · feuilles hebdomadaires « IMPORT_Sxx » : Projet | Échéance | Date de livraison (sans en-tête, sans modèle : le type est déduit de la gamme du PJ).
// Le nom de ligne « PJ446-10-1 » = fiche PJ446-10, turbine n° 1 ; « PJ460-1 » = fiche PJ460-1 (une seule turbine) ; « SAV411 » = projet SAV411.
export const isBossId = v => /^(PJ\s?\d|SAV)/i.test(String(v == null ? "" : v).trim());
export function bossTarget(id, pjIds) {
  const s = String(id).trim().replace(/\s+/g, "").toUpperCase();
  if (/^SAV\d+/.test(s)) return { kind: "SAV", ref: s.replace(/^(SAV\d+).*$/, "$1") };
  if (/^SAV/.test(s)) return null;                         // « SAV » sans numéro : à préciser
  const ids = pjIds || new Set();
  if (ids.has(s)) return { kind: "PJ", ref: s };
  const cut = s.replace(/-\d+$/, "");
  if (cut !== s && (ids.has(cut) || /-/.test(cut))) return { kind: "PJ", ref: cut };
  return { kind: "PJ", ref: s };
}
// ctx : { pjIds:Set, typeOf(id, target) → "100LT"|"20LT"|null, skip(target, mad, id) → true pour ignorer la ligne }
export function parseBossRows(rows, ctx = {}, today = new Date()) {
  const out = { items: [], errors: [], guessed: 0, noDate: 0, unspecified: 0, skipped: 0, kind: "" };
  const R = (rows || []).filter(r => Array.isArray(r));
  const hi = R.findIndex(r => r.some(c => /^projet$/.test(hdr(c).trim())) && r.some(c => /livraison|modele/.test(hdr(c))));
  const finish = (id, type, mad, need, serial, model, techId) => {
    const target = isBossId(id) ? bossTarget(id, ctx.pjIds) : null;
    if (!mad) { out.noDate++; return; }
    if (ctx.skip && ctx.skip(target, mad, String(id).trim())) { out.skipped++; return; }   // projet déjà expédié / installé, ou ancienne livraison sans projet en cours
    let ty = type || (ctx.typeOf && ctx.typeOf(String(id).trim(), target)) || null;
    if (!ty) { ty = "100LT"; out.guessed++; }
    if (/^SAV$/i.test(String(id).trim())) out.unspecified++;
    out.items.push({ ref: String(id).trim(), type: ty, mad, need: need || "", serial: serial || "", model: model || "", target, id: techId || "", note: /^SAV$/i.test(String(id).trim()) ? "SAV à préciser" : "" });
  };
  if (hi >= 0) {
    out.kind = "large";
    const h = R[hi].map(hdr);
    const iId = h.findIndex(x => /^id\b/.test(x.trim())), iProj = h.findIndex(x => /^projet$/.test(x.trim())), iModel = h.findIndex(x => /modele/.test(x)), iSerie = h.findIndex(x => /serie/.test(x)), iNeed = h.findIndex(x => /echeance/.test(x));
    const iDel = h.map((x, i) => /livraison/.test(x) ? i : -1).filter(i => i >= 0);
    R.slice(hi + 1).forEach(r => {
      const id = r[iProj], techId = iId >= 0 && r[iId] != null ? String(r[iId]).trim() : ""; if (!isBossId(id) && !(techId && id)) return;   // ligne du fichier du responsable (PJ… / SAV…) ou ligne de notre export (Id technique)
      let mad = null; iDel.forEach(i => { const d = parseWhen(r[i], today); if (d) mad = d; });
      finish(id, iModel >= 0 ? normType(r[iModel]) : null, mad, iNeed >= 0 ? parseWhen(r[iNeed], today) : null, iSerie >= 0 && r[iSerie] != null ? String(r[iSerie]).trim() : "", iModel >= 0 && r[iModel] != null ? String(r[iModel]).trim() : "", techId);
    });
  } else {
    out.kind = "hebdo";
    R.forEach(r => { if (!isBossId(r[0])) return; finish(r[0], null, parseWhen(r[2], today), parseWhen(r[1], today), ""); });
  }
  if (!out.items.length) out.errors.push("Aucune ligne « PJxxx / SAVxxx » exploitable (colonnes : projet, échéance, date de livraison).");
  return out;
}

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

// Import / ré-import : on ne casse jamais le pool.
//  · une ligne retrouvée (colonne Id, sinon Réf.) ne met à jour que le type et la date de MàD — jamais l'attribution, la roue ou l'injecteur ;
//  · fusion à trois : si la date du fichier est celle du dernier export / import (madSrc), le fichier n'a pas changé → la correction faite ici est conservée ;
//    si le fichier a une autre date, la sienne est retenue (signalée dans « conflicts » quand une correction locale existait) ;
//  · une ligne inconnue crée une turbine (réf. automatique si vide) ; les turbines absentes du fichier restent, sauf option removeFreeAbsent (libres seulement).
export function mergeImport(current, parsed, opts = {}) {
  const cur = (current || []).map(t => ({ ...t }));
  const byId = new Map(cur.map(t => [t.id, t])), byRef = new Map();
  cur.forEach(t => { if (t.ref) byRef.set(t.ref.toLowerCase(), t); });
  const attach = opts.attach !== false;   // false : les turbines du fichier arrivent LIBRES dans le stock (l'attribution se fait dans l'outil) ; leur réf. garde le PJ prévu par le responsable
  const seen = new Set(), fresh = [], conflicts = [], newSav = [];
  let updated = 0, added = 0, removed = 0;
  (parsed || []).forEach(p => {
    const hit = (p.id && byId.get(p.id)) || (p.ref && byRef.get(p.ref.toLowerCase())) || null;
    if (hit && !seen.has(hit.id)) {
      seen.add(hit.id);
      const base = hit.madSrc || hit.mad, local = hit.mad !== base;
      let ch = false;
      if (hit.type !== p.type) { hit.type = p.type; ch = true; }
      if (p.mad !== base) { if (local && p.mad !== hit.mad) conflicts.push({ ref: hit.ref || hit.id, live: hit.mad, file: p.mad }); if (hit.mad !== p.mad) ch = true; hit.mad = p.mad; }
      hit.madSrc = hit.mad;
      if (p.need && hit.need !== p.need) { hit.need = p.need; ch = true; }
      if (p.serial && !hit.serial) hit.serial = p.serial;
      if (p.model && !hit.model) hit.model = p.model;
      if (ch) updated++;
      return;
    }
    const t = makeTurbine({ type: p.type, mad: p.mad, ref: p.ref || autoRef(cur, p.type, fresh), need: p.need, serial: p.serial, model: p.model, note: p.note, target: attach ? (p.target || null) : null });
    t.madSrc = t.mad;
    if (t.target) { t.shared = snapOf(t); if (t.target.kind === "SAV" && !newSav.includes(t.target.ref)) newSav.push(t.target.ref); }   // attribution venue du fichier du responsable : il la connaît déjà
    fresh.push(t); added++;
  });
  const absent = cur.filter(t => !seen.has(t.id) && isFree(t));
  let kept = cur;
  if (opts.removeFreeAbsent) { const gone = new Set(absent.map(t => t.id)); kept = cur.filter(t => !gone.has(t.id)); removed = gone.size; }
  return { turbines: [...kept, ...fresh].sort(byMad), stats: { added, updated, removed, kept: kept.length, conflicts: conflicts.length }, conflicts, absent, newSav };
}

// Export Excel : toutes les turbines, avec l'attribution (pour informer le responsable turbines) et l'Id technique qui permet de recoller le fichier au ré-import
// Export = le même fichier que celui du responsable turbines (Projet | Modèle | N° Série | Échéance | Livraison Sxx | Status | Retard), avec la MàD donnée ici dans la colonne « Livraison » ;
// on y ajoute l'ancienne date, un repère « modifiée », l'attribution, la roue, l'injecteur et l'Id technique qui permet de le ré-importer sans rien casser.
export const exportHead = todayIso => ["Projet", "Modèle", "N° Série", "Échéance", "Livraison S" + (dateOf(todayIso) ? isoWeek(dateOf(todayIso)).week : ""), "Status", "Retard (j)", "Ancienne date (fichier)", "Date modifiée ?", "Attribué à", "Roue", "Injecteur", "Id (ne pas modifier)"];
export const MODEL_LABEL = { "100LT": "100kW LT", "20LT": "20kW" };
export function turbineStatus(t, todayIso) {
  const late = lateDays(t);
  if (t.mad && t.mad <= todayIso) return "Livré";
  return late > 10 ? "Critique" : late > 0 ? "En retard" : "OK";
}
export function exportRows(turbines, todayIso) {
  const today = todayIso || isoOf(new Date());
  return [exportHead(today), ...[...(turbines || [])].sort(byMad).map(t => {
    const changed = !!(t.madSrc && t.madSrc !== t.mad);
    return [t.ref || "SANS-REF-" + String(t.id).slice(-4), t.model || MODEL_LABEL[t.type] || t.type, t.serial || "", t.need ? dateOf(t.need) : "NC", t.mad ? dateOf(t.mad) : "", turbineStatus(t, today), t.need ? lateDays(t) : "NC", changed ? dateOf(t.madSrc) : "", changed ? "Oui" : "", targetLabel(t) || "Libre", (t.wheel && t.wheel.name) || "", (t.injector && t.injector.name) || "", t.id];
  })];
}
// Après un export, les dates exportées deviennent la référence du prochain import
export const stampExport = turbines => (turbines || []).map(t => ({ ...t, madSrc: t.mad }));

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

// Communication au responsable turbines : une turbine « à communiquer » a une attribution / roue / injecteur différents de ce qui a été transmis la dernière fois
const EMPTY_SNAP = { target: "", wheel: "", injector: "" };
export const snapOf = t => ({ target: t.target ? (t.target.kind === "SAV" ? "SAV " : "") + (t.target.ref || "") : "", wheel: (t.wheel && t.wheel.name) || "", injector: (t.injector && t.injector.name) || "" });
const sameSnap = (a, b) => a.target === b.target && a.wheel === b.wheel && a.injector === b.injector;
export const pendingShare = turbines => (turbines || []).filter(t => !sameSnap(snapOf(t), t.shared || EMPTY_SNAP));
export const markShared = turbines => (turbines || []).map(t => ({ ...t, shared: snapOf(t) }));
export function shareMessage(turbines, todayIso) {
  const L = pendingShare(turbines).sort(byMad);
  if (!L.length) return "";
  const el = (w, i) => [w && "roue " + w, i && "injecteur " + i].filter(Boolean).join(" + ");
  return "Point attributions turbines du " + fmtFr(todayIso) + " :\n" + L.map(t => {
    const n = snapOf(t), o = t.shared || EMPTY_SNAP, nm = (t.ref || "turbine") + " (" + TYPE_LABEL[t.type] + (t.mad ? ", MàD " + weekLabel(t.mad) + " " + fmtFr(t.mad) : "") + ")";
    const parts = [n.target ? "attribuée à " + n.target : "remise en stock (libre)"];
    const e = el(n.wheel, n.injector); if (e) parts.push("avec " + e);
    const was = o.target ? "avant : " + o.target : "";
    return "• " + nm + " → " + parts.join(", ") + (was && o.target !== n.target ? " (" + was + ")" : "") + ".";
  }).join("\n") + "\nMerci de ne plus réutiliser ces turbines / roues / injecteurs pour autre chose.";
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

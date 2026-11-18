// v401 (demandé : « reprendre le passeport et toutes les étapes liées » — Tests → passeport, MES et SAV → passeport, dossier machine) :
// valeurs réelles du passeport venues de la fiche de tests et du SAV, recalculées à l'affichage (jamais recopiées).
// real[élément] = { v, phase, src, at, live: true, bad?, badT? } — bad = à traiter (rouge)
import { planOf, catalogOf, progressOf } from "./testPlan";
import { debugSections, debugProgress } from "./debugChecklist";
import { vibRows, vibProgress, speedProgress } from "./testFiche";
import { isClosed } from "./savModel";

const plural = (n, w) => n + " " + w + (n > 1 ? "s" : "");
// Fiche de tests : livret de configuration, checklist de debug, fréquences, vibrations, tests FAT
export function testsLive(testsDoc, pj) {
  if (!testsDoc || !pj) return {};
  const p = planOf(testsDoc, pj), out = {}, src = "Fiche de tests";
  const rows = (p.book && p.book.rows) || {}, vals = Object.values(rows), ok = vals.filter(x => x && x.s === "ok").length, pb = vals.filter(x => x && x.s === "pb").length;
  if (ok || pb) out.livret = { v: plural(ok, "étape") + " OK" + (pb ? " · " + plural(pb, "problème") : ""), phase: "tests", src: src + " · livret", live: true, bad: pb > 0, badT: plural(pb, "problème") + " au livret" };
  if (p.debug) {
    const d = debugProgress(p.debug, debugSections(testsDoc.debugModel));
    if (d.done) out.debugCk = { v: d.done + " / " + d.total + (d.nok ? " · " + d.nok + " NOK" : "") + (d.signed ? " · signée" : ""), phase: "tests", src: src + " · checklist de debug", live: true, bad: d.nok > 0, badT: d.nok + " NOK au debug" };
    const s = speedProgress(p.debug, testsDoc.vibModel);
    if (s.done) out.freqs = { v: s.done + " / " + s.total + " relevées" + (s.out ? " · " + s.out + " hors plage" : " · dans la plage"), phase: "tests", src: src + " · fréquences par vitesse", live: true, bad: s.out > 0, badT: s.out + " fréquence" + (s.out > 1 ? "s" : "") + " hors plage" };
    const vr = vibRows(testsDoc.vibModel), vp = vibProgress(p.debug, vr);
    if (vp.done) out.vibs = { v: vp.done + " / " + vp.total + " mesurées" + (vp.over ? " · " + vp.over + " au-dessus de la limite" : ""), phase: "tests", src: src + " · vibrations", live: true, bad: vp.over > 0, badT: "vibrations au-dessus de la limite" };
  }
  const q = progressOf(p, catalogOf(testsDoc), ["interne"]);
  if (q.done) out.fat = { v: q.ok + " / " + q.total + " réussis" + (q.ko ? " · " + q.ko + " en échec" : ""), phase: "tests", src: src + " · tests FAT", live: true, bad: q.ko > 0, badT: plural(q.ko, "test") + " en échec" };
  return out;
}

const SAV_DONE = ["Réalisée", "Validée"];
const fd = iso => (iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : "");
// SAV / MES : interventions réalisées du PJ (mise en service, dernière intervention, pièces changées → réel), tickets ouverts
export function savLive(savDoc, pj) {
  if (!savDoc || !pj) return {};
  const P = String(pj).trim(), base = P.replace(/-\d+[A-Z]*$/, ""), out = {};
  const mine = x => x && (String(x.pj || "").trim() === P || String(x.pj || "").trim() === base);
  const inters = Object.entries(savDoc.inters || {}).filter(([, i]) => mine(i) && SAV_DONE.includes(i.st) && i.a).map(([id, i]) => ({ id, ...i })).sort((a, b) => String(a.b || a.a).localeCompare(String(b.b || b.a)));
  const mes = inters.filter(i => i.type === "Mise en service").pop();
  if (mes) out.mesDate = { v: fd(mes.b || mes.a), phase: "mes", src: "SAV / MES · " + mes.id + (mes.resp ? " · " + mes.resp : ""), at: mes.b || mes.a, live: true };
  const last = inters[inters.length - 1];
  if (last) out.lastInter = { v: last.type + " · " + fd(last.b || last.a), phase: last.type === "Mise en service" ? "mes" : "sav", src: last.id + (last.resp ? " · " + last.resp : "") + (last.reussite && last.reussite !== "Succès" ? " · " + String(last.reussite).toLowerCase() : ""), at: last.b || last.a, live: true };
  // pièces changées (« Pièces changées (passeport) » de l'intervention) : la plus récente l'emporte
  inters.forEach(i => (Array.isArray(i.changes) ? i.changes : []).forEach(c => { if (c && c.el && String(c.v || "").trim()) out[c.el] = { v: String(c.v).trim(), phase: i.type === "Mise en service" ? "mes" : "sav", src: "SAV · " + i.id + " · " + fd(i.b || i.a) + (c.note ? " · " + c.note : ""), at: i.b || i.a, live: true, sav: true }; }));
  const open = Object.values(savDoc.tickets || {}).filter(t => mine(t) && !isClosed(t)).length;
  if (open) out.ticketsOpen = { v: plural(open, "ticket") + " ouvert" + (open > 1 ? "s" : ""), phase: "sav", src: "SAV / MES · tickets", live: true, bad: true, badT: plural(open, "ticket") + " SAV ouvert" + (open > 1 ? "s" : "") };
  return out;
}

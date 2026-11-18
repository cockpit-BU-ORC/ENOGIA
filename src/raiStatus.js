// v398 (demandé : « Oui, feu vert » — le RAI comme feu vert du départ) : état du RAI de chaque machine, partagé par la Liste, la fiche
// d'un PJ, l'accueil et le passage à « Expédiée ». App lit planning/machines et le dépose ici (setRaiDoc) ; les composants
// se redessinent avec useRai().
import { useSyncExternalStore } from "react";
import { raiVerdict } from "./rai";

let doc = null, ver = 0;
const subs = new Set();
export function setRaiDoc(d) { if (d === doc) return; doc = d; ver++; subs.forEach(f => f()); }
const subscribe = f => { subs.add(f); return () => subs.delete(f); };
export const useRai = () => useSyncExternalStore(subscribe, () => ver);

export const RAI_SOON = 14; // jours avant le départ à partir desquels un RAI non accepté est signalé
const isoToday = () => new Date().toISOString().slice(0, 10);
const days = (a, b) => Math.round((new Date(String(b).slice(0, 10) + "T12:00:00") - new Date(String(a).slice(0, 10) + "T12:00:00")) / 864e5);

// k : ok (accepté) · reserve (avec réserves) · no (en cours, non accepté) · none (pas commencé) ; null tant que le document n'est pas lu
export function raiGate(pj, depart, etat, today = isoToday(), d = doc) {
  if (!d || !pj) return null;
  const R = (d.rai || {})[pj] || null, v = raiVerdict(R);
  const started = !!(R && (Object.keys(R.rows || {}).length || (R.actions || []).length || Object.keys(R.signs || {}).length));
  const k = !started ? "none" : v.k;
  const left = depart ? days(today, depart) : null, shipped = etat === "SHIPPED";
  const due = !shipped && left != null && left <= RAI_SOON;
  const label = k === "ok" ? "RAI accepté" : k === "reserve" ? "RAI avec réserves" : k === "none" ? "RAI à faire" : "RAI non accepté";
  return { k, label, left, due, alert: due && (k === "none" || k === "no"), verdict: v };
}

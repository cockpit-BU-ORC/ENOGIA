// v159 — Où s'affiche la fiche d'un PJ : « panel » (volet à droite de la Liste, tiroir dans Gantt / Calendrier) ou « popup » (fenêtre centrale).
// Choix personnel, mémorisé sur le poste (localStorage) et partagé entre toutes les vues sans passer par App.
import { useSyncExternalStore } from "react";
const KEY = "enogia_detail_mode";
const read = () => { try { return window.localStorage.getItem(KEY) === "popup" ? "popup" : "panel"; } catch (e) { return "panel"; } };
let mode = read();
const subs = new Set();
export const getDetailMode = () => mode;
export function setDetailMode(m) {
  mode = m === "popup" ? "popup" : "panel";
  try { window.localStorage.setItem(KEY, mode); } catch (e) { /* stockage indisponible : le choix vaut pour cette session */ }
  subs.forEach(f => f());
}
const sub = f => { subs.add(f); return () => subs.delete(f); };
export const useDetailMode = () => [useSyncExternalStore(sub, getDetailMode, () => "panel"), setDetailMode];

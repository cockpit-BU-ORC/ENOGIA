import React, { useEffect, useState } from "react";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";

// v245 (demandé : « garder le même format mais avoir la vision globale même si les gens ont une mise à l'échelle Windows plus grande (150 %) ») :
// un site ne peut pas changer le zoom du navigateur, et un zoom forcé dans la page décale les menus et le glisser-déposer (essayé).
// On détecte donc la mise à l'échelle (devicePixelRatio) et on indique le zoom du navigateur qui redonne la vue à 100 % ;
// Chrome et Edge le retiennent pour ce site. Une fois le zoom fait, devicePixelRatio revient à 1 et le bandeau disparaît de lui-même.
const FULL_W = 1900; // largeur où toutes les colonnes de la Liste tiennent
const STEPS = [90, 80, 75, 67, 50]; // paliers de zoom de Chrome / Edge
export function zoomAdvice(w = window.innerWidth, dpr = window.devicePixelRatio || 1) {
  if (dpr < 1.2 || w >= FULL_W || w < 900) return null;
  const step = STEPS.find(s => w * 100 / s >= FULL_W - 40) || 50;
  return { scale: Math.round(dpr * 100), step, presses: STEPS.indexOf(step) + 1 };
}
const KEY = "enogia_zoomhint_off";

export function useZoomAdvice() {
  const [a, setA] = useState(() => zoomAdvice());
  useEffect(() => { const f = () => setA(zoomAdvice()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return a;
}

export const zoomTip = a => "Appuyez sur Ctrl et − (" + a.presses + " fois, zoom " + a.step + " %) pour tout voir ; le navigateur s'en souvient pour ce site. Ctrl et 0 pour revenir.";

export function ZoomHint() {
  const a = useZoomAdvice();
  const [off, setOff] = useState(() => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } });
  if (!a || off) return null;
  const close = () => { setOff(true); try { localStorage.setItem(KEY, "1"); } catch (e) { /* stockage indisponible */ } };
  return (<div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", margin: "0 0 12px", borderRadius: 10, border: "1px solid " + T.line, background: T.card, color: T.ink700, fontSize: FZ.sm, fontFamily: T.font }}>
    <NavIcon name="screen" size={18} />
    <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: T.ink900 }}>Windows agrandit l'affichage à {a.scale} %</b> : certaines colonnes sont masquées faute de place. {zoomTip(a)}</span>
    <button type="button" onClick={close} aria-label="Ne plus afficher ce conseil" style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, minHeight: 28, padding: "0 10px", fontSize: FZ.xs, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Compris</button>
  </div>);
}

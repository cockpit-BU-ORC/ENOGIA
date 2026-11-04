import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { TurbinesHub } from "./components/TurbinesHub";

// v272 : la page Besoins v2 s'affiche avec du stock, des plateaux remplis et vides, sans erreur
test("Besoins v2 : rendu avec stock, turbines attribuées, roues et injecteurs", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try { localStorage.setItem("enogia_turbines_tab", "orc"); } catch (e) { /* */ }
  const doc = { turbines: { a: { num: "100N1", step: "ok", roue: "R1", besoin: "pj:PJ1" }, b: { num: "100N2", step: "s1" }, c: { num: "100N3", step: "att" } },
    roues: { r1: { ref: "R1", qte: 2 } }, injecteurs: { i1: { ref: "MT11", qte: 3, ouvertures: 12, variantes: [{ bouches: 3, qte: 1 }] } },
    allocs: { x: { besoin: "pj:PJ1", slot: 0, kind: "inj", stockId: "i1", ref: "MT11", bouches: null } }, besoins: { s1: { label: "SAV411", cfg: "100", date: "2026-11-25" } } };
  const rows = [{ pj: "PJ1", gamme: "180LTV3", etat: "MONTAGE", arrivee: "2026-12-01" }];
  const el = document.createElement("div"); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(<TurbinesHub doc={doc} api={{ put: async () => true, del: async () => true }} rows={rows} canEdit owner />); });
  const t = el.textContent;
  expect(t).toContain("% des pièces attribuées"); expect(t).toContain("100N1"); expect(t).toContain("100N2"); expect(t).toContain("SAV411"); expect(t).toContain("testée sans roue");
  act(() => root.unmount());
});

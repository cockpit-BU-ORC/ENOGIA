import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { TurbinesHub } from "./components/TurbinesHub";

// v272 (mis à jour v299 : onglets ORC / SAV, cartes) : la page Besoins s'affiche avec du stock, des plateaux remplis et vides, sans erreur
test("Besoins v2 : rendu avec stock, turbines attribuées, roues et injecteurs", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try { localStorage.setItem("enogia_turbines_tab", "orc"); localStorage.removeItem("enogia_nd_kind"); } catch (e) { /* */ }
  const doc = { turbines: { a: { num: "100N1", step: "ok", roue: "R1", besoin: "pj:PJ1" }, b: { num: "100N2", step: "s1" }, c: { num: "100N3", step: "att" } },
    roues: { r1: { ref: "R1", qte: 2 } }, injecteurs: { i1: { ref: "MT11", qte: 3, ouvertures: 12, variantes: [{ bouches: 3, qte: 1 }] } },
    allocs: { x: { besoin: "pj:PJ1", slot: 0, kind: "inj", stockId: "i1", ref: "MT11", bouches: null } }, besoins: { s1: { label: "SAV411", cfg: "100", date: "2026-11-25" } } };
  const rows = [{ pj: "PJ1", gamme: "180LTV3", etat: "MONTAGE", arrivee: "2026-12-01" }];
  const el = document.createElement("div"); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(<TurbinesHub doc={doc} api={{ put: async () => true, del: async () => true }} rows={rows} canEdit owner />); });
  // v387 : cartes repliées par défaut (sauf retard) : on les déplie pour lire les turbines
  act(() => { el.querySelectorAll("button[aria-label^=\"Déplier \"]").forEach(b => b.click()); });
  const t = el.textContent;
  // v300 : une seule feuille ORC + SAV, bascule Production / Besoins, logements à 4 états, stock roues / injecteurs d'abord
  // v372 : une ligne de 36 px par turbine — l'état et le détail d'une pièce sont dans la bulle (title), « Marquer installée » dans le nom du bouton rond
  const tips = [...el.querySelectorAll("[title]")].map(x => x.getAttribute("title")).join(" | "), labels = [...el.querySelectorAll("[aria-label]")].map(x => x.getAttribute("aria-label")).join(" | ");
  expect(t).toContain("Besoins ORC et SAV"); expect(t).toContain("à attribuer"); expect(t).toContain("100N1"); expect(tips).toContain("Turbine allouée"); expect(tips).toContain("montée sur la turbine");
  expect(labels).toContain("Marquer installée"); expect(tips).toContain("disponible"); expect(t).toContain("100N2"); expect(t).toContain("testée sans roue"); expect(t).toContain("SAV411"); expect(t).toMatch(/\d+ \/ \d+ pièces/);
  expect(t.indexOf("Roues équilibrées")).toBeLessThan(t.indexOf("Injecteurs")); expect(t.indexOf("Turbines prêtes · avec roue")).toBeLessThan(t.indexOf("Turbines prêtes · sans roue")); expect(t.indexOf("Turbines prêtes · sans roue")).toBeLessThan(t.indexOf("Roues équilibrées")); expect(t).toContain("12 ouvertures"); // v320 : turbines prêtes en premier
  expect(el.querySelector("[aria-label^=\"Besoin n° 1\"]")).toBeTruthy(); // v301 : rang de besoin
  const orc = [...el.querySelectorAll("button")].find(x => /^ORC/.test(x.textContent.trim()));
  act(() => { orc.click(); });
  expect(el.textContent).not.toContain("SAV411");
  act(() => root.unmount());
});

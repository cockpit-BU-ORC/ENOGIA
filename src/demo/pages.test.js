// v321 (revue, point 7 « chaque vérification est refaite à la main ») : chaque page de la galerie ?demo est rendue, en clair puis en sombre,
// avec les données d'exemple : elle doit s'afficher sans erreur et montrer ses textes attendus. Lancer seul : npm run check:pages.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { setThemeMode } from "../theme";
import { MentionCtx } from "../mentionContext";
import { setPjMetaOverrides } from "../pjMeta";
import { DEMO_PAGES } from "./demoPages";
import { DEMO_META, DEMO_ME, DEMO_PEOPLE } from "./demoData";

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  setPjMetaOverrides(DEMO_META);
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  if (!global.ResizeObserver) global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!global.IntersectionObserver) global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  // jsdom n'a pas de canvas : mesure du texte simulée (Gantt, Calendrier)
  HTMLCanvasElement.prototype.getContext = () => ({ font: "", measureText: t => ({ width: String(t || "").length * 7 }) });
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});
afterAll(() => setPjMetaOverrides({}));

const ctx = { options: DEMO_PEOPLE, me: DEMO_ME.email, chefOf: () => ({ name: "", account: null }), react: () => {} };
describe.each([false, true])("pages en %s", dark => {
  test.each(DEMO_PAGES.map(p => [p.label, p]))("%s s'affiche", (_, P) => {
    setThemeMode(dark);
    const errors = []; const spy = jest.spyOn(console, "error").mockImplementation((...a) => { errors.push(a.map(String).join(" ")); });
    const el = document.createElement("div"); document.body.appendChild(el);
    const root = createRoot(el);
    act(() => { root.render(<MentionCtx.Provider value={ctx}><P.Render /></MentionCtx.Provider>); });
    const t = el.textContent;
    expect(t.length).toBeGreaterThan(20);
    P.expect.forEach(x => expect(t).toContain(x));
    act(() => root.unmount()); el.remove(); spy.mockRestore();
    // erreurs React (clés, props invalides, rendus cassés) ; les avertissements « act » de minuteries sont tolérés
    expect(errors.filter(e => !/not wrapped in act|act\(\.\.\.\)/.test(e))).toEqual([]);
  });
});

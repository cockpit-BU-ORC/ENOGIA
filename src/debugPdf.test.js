import { debugHtml } from "./debugPdf";

// v354 (revue de sécurité) : une fausse signature ne peut pas ajouter de script à la page du PDF
test("v354 : signature hors image PNG / JPEG ignorée, vraie signature gardée", () => {
  const evil = debugHtml({ pj: "PJ1", sign: { img: 'data:image/png;base64,x" onerror="alert(1)' }, debug: {} });
  expect(evil).not.toContain("onerror");
  const ok = debugHtml({ pj: "PJ1", sign: { img: "data:image/png;base64,iVBORw0KGgo=" }, debug: {} });
  expect(ok).toContain('<img src="data:image/png;base64,iVBORw0KGgo="');
});

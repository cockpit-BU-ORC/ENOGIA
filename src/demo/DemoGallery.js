// v321 (revue, point 7 « chaque vérification est refaite à la main ») : galerie permanente des pages avec des données d'exemple.
// Ouverte par http://localhost:3000/?demo (développement seulement : index.js ne la charge jamais dans le site en ligne) ;
// clair / sombre, téléphone (390) / tablette (768) / ordinateur (1440). Aucune lecture ni écriture Firestore : tout est fictif.
// Les mêmes pages sont rendues par src/demo/pages.test.js (npm run check:pages) à chaque série de tests.
import React, { Suspense, useState } from "react";
import { T, setThemeMode } from "../theme";
import { MentionCtx } from "../mentionContext";
import { setPjMetaOverrides } from "../pjMeta";
import { DEMO_PAGES } from "./demoPages";
import { DEMO_META, DEMO_ME, DEMO_PEOPLE } from "./demoData";

setPjMetaOverrides(DEMO_META);
const WIDTHS = [["phone", "Téléphone", 390], ["tablet", "Tablette", 768], ["desktop", "Ordinateur", 1440]];
const q = new URLSearchParams(window.location.search);

export default function DemoGallery() {
  const [page, setPage] = useState(q.get("page") || DEMO_PAGES[0].id);
  const [dark, setDark] = useState(q.get("dark") === "1");
  const [w, setW] = useState(q.get("w") || "desktop");
  setThemeMode(dark);
  try { document.documentElement.style.colorScheme = dark ? "dark" : "light"; } catch (e) { /* rien */ } // v358 : comme App (cases et listes natives)
  const [, force] = useState(0);
  const P = DEMO_PAGES.find(p => p.id === page) || DEMO_PAGES[0];
  const ctx = { options: DEMO_PEOPLE, me: DEMO_ME.email, chefOf: () => ({ name: "", account: null }), react: () => {} };
  const width = (WIDTHS.find(x => x[0] === w) || WIDTHS[2])[2];
  const btn = on => ({ minHeight: 28, padding: "0 10px", borderRadius: 8, border: "1px solid " + (on ? T.ink900 : T.line), background: on ? T.ink900 : T.card, color: on ? T.card : T.ink700, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font });
  return (<MentionCtx.Provider value={ctx}>
    <div data-demo-page={P.id} style={{ minHeight: "100vh", background: T.surface, color: T.ink900, fontFamily: T.font }}>
      <div role="toolbar" aria-label="Galerie de démonstration" style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 12px", background: T.card, borderBottom: "1px solid " + T.line }}>
        <b style={{ fontSize: 13, marginRight: 8 }}>Galerie ?demo</b>
        {DEMO_PAGES.map(p => <button key={p.id} type="button" aria-pressed={p.id === page} onClick={() => setPage(p.id)} style={btn(p.id === page)}>{p.label}</button>)}
        <span style={{ flex: 1 }} />
        {WIDTHS.map(([id, l]) => <button key={id} type="button" aria-pressed={w === id} onClick={() => setW(id)} style={btn(w === id)}>{l}</button>)}
        <button type="button" aria-pressed={dark} onClick={() => { setDark(d => !d); force(x => x + 1); }} style={btn(dark)}>{dark ? "Sombre" : "Clair"}</button>
      </div>
      {/* v382 : même barre du haut que le site (le titre des pages y monte, option B) */}
      <div style={{ width, maxWidth: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div role="banner" id="enogia-bar" className="enogia-bar" style={{ minHeight: 56, display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: T.surface, borderBottom: "3px solid var(--page-accent, transparent)", flexWrap: "wrap" }}>
          <span aria-hidden="true" style={{ width: 34, textAlign: "center", color: T.ink500, fontSize: 18 }}>☰</span>
          <div id="enogia-bar-title" style={{ display: "flex", alignItems: "center", gap: "6px 12px", flexWrap: "wrap", minWidth: 0, flex: "1 1 auto" }} />
          <div id="enogia-bar-tools" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} />
          <span className="enogia-bar-right" style={{ marginLeft: "auto", fontSize: 13, color: T.ink500 }}>⌕ · cloche · nom</span>
        </div>
      </div>
      <div style={{ width, maxWidth: "100%", margin: "0 auto", padding: "12px 16px 16px", boxSizing: "border-box", background: T.surface }}>
        <Suspense fallback={<div>Chargement…</div>}><P.Render key={P.id + dark} /></Suspense>
      </div>
    </div>
  </MentionCtx.Provider>);
}

// v227 — Kit « Production turbines » pour le Claude de Jérémie (directeur de production turbines).
// Fabrique un seul fichier React (artifact claude.ai) : le thème du site (theme.js recopié), de petits équivalents de PageHead /
// NavIcon, la page telle qu'elle est dans le site (entre les repères DÉBUT PAGE / FIN PAGE) et un aperçu avec données d'exemple.
// Jérémie ne modifie que ce qui est entre les repères ; son retour se réintègre avec scripts/prodturb-import.js.
// Usage : node scripts/prodturb-kit.js            → kit-jeremie/ProdTurbines-kit.jsx + Consignes-pour-Claude.md
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
// Empreinte de la page : le kit la garde, l’import vérifie que le site n’a pas changé entre-temps
const hashOf = body => crypto.createHash("sha1").update(body.replace(/\r\n/g, "\n").replace(/\s+$/, "")).digest("hex").slice(0, 12);

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "components", "ProdTurbines.js");
const THEME = path.join(ROOT, "src", "theme.js");
const OUT = path.join(ROOT, "kit-jeremie");
const START = "// ===== DÉBUT PAGE", END = "// ===== FIN PAGE =====";

function pageBody(src) {
  const i = src.indexOf(START), j = src.indexOf(END);
  if (i < 0 || j < i) throw new Error("Repères DÉBUT PAGE / FIN PAGE introuvables dans " + SRC);
  const from = src.indexOf("\n", i) + 1;
  return src.slice(from, j).replace(/\s+$/, "") + "\n";
}

// v262 : en-tête commun aux kits (Production turbines, Achats / Appro)
const SHARED = "/* ---------- Équivalents des composants communs du site (ne pas modifier) ---------- */\nfunction Hl({ children, color, style }) {\n  return <span style={{ textDecorationLine: \"underline\", textDecorationColor: color || T.accent, textDecorationThickness: \".3em\", textUnderlineOffset: \"-.08em\", textDecorationSkipInk: \"none\", ...style }}>{children}</span>;\n}\nfunction PageHead({ kicker, title, sub, right, style, accent }) {\n  return (<div style={{ display: \"flex\", alignItems: \"flex-end\", gap: 12, flexWrap: \"wrap\", marginBottom: 12, paddingBottom: 6, borderBottom: \"3px solid \" + T.teal500, ...style }}>\n    <div style={{ minWidth: 0, flex: 1, display: \"flex\", alignItems: \"baseline\", gap: \"4px 14px\", flexWrap: \"wrap\" }}>\n      {kicker && <span style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.accentInk }}>{kicker}</span>}\n      <h1 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: \"clamp(32px,3.6vw,44px)\", fontWeight: 600, letterSpacing: \"-.02em\", color: T.ink900, lineHeight: 1.1 }}><Hl color={accent}>{title}</Hl></h1>\n      {sub && <span style={{ fontSize: FZ.sm, color: T.ink500 }}>{sub}</span>}\n    </div>\n    {right}\n  </div>);\n}\nconst ICON_PATHS = { check: \"M5 12.5l4.5 4.5L19 7.5\", warning: \"M12 4l9 16H3L12 4zM12 10v4M12 17.5v.5\", close: \"M6 6l12 12M18 6L6 18\", arrow: \"M5 12h14M13 6l6 6-6 6\" };\nfunction NavIcon({ name, size = 18 }) {\n  const d = ICON_PATHS[name]; if (!d) return null;\n  return <svg width={size} height={size} viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\" aria-hidden=\"true\" style={{ flexShrink: 0, verticalAlign: \"-2px\" }}><path d={d} /></svg>;\n}\n\n";

function build() {
  const src = fs.readFileSync(SRC, "utf8");
  const body = pageBody(src);
  const theme = fs.readFileSync(THEME, "utf8").replace(/^export (const|function|let) /gm, "$1 ");
  const version = (fs.readFileSync(path.join(ROOT, "src", "App.js"), "utf8").match(/APP_BUILD_VERSION\s*=\s*"([^"]+)"/) || [])[1] || "";
  const kit = `// Kit « Production turbines » — ENOGIA, BU ORC (site ${version || "planning"})
// Fichier unique à ouvrir comme artifact React dans Claude. NE MODIFIER QUE ce qui est entre les repères
// « ===== DÉBUT PAGE » et « ===== FIN PAGE ===== » : le reste reproduit le site (thème, en-tête, icônes) pour l'aperçu.
// Base du kit : ${hashOf(body)} (ne pas modifier cette ligne)
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Thème du site (copie de src/theme.js — ne pas modifier) ---------- */
${theme}

${SHARED}${START} (à modifier) =====
${body}${END}

/* ---------- Aperçu du kit : données d'exemple, enregistrement en mémoire (ne pas modifier) ---------- */
const kd = k => { const x = new Date(); x.setDate(x.getDate() + k); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
const DEMO = {
  turbines: { t1: { num: "T-101", affaire: "PJ470", step: "c3", since: kd(-1), roue: "R-MT11", ordre: 1 }, t2: { num: "T-102", step: "c1", since: kd(0), ordre: 2 }, t3: { num: "T-099", step: "t2", since: kd(0), roue: "R-MT11", arbreId: "a0" }, t4: { num: "T-095", step: "ok", roue: "R-HT9" }, t5: { num: "T-097", step: "s1", since: kd(-5), arbreId: "a9" } },
  arbres: { a0: { num: "A-10", step: "b6" }, a9: { num: "A-09", step: "b6" }, a1: { num: "A-11", step: "b6", since: kd(-3) }, a2: { num: "A-12", step: "b2", since: kd(-2), ref: "ARB-MT" } },
  pieces: { p1: { statut: "appro", designation: "Liner", po: "PO-4521", fournisseur: "Meca Sud", dateLiv: kd(-2), turbine: "T-101", qte: 1 }, p2: { statut: "cq", designation: "Couvercle AR", cqEtat: "en cours", qte: 1 }, p3: { statut: "nc", designation: "Presse-étoupe", motif: "filetage abîmé", qte: 1 } },
  roues: { r1: { ref: "R-MT11", qte: 3 }, r2: { ref: "R-HT9", qte: 1 } },
  injecteurs: { i1: { ref: "INJ MT EDP", qte: 4, ouvertures: 11, variantes: [{ bouches: 2, qte: 1 }] } },
  params: { d: {}, l: {} }, access: [],
};
export default function KitPreview() {
  const [dark, setDark] = useState(false), [owner, setOwner] = useState(true), [doc, setDoc] = useState(DEMO);
  setThemeMode(dark, "marine");
  const api = {
    put: async (c, id, data) => { const d = { ...data }; delete d.id; setDoc(o => ({ ...o, [c]: { ...(o[c] || {}), [id]: d } })); return true; },
    del: async (c, id) => { setDoc(o => { const m = { ...(o[c] || {}) }; delete m[id]; return { ...o, [c]: m }; }); return true; },
    setParams: async p => { setDoc(o => ({ ...o, params: p })); return true; },
    setAccess: async list => { setDoc(o => ({ ...o, access: list })); return true; },
  };
  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font };
  return (<div style={{ minHeight: "100vh", background: T.surface, color: T.ink900, fontFamily: T.font, padding: 16, boxSizing: "border-box" }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, fontSize: 12, color: T.ink500 }}>
      <b style={{ color: T.ink700 }}>Aperçu du kit</b> · données d'exemple, rien n'est enregistré
      <span style={{ flex: 1 }} />
      <button type="button" style={tb} onClick={() => setDark(v => !v)}>{dark ? "Mode clair" : "Mode sombre"}</button>
      <button type="button" style={tb} onClick={() => setOwner(v => !v)}>{owner ? "Voir comme le directeur" : "Voir comme le propriétaire"}</button>
      <button type="button" style={tb} onClick={() => setDoc(DEMO)}>Réinitialiser les données</button>
    </div>
    <ProdTurbines key={dark ? "d" : "l"} doc={doc} api={api} canEdit owner={owner} pjs={["PJ479-1 - EDF PEI", "PJ481 - Exemple"]} />
  </div>);
}
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "ProdTurbines-kit.jsx"), kit);
  fs.copyFileSync(path.join(__dirname, "prodturb-consignes.md"), path.join(OUT, "Consignes-pour-Claude.md"));
  return { lines: kit.split("\n").length, out: OUT };
}

if (require.main === module) {
  const r = build();
  console.log("Kit écrit dans " + r.out + " (" + r.lines + " lignes) : ProdTurbines-kit.jsx + Consignes-pour-Claude.md");
}
module.exports = { build, pageBody, hashOf, START, END, SHARED };

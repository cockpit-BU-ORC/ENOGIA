// v262 — Kit « Achats / Appro » pour le Claude du responsable achats (même principe que le kit de Jérémie, scripts/prodturb-kit.js).
// Fabrique un seul fichier React (artifact claude.ai) : le thème du site (theme.js recopié), de petits équivalents de PageHead /
// NavIcon, la page telle qu'elle est dans le site (entre les repères DÉBUT PAGE / FIN PAGE) et un aperçu avec des données d'exemple
// fictives (aucune vraie donnée : le fichier sort de l'entreprise). Le retour se réintègre avec scripts/achats-import.js.
// Usage : npm run kit:achats   → kit-achats/Achats-kit.jsx + Consignes-pour-Claude.md + Marche-a-suivre.md
const fs = require("fs");
const path = require("path");
const { pageBody, hashOf, START, END, SHARED } = require("./prodturb-kit");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "components", "Achats.js");
const THEME = path.join(ROOT, "src", "theme.js");
const OUT = path.join(ROOT, "kit-achats");

function build() {
  const body = pageBody(fs.readFileSync(SRC, "utf8"));
  const theme = fs.readFileSync(THEME, "utf8").replace(/^export (const|function|let) /gm, "$1 ");
  const version = (fs.readFileSync(path.join(ROOT, "src", "App.js"), "utf8").match(/APP_BUILD_VERSION\s*=\s*"([^"]+)"/) || [])[1] || "";
  const kit = `// Kit « Achats / Appro » — ENOGIA, BU ORC (site ${version || "planning"})
// Fichier unique à ouvrir comme artifact React dans Claude. NE MODIFIER QUE ce qui est entre les repères
// « ===== DÉBUT PAGE » et « ===== FIN PAGE ===== » : le reste reproduit le site (thème, en-tête, icônes) pour l'aperçu.
// Base du kit : ${hashOf(body)} (ne pas modifier cette ligne)
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Thème du site (copie de src/theme.js — ne pas modifier) ---------- */
${theme}

${SHARED}${START} (à modifier) =====
${body}${END}

/* ---------- Aperçu du kit : données d'exemple fictives, enregistrement en mémoire (ne pas modifier) ---------- */
const kd = k => { const x = new Date(); x.setDate(x.getDate() + k); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
// Planning (lecture seule dans le site) : PJ fictifs
const DEMO_ROWS = [
  { pj: "PJ901", nomProjet: "Client A", gamme: "180LTV3", etat: "MONTAGE", arrivee: kd(-20), depart: kd(25) },
  { pj: "PJ902", nomProjet: "Client B", gamme: "100LTV3", etat: "En fabrication", arrivee: kd(12), depart: kd(60) },
  { pj: "PJ903-1", nomProjet: "Client C", gamme: "40LTV2R", etat: "NOT ORDERED", arrivee: kd(45), depart: kd(95) },
  { pj: "PJ903-2", nomProjet: "Client C", gamme: "40LTV2R", etat: "NOT ORDERED", arrivee: kd(55), depart: kd(105) },
];
const DEMO = {
  fournisseurs: { f1: { nom: "Fournisseur Échangeurs", contact: "M. Exemple", email: "contact@exemple.fr", tel: "04 00 00 00 00" }, f2: { nom: "Fournisseur Pompes" }, f3: { nom: "Fournisseur Électrique" } },
  composants: {
    c1: { ref: "EVAP-180", designation: "Évaporateur 180 kW", famille: "Échangeurs", fournisseurId: "f1", delaiJ: 70 },
    c2: { ref: "COND-180", designation: "Condenseur 180 kW", famille: "Échangeurs", fournisseurId: "f1", delaiJ: 70 },
    c3: { ref: "POMPE-ORC", designation: "Pompe fluide organique", famille: "Pompes", fournisseurId: "f2", delaiJ: 45 },
    c4: { ref: "ARM-ORC", designation: "Armoire électrique", famille: "Électrique / armoire", fournisseurId: "f3", delaiJ: 40 },
  },
  lignes: {
    l1: { pj: "PJ901", composantId: "c1", qte: 1, fournisseurId: "f1", po: "PO-0001", statut: "recu", dateRecue: kd(-25) },
    l2: { pj: "PJ901", composantId: "c3", qte: 1, fournisseurId: "f2", po: "PO-0002", statut: "confirme", datePrevue: kd(5) },
    l3: { pj: "PJ902", composantId: "c1", qte: 1, fournisseurId: "f1", po: "PO-0003", statut: "commande", datePrevue: kd(8) },
    l4: { pj: "PJ902", composantId: "c4", qte: 1, fournisseurId: "f3", statut: "besoin" },
    l5: { pj: "PJ903-1", composantId: "c2", qte: 1, statut: "consult" },
    l6: { pj: "PJ901", designation: "Capteur de pression", qte: 4, statut: "nc", note: "mauvaise plage de mesure" },
  },
  params: { marge: 10 }, access: [],
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
      <b style={{ color: T.ink700 }}>Aperçu du kit</b> · données d'exemple fictives, rien n'est enregistré
      <span style={{ flex: 1 }} />
      <button type="button" style={tb} onClick={() => setDark(v => !v)}>{dark ? "Mode clair" : "Mode sombre"}</button>
      <button type="button" style={tb} onClick={() => setOwner(v => !v)}>{owner ? "Voir comme le responsable achats" : "Voir comme le propriétaire"}</button>
      <button type="button" style={tb} onClick={() => setDoc(DEMO)}>Réinitialiser les données</button>
    </div>
    <Achats key={dark ? "d" : "l"} doc={doc} api={api} rows={DEMO_ROWS} canEdit owner={owner} />
  </div>);
}
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "Achats-kit.jsx"), kit);
  fs.copyFileSync(path.join(__dirname, "achats-consignes.md"), path.join(OUT, "Consignes-pour-Claude.md"));
  fs.copyFileSync(path.join(__dirname, "achats-marche-a-suivre.md"), path.join(OUT, "Marche-a-suivre.md"));
  return { lines: kit.split("\n").length, out: OUT };
}

if (require.main === module) {
  const r = build();
  console.log("Kit écrit dans " + r.out + " (" + r.lines + " lignes) : Achats-kit.jsx + Consignes-pour-Claude.md + Marche-a-suivre.md");
}
module.exports = { build };

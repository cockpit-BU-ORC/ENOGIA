// v262 — Kit « Achats / Appro » pour le Claude du responsable achats (même principe que le kit de Jérémie, scripts/prodturb-kit.js).
// Fabrique un seul fichier React (artifact claude.ai) : le thème du site (theme.js recopié), de petits équivalents de PageHead /
// NavIcon, la page telle qu'elle est dans le site (entre les repères DÉBUT PAGE / FIN PAGE) et un aperçu avec des données d'exemple
// fictives (aucune vraie donnée : le fichier sort de l'entreprise). Le retour se réintègre avec scripts/achats-import.js.
// Usage : npm run kit:achats   → kit-achats/Achats-kit.jsx + Consignes-pour-Claude.md + Marche-a-suivre.md
const fs = require("fs");
const path = require("path");
const { pageBody, hashOf, themeFor, START, END, SHARED } = require("./prodturb-kit");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "components", "Achats.js");
const THEME = path.join(ROOT, "src", "theme.js");
const OUT = path.join(ROOT, "kit-achats");

function build() {
  const body = pageBody(fs.readFileSync(SRC, "utf8"));
  const theme = themeFor(body, THEME);
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
  // v298 : données d'exemple au format actuel de la page (fiches machine, nomenclatures, PO saisies et venues d'Odoo)
  fournisseurs: { f1: { nom: "Fournisseur Échangeurs", ltJ: 60, ltTransportJ: 5 }, f2: { nom: "Fournisseur Pompes", ltJ: 40, ltTransportJ: 3 }, f3: { nom: "Fournisseur Électrique", ltJ: 30, ltTransportJ: 2 } },
  composants: {
    c1: { ref: "EVAP-180", designation: "Évaporateur 180 kW", type: "achat", famille: "SKID", fournisseurId: "f1", actif: true },
    c2: { ref: "POMPE-CYC", designation: "Pompe de cycle", type: "achat", famille: "POMPE CYCLE", fournisseurId: "f2", actif: true },
    c3: { ref: "ARM-ORC", designation: "Armoire électrique", type: "achat", famille: "ARMOIRE", fournisseurId: "f3", actif: true },
    c4: { ref: "CAPT-P", designation: "Capteur de pression", type: "achat", famille: "SKID", fournisseurId: "f3", delaiJ: 20, actif: true },
    o1: { ref: "ORC-180", designation: "Machine ORC 180 kW (exemple)", type: "orc", actif: true,
      enfants: [{ ref: "EVAP-180", qte: 1 }, { ref: "POMPE-CYC", qte: 1 }, { ref: "ARM-ORC", qte: 1 }, { ref: "CAPT-P", qte: 4 }],
      scopes: { SKID: { actif: true, decalJ: -10 }, ARMOIRE: { actif: true, decalJ: 0 }, "POMPE CYCLE": { actif: true, decalJ: -5 } } },
  },
  projets: {
    p1: { projet: "PJ901", machine: "PJ901", modele: "ORC-180", marge: 10, dateDebut: kd(-20), scopesDecal: { SKID: -10, ARMOIRE: 0, "POMPE CYCLE": -5 } },
    p2: { projet: "PJ902", machine: "PJ902", modele: "ORC-180", marge: 10, dateDebut: kd(40), scopesDecal: { SKID: -10, ARMOIRE: 0, "POMPE CYCLE": -5 } },
  },
  lignes: {
    l1: { projetId: "p1", ref: "EVAP-180", famille: "SKID", qte: 1, poId: "o5001" },
    l2: { projetId: "p1", ref: "POMPE-CYC", famille: "POMPE CYCLE", qte: 1, poId: "pPO-0002_1" },
    l3: { projetId: "p2", ref: "EVAP-180", famille: "SKID", qte: 1 },
    l4: { projetId: "p2", ref: "ARM-ORC", famille: "ARMOIRE", qte: 1 },
    l5: { projetId: "p2", ref: "CAPT-P", famille: "SKID", qte: 4 },
  },
  po: {
    o5001: { numero: "P00101", ligne: "1", ref: "EVAP-180", designation: "Évaporateur 180 kW", qte: 1, qteRecue: 1, dateCommande: kd(-90), dateLivraison: kd(-25), statut: "livre", projet: "PJ901", source: "odoo", odooId: 5001, annule: false, majOdoo: kd(-1) },
    o5002: { numero: "P00102", ligne: "1", ref: "EVAP-180", designation: "Évaporateur 180 kW", qte: 1, qteRecue: 0, dateCommande: kd(-3), dateLivraison: kd(50), statut: "envoyee", projet: "PJ902", source: "odoo", odooId: 5002, annule: false, majOdoo: kd(-1) },
    "pPO-0002_1": { numero: "PO-0002", ligne: "1", ref: "POMPE-CYC", designation: "Pompe de cycle", qte: 1, dateCommande: kd(-40), dateLivraison: kd(5), statut: "attente", projet: "PJ901", source: "" },
  },
  params: { marge: 10, odoo: { domaine: "exemple.odoo.com", base: "exemple", login: "compte@exemple.fr", protocole: "jsonrpc", champProjet: "x_projet", depuis: kd(-120), seulementFiches: true, auto: true } },
  // odooSync : écrit par le serveur dans le site ; ici l'aperçu le simule après « Synchroniser maintenant »
  odooSync: { etat: "ok", debut: new Date(Date.now() - 86400000).toISOString(), fin: new Date(Date.now() - 86399000).toISOString(), nb: 2, ajoutees: 0, maj: 1, annulees: 0, message: "2 commande(s) et 2 ligne(s) lues dans Odoo (exemple).", cle: true },
  access: [],
};
export default function KitPreview() {
  const [dark, setDark] = useState(false), [owner, setOwner] = useState(true), [doc, setDoc] = useState(DEMO);
  setThemeMode(dark, "marine");
  const api = {
    put: async (c, id, data) => { const d = { ...data }; delete d.id; setDoc(o => ({ ...o, [c]: { ...(o[c] || {}), [id]: d } })); return true; },
    del: async (c, id) => { setDoc(o => { const m = { ...(o[c] || {}) }; delete m[id]; return { ...o, [c]: m }; }); return true; },
    setParams: async p => { setDoc(o => ({ ...o, params: p }));
      // simulation du serveur Odoo (dans le site : fonction serveur) — répond 1,5 s après « Synchroniser maintenant »
      if (p.odooDemande) setTimeout(() => setDoc(o => (o.params.odooDemande !== p.odooDemande ? o : { ...o, odooSync: { ...(o.odooSync || {}), etat: "ok", debut: p.odooDemande, fin: new Date().toISOString(), nb: 2, ajoutees: 0, maj: 0, annulees: 0, message: "Simulation de l'aperçu : rien n'est lu dans Odoo.", cle: true } })), 1500);
      return true; },
    setAccess: async list => { setDoc(o => ({ ...o, access: list })); return true; },
  };
  const tb = { border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font };
  return (<div style={{ minHeight: "100vh", background: T.surface, color: T.ink900, fontFamily: T.font, padding: 16, boxSizing: "border-box" }}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12, fontSize: 12, color: T.ink500 }}>
      <b style={{ color: T.ink700 }}>Aperçu du kit</b> · données d'exemple fictives, rien n'est enregistré
      <span style={{ flex: 1 }} />
      <button type="button" style={tb} onClick={() => setDark(v => !v)}>{dark ? "Mode clair" : "Mode sombre"}</button>
      <button type="button" style={tb} onClick={() => setOwner(v => !v)}>{owner ? "Voir comme le responsable achats" : "Voir comme le propriétaire"}</button>
      <button type="button" style={tb} onClick={() => setDoc(DEMO)}>Réinitialiser les données</button>
    </div>
    <Achats key={dark ? "d" : "l"} doc={doc} api={api} rows={DEMO_ROWS} canEdit owner={owner} admin />
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

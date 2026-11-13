// v321 (revue, point 7 « chaque vérification est refaite à la main ») : données d'exemple de la galerie ?demo et des tests de pages.
// Entièrement fictives (PJ 9xx, clients et personnes inventés) : jamais de vraies données ici, le dépôt est public.
const day = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const row = (pj, gamme, etat, a, p, t, tf, fp, dep, drift = 0) => ({ pj, gamme, etat, arrivee: day(a), debutProd: day(p), tests: day(t), testsFin: day(tf), finProd: day(fp), depart: day(dep), drift, clientPresence: null });

export const DEMO_ROWS = [
  row("PJ901", "180LTV3", "MONTAGE", -20, -15, 10, 14, 18, 21, 4),
  row("PJ902", "180LTV3", "ELEC", -35, -30, 2, 6, 9, 12, 0),
  row("PJ903-1", "20LTV3", "TESTS", -50, -45, -3, 2, 4, 7, 11),
  row("PJ903-2", "20LTV3", "PACKAGING", -55, -50, -12, -8, -3, 2, 0),
  row("PJ904", "100MT", "NOT ORDERED", 30, 35, 70, 74, 80, 84, 0),
  row("PJ905", "180LTV3", "En fabrication", 12, 16, 45, 49, 55, 58, -3),
  row("PJ906", "40LTV3", "SHIPPED", -90, -85, -40, -36, -30, -25, 2),
  row("PJ907", "180LTV3", "STOCKAGE_EXT", 5, 9, 38, 41, 46, 50, 0),
];
export const DEMO_META = {
  PJ901: { nomProjet: "Papeterie du Nord", pays: "France", chefProjet: "Camille Durand" },
  PJ902: { nomProjet: "Verrerie Alpes", pays: "Italie", chefProjet: "Camille Durand" },
  "PJ903-1": { nomProjet: "Biogaz Ouest", pays: "France", chefProjet: "Lou Martin" },
  "PJ903-2": { nomProjet: "Biogaz Ouest", pays: "France", chefProjet: "Lou Martin" },
  PJ904: { nomProjet: "Cimenterie Sud", pays: "Espagne", chefProjet: "Lou Martin" },
  PJ905: { nomProjet: "Fonderie Est", pays: "Allemagne", chefProjet: "Camille Durand" },
  PJ906: { nomProjet: "Sucrerie Centre", pays: "France", chefProjet: "Sam Petit" },
  PJ907: { nomProjet: "Chimie Rhône", pays: "UK", chefProjet: "Sam Petit" },
};
export const DEMO_ME = { email: "camille.durand@exemple.fr", name: "Camille Durand" };
export const DEMO_PEOPLE = [DEMO_ME, { email: "lou.martin@exemple.fr", name: "Lou Martin" }, { email: "sam.petit@exemple.fr", name: "Sam Petit" }];
const at = (d, h) => day(d) + "T" + String(h).padStart(2, "0") + ":15:00.000Z";
export const DEMO_COMMENTS = {
  PJ901: [
    { author: "Lou Martin", text: "Châssis posé, câblage de l'armoire demain.", date: at(-2, 9), reactions: { "👍": ["sam.petit@exemple.fr"] } },
    { author: "Sam Petit", text: "@Camille on peut caler le NOBO lundi ?", date: at(0, 10), mentions: ["camille.durand@exemple.fr"] },
  ],
  "PJ903-1": [{ author: "Lou Martin", text: "Tests jour 3 : débit conforme.", date: at(-1, 15) }],
  PJ906: [{ author: "Sam Petit", text: "Machine livrée, réception signée.", date: at(-20, 11), private: true }],
};
export const DEMO_PROGRESS = { PJ901: 40, PJ902: 65, "PJ903-1": 85, "PJ903-2": 95, PJ906: 100 };
export const DEMO_TESTS = { testers: [{ id: "t1", name: "Lou Martin" }, { id: "t2", name: "Sam Petit" }], catalog: [],
  plans: { "PJ903-2": { assign: [{ tid: "t1" }], st: { interne: { i1: "ok", i2: "ko" } }, tres: { interne: { i2: { pb: "TT-31 lit 0 °C débranché", cause: "Câblage inversé" } } },
    asks: [{ id: "q1", label: "Affichage des pressions en psi sur l'IHM", hint: "Demande du client", by: "Camille Durand", at: "2026-10-28T09:00:00Z" }],
    book: { rows: { "prerequis": { v: true, s: "ok" }, "configuration-hardware/afe/md050n": { s: "pb", c: "Tension lue 380 V" } } },
    debug: { rows: { "s-vent": { r: "ok" } }, vib: { ta: "2,1" } } } },
  vibModel: { rows: [{ id: "ta", label: "Turbine A", freq: "500 Hz", limit: "4,5 mm/s" }, { id: "tb", label: "Turbine B (option)", freq: "500 Hz", limit: "4,5 mm/s" }] } };
// v337 : livret de démonstration (contenu fictif, sans image)
export const DEMO_BOOK = { title: "Manuel de configuration ORC", ref: "DEMO-001", images: {}, chapters: [
  { id: "prerequis", title: "Prérequis", steps: [{ id: "prerequis", title: "Prérequis", path: [], level: 1, blocks: [{ t: "p", text: "Avoir le PC de mise en service et les fichiers de paramètres de la gamme." }] }] },
  { id: "configuration-hardware", title: "Configuration hardware", steps: [
    { id: "configuration-hardware/afe/md050n", title: "MD050N", path: ["Configuration hardware", "AFE"], level: 3, blocks: [{ t: "p", text: "Régler la tension de travail." }, { t: "p", text: "Mettre 400 V.", list: true }] },
    { id: "configuration-hardware/afe/emotron", title: "Emotron", path: ["Configuration hardware", "AFE"], level: 3, blocks: [{ t: "table", rows: [{ c: ["Paramètre", "Valeur"] }, { c: ["P01", "50 Hz"] }] }] }] },
] };
export const DEMO_PROD = {
  turbines: { a: { num: "100N1", step: "ok", roue: "R1" }, b: { num: "100N2", step: "s1" }, c: { num: "100N3", step: "att" }, d: { num: "20N1", step: "ok", roue: "R7", gamme: "20" } },
  roues: { r1: { ref: "R1", qte: 2 }, r2: { ref: "R2", qte: 1 } },
  injecteurs: { i1: { ref: "MT11", qte: 3, ouvertures: 12, variantes: [{ bouches: 3, qte: 1 }] } },
  arbres: {}, pieces: {}, params: { d: {}, l: {} },
  besoins: { s1: { label: "SAV-12", cfg: "100", date: day(25) }, s0: { label: "SAV-07", cfg: "100", date: day(-20), done: true, doneAt: "2026-10-20T09:00:00Z", doneBy: "Lou Martin" } }, // v334 : un besoin clos
};
export const demoApi = { put: async () => true, del: async () => true, setParams: async () => true, setAccess: async () => true };

// v326 : SAV / MES (fictif)
const dd = n => day(n);
export const DEMO_SAV = {
  techs: ["Lou Martin", "Sam Petit", "Noa Roux", "Ezra Klein"],
  tickets: {
    "TC-26-41": { pj: "PJ906", type: "cur", prio: "h", step: 3, resp: "Lou Martin", orig: "Client", date: dd(-9), det: "Arrêts répétés sur alarme vibration turbine", inters: ["INT-084"] },
    "TC-26-42": { pj: "PJ903-2", type: "mes", prio: "h", step: 2, resp: "Sam Petit", orig: "BU ORC", date: dd(-7), det: "Pré-commissioning avant la mise en service", inters: [] },
    "TC-26-43": { pj: "PJ907", type: "dev", prio: "m", step: 4, resp: "Noa Roux", orig: "Client", date: dd(-16), det: "Devis remplacement échangeur cooling", inters: [] },
    "TC-26-38": { pj: "PJ906", type: "qtech", prio: "b", step: 3, resp: "Sam Petit", orig: "Client", date: dd(-40), closedAt: dd(-30), satisf: 5, det: "Paramétrage Modbus", inters: [] },
  },
  inters: {
    "INT-084": { tk: "TC-26-41", pj: "PJ906", obj: "Diagnostic vibrations et équilibrage turbine", type: "Maintenance curative", resp: "Lou Martin", who: ["Ezra Klein"], a: dd(1), b: dd(3), st: "Planifiée", prep: ["Planning d'intervention", "Ordre de mission"], clo: [], costs: { heberg: 300, repas: 180 } },
    "INT-085": { tk: "TC-26-42", pj: "PJ903-2", obj: "Pré-commissioning et essais à froid", type: "Préliminaire à la MES", resp: "", who: [], st: "À planifier", prep: [], clo: [], costs: {} },
  },
  parc: { PJ214: { nom: "Ancien site biomasse", pays: "Allemagne", gamme: "20LTV2", contrat: "Premium", contratNo: "MP214-001", contratStatut: "En cours", mes: "2022-10-20", application: "Biomasse", preventive: dd(60) } },
};
export const DEMO_SAV_DEM = { items: { d1: { pj: "PJ901", obj: "Réglage de la régulation avec le client", date: dd(7), days: 2, by: "Camille Durand", byEmail: "camille.durand@exemple.fr", at: new Date().toISOString(), st: "attente" } } };

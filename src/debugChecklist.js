// v264 (demandé : « dans l'onglet Tests, une checklist de debug — un système de cochage par ligne, pour chaque machine, au début des
// phases de tests ; le testeur la remplit puis la signe ; exportée sous le même format ») : contenu du modèle Word
// « PI105-047-XX0003-A-Check list debug » (Procédure mise en service · Checklist de Debug ORC · Version A), section par section.
// Une ligne = un contrôle : OK / NOK (S.O. pour les lignes « Option »), problème rencontré, causalité, correctif, temps correctif ;
// la consigne du contrôle est la colonne « Commentaires » du modèle. Données : planning/tests.plans[PJ].debug ; signature (image)
// dans planning/testsign_<PJ>, clé « debug ».
export const DEBUG_DOC = { title: "Procédure mise en service", subtitle: "Checklist de Debug ORC", version: "A", ref: "PI105-047-XX0003" };

const IHM_VANNE = "Dans l’IHM :\nCliquez sur open (ou close) : la vanne doit s’ouvrir ou se fermer (elle deviens verte en position ouverte)";
const TT = "Débranchement du capteur et vérifier qu’il affiche 850°c sur la supervision";
const PT = "Débranchement du capteur et vérification que le signal est à 0.";
const VT = "Utilisation d’un manche d’outil en caoutchouc pour créer une vibration artificielle. Le capteur enregistre bien l’augmentation du niveau de vibration qui passe à un peu plus de 2mm/s";
const VIT = "Apres avoir mis la lubrification, dans l’IHM :\nPasser en mode manuel et saisir une consigne (rpm)";
const MODBUS = "Dans l’IHM :\nVérifier que l’automate communique bien (Modbus)";
const it = (id, label, hint) => ({ id, label, hint, opt: /\(Option\)/.test(label) });

export const DEBUG_SECTIONS = [
  { id: "sorties", title: "Sorties", items: [
    it("s-vent", "Ventilateur circuit de cooling", "Dans l’IHM :\nActiver le ventilateur : L’air est extrait du radiateur"),
    it("s-pcool", "Pompe circuit de cooling", "Dans l’IHM :\nActiver la pompe cooling : Le flowswitch doit s’allumer."),
    it("s-plub", "Pompe de lubrification", "Dans l’IHM :\nActiver la pompe lubrification : PT-40 doit augmenter."),
    it("s-afe", "AFE Start", "Quand le mode manuel est à « ON » le signal AFE Run est actif en vert. Les ventilateurs de l’onduleur sont activés"),
    it("s-fcv11", "Vanne sectionneuse vers ORC FCV-11", IHM_VANNE),
    it("s-fcv12", "Vanne sectionneuse ver client FCV-12", IHM_VANNE),
    it("s-fcv01", "Electrovanne by-pass pompe cycle FCV-01", IHM_VANNE),
    it("s-var", "Signal variateur pompe cycle", "Dans l’IHM :\nActiver la pompe cycle (10 Hz) : Vérifier visuelement le sens de circulation"),
  ] },
  { id: "temp", title: "Entrée Température", items: ["TT-01", "TT-11", "TT-12", "TT-30", "TT-31", "TT-03A", "TT-03B (Option)", "TT-51A", "TT-51B (Option)", "TT-04", "TT-05 (Option)", "TT-22", "TT-70", "TT-21"].map(n => it("t-" + n.split(" ")[0].toLowerCase(), n, TT)) },
  { id: "ana", title: "Entrée analogique (4-20 mA)", items: [
    ...["PT-03", "PT-04", "PT-40A", "PT-05 (Option)"].map(n => it("a-" + n.split(" ")[0].toLowerCase(), n, PT)),
    it("a-fs", "Flow switch", "Mettre en route la pompe de cooling depuis l’IHM, vérifier que l’information est bien remontée, débrancher le flow switch."),
  ] },
  { id: "vib", title: "Signal de vibration", items: [it("v-61a", "VT-61A", VT), it("v-61b", "VT-61B (Option)", VT)] },
  { id: "ond", title: "Onduleur et driver", items: [it("o-va", "Vitesse turbine A", VIT), it("o-vb", "Vitesse turbine B (Option)", VIT)] },
  { id: "com", title: "Communication", items: [
    it("c-da", "Turbine modbus Drive A", MODBUS), it("c-db", "Turbine modbus Drive B (Option)", MODBUS),
    it("c-cpt", "Compteur d’énergie produite ORC", "Une fois la machine en fonctionnement, dans l’IHM :\nVérifier que le signe (+ pour la production ou - consommation) affiché est exact."),
    it("c-afe", "Onduleur (AFE - Emotron)", MODBUS),
    it("c-ifm", "Capteur de vibration IFM", "Dans l’IHM :\nVérifier que l’automate communique bien (Modbus)\nLa remontée de mesure est bien faite, tappotez avec le dos d’un tourne vis, la mesure varie bien."),
  ] },
];
export const DEBUG_ITEMS = DEBUG_SECTIONS.flatMap(s => s.items);
export const DEBUG_FIELDS = [["pb", "Problème rencontré"], ["cause", "Causalité"], ["fix", "Correctif"], ["temps", "Temps correctif"]];

// v280 (demandé : « une page pour importer une checklist, ajouter ou modifier des lignes ; impossible sur les PJ ») : le modèle de
// debug se règle seulement dans Tests › Checklists (admins) : planning/tests.debugModel.sections = [{ id, title, items: [{ id, label, hint, opt }] }]
// remplace le modèle Word d'origine. Ancien format V278 { removed, added } encore lu ; les réglages par machine (hide / extra) sont ignorés.
export function debugSections(model) {
  const m = model || {};
  if (Array.isArray(m.sections) && m.sections.length) return m.sections.map(s => ({ id: s.id, title: s.title || "Section", items: (s.items || []).filter(i => i && i.label).map(i => ({ id: i.id, label: i.label, hint: i.hint || "", opt: !!i.opt })) }));
  const removed = new Set(m.removed || []), add = m.added || [];
  return DEBUG_SECTIONS.map(s => ({ ...s, items: [...s.items.filter(i => !removed.has(i.id)), ...add.filter(x => x.section === s.id && !removed.has(x.id)).map(x => ({ id: x.id, label: x.label, hint: x.hint || "", opt: !!x.opt }))] }));
}
export const debugNewId = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
// État d'avancement : lignes renseignées (OK, NOK ou S.O.), NOK, signée ou non — sur les sections effectives
export function debugProgress(debug, sections = DEBUG_SECTIONS) {
  const rows = (debug && debug.rows) || {}, items = sections.flatMap(s => s.items);
  let done = 0, nok = 0;
  items.forEach(i => { const v = rows[i.id] && rows[i.id].r; if (v) done++; if (v === "nok") nok++; });
  return { done, total: items.length, nok, signed: !!(debug && debug.signed) };
}
// Change une ligne (copie) ; v = { r, pb, cause, fix, temps } partiel. Une case recliquée se décoche.
export function setDebugRow(debug, id, patch) {
  const d = { ...(debug || {}) }, rows = { ...(d.rows || {}) }, cur = { ...(rows[id] || {}) };
  Object.entries(patch).forEach(([k, v]) => { if (k === "r" && cur.r === v) delete cur.r; else if (v === "" || v == null) delete cur[k]; else cur[k] = v; });
  if (Object.keys(cur).length) rows[id] = cur; else delete rows[id];
  d.rows = rows; d.at = new Date().toISOString();
  return d;
}

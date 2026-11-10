// v262 — Réintègre dans le site la page Achats / Appro renvoyée par le responsable achats (kit modifié dans son Claude).
// Prend ce qui est entre « ===== DÉBUT PAGE » et « ===== FIN PAGE ===== » du fichier reçu et le remet à la même place dans
// src/components/Achats.js (les imports du site sont gardés). Vérifie avant d'écrire et dit ce qui a changé.
// Usage : npm run import:achats -- "C:\chemin\Achats-kit.jsx" [--dry] [--force]
const fs = require("fs");
const path = require("path");
const { pageBody, hashOf, START, END } = require("./prodturb-kit");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "components", "Achats.js");
const EXPORTS = ["EMPTY_ACHATS", "STATUTS", "lineState", "besoinOf"]; // utilisés par les tests du site (src/achats.test.js)
const COLLECTIONS = ["composants", "lignes", "fournisseurs", "projets", "po", "params", "access"]; // v298 : projets, po (V293)

function check(body, cur) {
  const errors = [], warns = [];
  if (/^\s*import\s/m.test(body)) errors.push("La partie renvoyée contient des « import » : les dépendances doivent rester celles du site (React, thème, PageHead, NavIcon).");
  if (!/export function Achats\s*\(/.test(body)) errors.push("Le composant « export function Achats(...) » est introuvable.");
  EXPORTS.forEach(n => { if (!new RegExp("export (const|function) " + n + "\\b").test(body)) errors.push("« " + n + " » doit rester exporté (utilisé par les tests du site)."); });
  if (/window\.claude|localStorage\.setItem\(\s*["'](?!enogia_achats_)/.test(body)) errors.push("La page enregistre ailleurs que par « api » (window.claude ou localStorage) : les données doivent passer par api.put / api.del / api.setParams / api.setAccess.");
  if (/fetch\(|XMLHttpRequest|https?:\/\//.test(body.replace(/\/\/[^\n]*/g, ""))) errors.push("La page appelle un site extérieur (fetch / adresse http) : refusé, tout passe par « api ».");
  if (/api\.put\(\s*["']odooSync/.test(body) || /odooSync\s*:/.test(body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))) errors.push("La page écrit « odooSync » : ce compte rendu est réservé au serveur de synchronisation Odoo.");
  ["api.put", "api.del"].forEach(n => { if (!body.includes(n)) warns.push("« " + n + " » n'est plus utilisé : vérifier l'enregistrement."); });
  const hex = s => new Set((s.match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) || []).map(x => x.toUpperCase()));
  const before = hex(cur), added = [...hex(body)].filter(x => !before.has(x));
  if (added.length) warns.push("Couleurs codées en dur ajoutées (à remplacer par les jetons du thème T) : " + added.join(", "));
  const used = new Set((body.match(/(?:api\.(?:put|del)|put|del)\(\s*["']([a-zA-Z]+)["']/g) || []).map(x => x.match(/["']([a-zA-Z]+)["']/)[1]));
  const extra = [...used].filter(c => !COLLECTIONS.includes(c));
  if (extra.length) warns.push("Nouvelles collections de données : " + extra.join(", ") + " (même document planning/achats : pas de règle Firestore à changer, mais à savoir).");
  return { errors, warns };
}

function run(file, dry) {
  if (!file || !fs.existsSync(file)) throw new Error("Fichier introuvable : " + file);
  const got = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (got.indexOf(START) < 0 || got.indexOf(END) < 0) throw new Error("Repères « " + START + " » / « " + END + " » absents du fichier reçu : demander le fichier complet.");
  const body = pageBody(got);
  const cur = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
  const i = cur.indexOf(START), j = cur.indexOf(END);
  const head = cur.slice(0, cur.indexOf("\n", i) + 1), oldBody = cur.slice(cur.indexOf("\n", i) + 1, j);
  const { errors, warns } = check(body, oldBody);
  const base = (got.match(/Base du kit : ([0-9a-f]{12})/) || [])[1];
  if (!base) warns.push("Kit sans empreinte : vérifier que les changements faits côté site depuis ne sont pas perdus.");
  else if (base !== hashOf(oldBody) && !process.argv.includes("--force")) errors.push("La page a changé dans le site depuis la fabrication de ce kit. Fusionner à la main avec la version actuelle, ou --force pour écraser la version du site.");
  if (errors.length) { console.error("Refusé :\n- " + errors.join("\n- ")); process.exitCode = 1; return; }
  const next = head + body + END + "\n";
  const a = oldBody.split("\n"), b = body.split("\n"); const sa = new Set(a), sb = new Set(b);
  console.log("Lignes : " + a.length + " → " + b.length + " (" + b.filter(x => !sa.has(x)).length + " ajoutées ou modifiées, " + a.filter(x => !sb.has(x)).length + " retirées ou modifiées)");
  warns.forEach(w => console.log("Attention : " + w));
  if (next.replace(/\s+$/, "") === cur.replace(/\s+$/, "")) { console.log("Aucun changement par rapport au site."); return; }
  if (dry) { console.log("(--dry : rien n'est écrit)"); return; }
  fs.writeFileSync(SRC, next);
  console.log("Écrit : " + path.relative(ROOT, SRC) + " — lancer ensuite le build, les tests et le contraste, puis npm run kit:achats pour lui renvoyer la nouvelle base.");
}

if (require.main === module) {
  try { run(process.argv[2], process.argv.includes("--dry")); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { run, check };

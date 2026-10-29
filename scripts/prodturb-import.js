// v227 — Réintègre dans le site la page Production turbines renvoyée par Jérémie (kit modifié dans son Claude).
// Prend ce qui est entre « ===== DÉBUT PAGE » et « ===== FIN PAGE ===== » du fichier reçu et le remet à la même place dans
// src/components/ProdTurbines.js (les imports du site sont gardés). Vérifie avant d'écrire et dit ce qui a changé.
// Usage : node scripts/prodturb-import.js "C:\chemin\ProdTurbines-kit.jsx" [--dry]
const fs = require("fs");
const path = require("path");
const { pageBody, START, END } = require("./prodturb-kit");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "components", "ProdTurbines.js");

function check(body, cur) {
  const errors = [], warns = [];
  if (/^\s*import\s/m.test(body)) errors.push("La partie renvoyée contient des « import » : les dépendances doivent rester celles du site (React, thème, PageHead, NavIcon).");
  if (!/export function ProdTurbines\s*\(/.test(body)) errors.push("Le composant « export function ProdTurbines(...) » est introuvable.");
  ["makeModel", "moveTurbine", "EMPTY_PROD", "T_STEPS", "A_STEPS"].forEach(n => { if (!new RegExp("export (const|function) " + n + "\\b").test(body)) errors.push("« " + n + " » doit rester exporté (utilisé par les tests du site)."); });
  if (/window\.claude|localStorage\.setItem\(['"]turbines-planning/.test(body)) errors.push("La page utilise le stockage de claude.ai : les données doivent passer par « api » (put, del, setParams, setAccess).");
  ["api.put", "api.del", "api.setParams"].forEach(n => { if (!body.includes(n)) warns.push("« " + n + " » n'est plus utilisé : vérifier l'enregistrement."); });
  const hex = s => new Set((s.match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) || []).map(x => x.toUpperCase()));
  const before = hex(cur), added = [...hex(body)].filter(x => !before.has(x));
  if (added.length) warns.push("Couleurs codées en dur ajoutées (à remplacer par les jetons du thème T) : " + added.join(", "));
  const coll = s => new Set((s.match(/["'](turbines|arbres|pieces|roues|injecteurs|params|access|[a-z]+s)["']\s*,\s*[a-z]+\.id/g) || []));
  if ([...coll(body)].some(x => !coll(cur).has(x))) warns.push("De nouvelles collections de données semblent utilisées : prévenir avant de déployer.");
  return { errors, warns };
}

function run(file, dry) {
  if (!file || !fs.existsSync(file)) throw new Error("Fichier introuvable : " + file);
  const got = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (got.indexOf(START) < 0 || got.indexOf(END) < 0) throw new Error("Repères « " + START + " » / « " + END + " » absents du fichier reçu : demander à Jérémie de renvoyer le fichier complet.");
  const body = pageBody(got);
  const cur = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
  const i = cur.indexOf(START), j = cur.indexOf(END);
  const head = cur.slice(0, cur.indexOf("\n", i) + 1), oldBody = cur.slice(cur.indexOf("\n", i) + 1, j);
  const { errors, warns } = check(body, oldBody);
  if (errors.length) { console.error("Refusé :\n- " + errors.join("\n- ")); process.exitCode = 1; return; }
  const next = head + body + END + "\n";
  const a = oldBody.split("\n"), b = body.split("\n"); const sa = new Set(a), sb = new Set(b);
  console.log("Lignes : " + a.length + " → " + b.length + " (" + b.filter(x => !sa.has(x)).length + " ajoutées ou modifiées, " + a.filter(x => !sb.has(x)).length + " retirées ou modifiées)");
  warns.forEach(w => console.log("Attention : " + w));
  if (next.replace(/\s+$/, "") === cur.replace(/\s+$/, "")) { console.log("Aucun changement par rapport au site."); return; }
  if (dry) { console.log("(--dry : rien n'est écrit)"); return; }
  fs.writeFileSync(SRC, next);
  console.log("Écrit : " + path.relative(ROOT, SRC));
}

if (require.main === module) {
  try { run(process.argv[2], process.argv.includes("--dry")); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { run, check };

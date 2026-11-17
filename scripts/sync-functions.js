// v374 : recopie dans functions/shared les modules du site dont la fonction serveur a besoin (fiche du lundi du Cash in),
// en modules ES (.mjs) que Node charge tels quels. Lancé avant chaque « firebase deploy » (firebase.json › predeploy) ;
// le test src/cashWeekly.test.js vérifie que les copies sont à jour.  Usage : node scripts/sync-functions.js [--check]
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), OUT = path.join(ROOT, "functions", "shared");
const FILES = ["cashinLink", "cashinModel", "cashWeekly"];
const HEAD = "// Copie générée par scripts/sync-functions.js depuis src/ — ne pas modifier ici.\n";
const lf = t => t.replace(/\r\n/g, "\n"); // Git peut convertir les fins de ligne sous Windows
const build = name => HEAD + lf(fs.readFileSync(path.join(ROOT, "src", name + ".js"), "utf8")).replace(/from "\.\/([A-Za-z]+)"/g, (m, f) => (FILES.includes(f) ? 'from "./' + f + '.mjs"' : m));
module.exports = { FILES, OUT, build, lf };
if (require.main === module) {
  const check = process.argv.includes("--check"); let stale = [];
  if (!check) fs.mkdirSync(OUT, { recursive: true });
  FILES.forEach(f => { const p = path.join(OUT, f + ".mjs"), s = build(f);
    if (check) { if (!fs.existsSync(p) || lf(fs.readFileSync(p, "utf8")) !== s) stale.push(f); } else fs.writeFileSync(p, s); });
  if (check && stale.length) { console.error("À recopier : " + stale.join(", ") + " (node scripts/sync-functions.js)"); process.exit(1); }
  console.log(check ? "functions/shared à jour" : "functions/shared : " + FILES.length + " modules recopiés");
}

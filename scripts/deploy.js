// Publication sur la branche gh-pages.
//   node scripts/deploy.js prod  → publie build/ à la racine du site SANS supprimer le dossier beta/
//   node scripts/deploy.js beta  → publie build/ uniquement dans le dossier beta/ (la production n'est pas touchée)
// (GITHUB_PAGES_REPO permet de viser un autre dépôt, utile pour tester en local.)
const ghpages = require("gh-pages");
const mode = process.argv[2] === "beta" ? "beta" : "prod";
const opts = mode === "beta"
  ? { dest: "beta", message: "Déploiement BÊTA" }
  : { remove: ["**/*", "!beta/**"], message: "Déploiement production" };
if (process.env.GITHUB_PAGES_REPO) opts.repo = process.env.GITHUB_PAGES_REPO;
ghpages.publish("build", opts, err => {
  if (err) { console.error(err); process.exit(1); }
  console.log(mode === "beta" ? "Bêta publiée (dossier /beta/)." : "Production publiée (le dossier /beta/ est conservé).");
});

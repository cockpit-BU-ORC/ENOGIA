// Build de la version BÊTA : même code, données Firestore séparées (préfixe beta_), publié dans /beta/.
// Aucune dépendance supplémentaire (fonctionne sous Windows, macOS et Linux).
const home = require("../package.json").homepage.replace(/\/$/, "");
const base = new URL(home).pathname.replace(/\/$/, "");
if (process.argv[2] === "beta") {
  process.env.REACT_APP_BETA = "1";
  process.env.PUBLIC_URL = base + "/beta";
}
require("react-scripts/scripts/build");

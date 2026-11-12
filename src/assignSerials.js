import { askConfirm } from "./confirm";

// v315 : attribue (fixe) les S/N prévus des machines arrivées — confirmation avec la liste ; une gamme sans code (conteneur…) reste à saisir.
// Fichier léger à part (v317) : importé par App.js, il ne doit pas tirer Series.js → ManagerParts.js → recharts dans le paquet de départ.
export async function assignSerialsFlow(list, save) {
  const ok = (list || []).filter(x => !x.missingCode), skip = (list || []).filter(x => x.missingCode);
  if (!ok.length) return 0;
  const yes = await askConfirm({ title: "Attribuer " + ok.length + " S/N ?", message: ok.map(x => x.pj + " → " + x.sn + " (arrivée le " + x.arrivee.split("-").reverse().join("/") + ")").join("\n") + (skip.length ? "\n\nÀ saisir à la main (gamme sans code) : " + skip.map(x => x.pj).join(", ") : "") + "\n\nUne fois attribués, ils ne bougent plus avec l'ordo.", confirmLabel: "Attribuer les S/N" });
  if (!yes) return 0;
  let n = 0; for (const x of ok) { if ((await save(x.pj, { numSerie: x.sn })) !== false) n++; }
  return n;
}

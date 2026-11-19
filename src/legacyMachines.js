// v413 (demandé : « des machines sont sorties avant l'ordo : les mettre dans le passeport, sans infos d'ordo ni de tests, d'après les machines du SAV ») :
// machines du parc SAV (planning/sav.parc, saisies dans SAV / MES › Parc) absentes du planning → lignes de passeport « avant l'ordo ».
// Rien n'est écrit dans le planning : ces lignes n'existent que dans le passeport (etat SHIPPED, legacy = true).
const baseOf = pj => String(pj || "").trim().toUpperCase().replace(/-\d+[A-Z]*$/, "");

export function legacyRows(data, parc) {
  const known = new Set((data || []).filter(r => r && r.pj).map(r => baseOf(r.pj)));
  return Object.entries(parc || {})
    .filter(([pj, p]) => p && /^PJ\w+/i.test(pj) && !known.has(baseOf(pj)))
    .map(([pj, p]) => ({
      pj, etat: "SHIPPED", legacy: true, gamme: p.gamme || "", nomProjet: p.nom || "", pays: p.pays || "", ville: p.ville || "",
      sn: (Array.isArray(p.sn) ? p.sn : String(p.sn || "").split(",")).map(s => String(s).trim()).filter(Boolean),
      contrat: p.contrat || "", contratNo: p.contratNo || "", contratStatut: p.contratStatut || "", mes: p.mes || "", application: p.application || "",
    }))
    .sort((a, b) => a.pj.localeCompare(b.pj, "fr", { numeric: true }));
}

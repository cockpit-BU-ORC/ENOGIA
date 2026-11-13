// v324 (audit Vercel « bundle-conditional ») : turbineNeeds.js et la page ProdTurbines (makeModel) ne sont plus dans le paquet de départ ;
// l'accueil, la fiche d'un PJ et App les chargent seulement quand il y a des données de production à calculer.
import { useEffect, useState } from "react";
let mod = null, pending = null;
export function loadProdModel() { if (!pending) pending = import("./turbineNeeds").then(m => { mod = m; return m; }); return pending; }
export function useProdModel(enabled) {
  const [, force] = useState(0);
  useEffect(() => { if (!enabled || mod) return undefined; let on = true; loadProdModel().then(() => { if (on) force(x => x + 1); }).catch(() => {}); return () => { on = false; }; }, [enabled]);
  return enabled ? mod : null;
}

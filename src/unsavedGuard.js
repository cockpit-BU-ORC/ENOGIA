// v340 (audit Web Interface Guidelines, lot 4) : alerte du navigateur avant de fermer ou recharger l'onglet
// tant qu'un brouillon n'est pas enregistré (Gestion des accès, Tests › Checklists, pénalités de la fiche contrat).
import { useEffect } from "react";

export function useUnsavedGuard(on) {
  useEffect(() => {
    if (!on) return undefined;
    const h = e => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [on]);
}

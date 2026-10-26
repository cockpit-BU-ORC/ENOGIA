// ── Rôles (v143) ──────────────────────────────────────────────────────────────────────────────
//  · Super admin : la ou les adresses de OWNER_EMAILS (App.js). Voit tous les onglets, peut TOUT supprimer
//    (commentaires, retards, causes, puces, jalons, composants, accès, périodes…) et changer le site (Réglages :
//    accès Manager, N° de série, production, vacances, planning initial, fiche projet).
//  · Admin (Manager) : adresse autorisée dans « Accès Manager » ou code PIN. Utilise le site : consulte, ajoute et
//    modifie (commentaires, avancement, statut, causes de retard…), mais ne supprime rien et n'a pas les Réglages.
//  · Les autres : lecture et commentaires, pas d'espace Manager.
// Ce module ne fait que porter le rôle courant (posé par App à chaque rendu) pour que n'importe quel composant puisse
// masquer une action sans repasser par les props. ATTENTION : c'est une protection d'interface ; pour qu'elle soit
// aussi garantie côté base, les règles Firestore doivent refuser les suppressions aux autres comptes.
export const ROLE = { superAdmin: false };
export function setSuperAdmin(v) { ROLE.superAdmin = !!v; }
export function isSuperAdmin() { return ROLE.superAdmin; }

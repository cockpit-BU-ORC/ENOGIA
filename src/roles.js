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
// v185 (demandé : « les admins ont les mêmes droits et accès que le super admin, sauf pour le Cash in pour le moment ») :
//  · isSuperAdmin() = droits d'administration complets → propriétaire OU admin (accès Manager) ;
//  · isOwner()      = propriétaire (OWNER_EMAILS) → seul à voir et gérer le Cash in.
export const ROLE = { superAdmin: false, owner: false };
export function setSuperAdmin(v) { ROLE.superAdmin = !!v; }
export function isSuperAdmin() { return ROLE.superAdmin; }
export function setOwner(v) { ROLE.owner = !!v; }
export function isOwner() { return ROLE.owner; }
// v210 (demandé : « les 2 chefs de projet, aussi admin, Clément et Myy, doivent pouvoir remplir et mettre à jour le Cash in ») :
// le Cash in est ouvert au propriétaire ET aux admins (accès Manager).
export function canCash() { return ROLE.owner || ROLE.superAdmin; }

# Sécurité de Cockpit ORC — mise en place des règles Firestore

Le fichier `firestore.rules` décrit qui peut lire et écrire chaque document de la base. Tant qu'il n'est pas publié dans la
console Firebase, il ne protège rien. Le publier est à faire **par Gabriel** (Claude ne publie pas).

## Ce que disent les règles
| Qui | Lecture | Écriture |
|---|---|---|
| Personne non connectée, ou compte hors @enogia.com | rien | rien |
| Tout compte @enogia.com | tout, sauf le Cash in | commentaires, tests, signatures, retards, états et fiches PJ (`overrides`, `pjMeta*`), comptes connus |
| Admins (liste `managerEmails`) | + copie réduite du Cash in | + planning publié, planning initial, journal, sauvegardes, types de retard, pool de turbines |
| Adresses « access » de Production turbines | — | + Production turbines |
| Propriétaire (gabriel.vincent@enogia.com) | tout | tout, dont rôles et cadrans (`profiles`), accès Manager, planificateur, Cash in |

Toute autre collection est refusée.

## Étapes (≈ 20 min)
1. **Sauvegarder les règles actuelles** : console Firebase › Firestore Database › onglet **Règles** › copier tout le texte dans un fichier `regles-avant.txt`. C'est le retour arrière.
2. **Tester avant de publier** : dans le même onglet, coller le contenu de `firestore.rules`, puis ouvrir **Terrain de jeu des règles** (Rules Playground) :
   - « get » sur `planning/current`, authentifié, e-mail `quelquun@enogia.com`, e-mail vérifié → **autorisé** ;
   - « get » sur `planning/current`, e-mail `x@gmail.com` → **refusé** ;
   - « get » sur `planning/cashin`, e-mail `quelquun@enogia.com` → **refusé** ;
   - « update » sur `planning/profiles`, e-mail `gabriel.vincent@enogia.com` → **autorisé** ; avec un autre @enogia.com → **refusé**.
3. **Publier** (bouton « Publier »).
4. **Vérifier sur la bêta puis la production** : se connecter, ouvrir l'accueil, la Liste, Tests, le Manager, Cash in, Production turbines ; écrire un commentaire. Demander à un testeur et à un admin de faire de même.
5. **En cas de souci** : un message « Missing or insufficient permissions » dans la console du navigateur (F12) indique le document bloqué. Recoller `regles-avant.txt` et publier pour revenir en arrière, puis envoyer le message à Claude.

## Autres réglages rapides (console, par Gabriel)
- **Authentication › Méthodes de connexion** : ne garder que Google.
- **Google Cloud › API et services › Identifiants** : restreindre la clé API du site aux référents `https://planning-enogia-bu-orc.github.io/*` et `http://localhost:3000/*`.
- **Double authentification** sur le compte Google propriétaire et sur GitHub.
- **Firestore › Reprise après sinistre / sauvegardes planifiées** : une sauvegarde quotidienne, gardée 7 jours.
- **Facturation › Budgets et alertes** : une alerte à un petit montant, pour repérer un abus.

# Synchronisation Odoo → Achats / Appro

Une Cloud Function Firebase lit les commandes d'achat dans Odoo, en lecture seule, et les écrit dans l'onglet **PO** de la page Achats / Appro.

Elle se lance à deux moments :
- **chaque nuit à 2 h**, si « Synchronisation automatique chaque nuit » est cochée dans la page ;
- **quand on clique sur « Synchroniser maintenant »** dans Achats / Appro › Réglages.

Elle traite les deux sites : `planning/achats` pour la production, `planning/beta_achats` pour la bêta.

La clé API Odoo est rangée dans le coffre de secrets de Google (Secret Manager). Elle n'est **jamais** dans la page, dans Firestore ni dans ce dépôt (qui est public).

Pour savoir ce que la fonction lit et écrit exactement, voir le contrat en tête de `src/components/Achats.js`.

---

## 1. Côté Odoo (avec l'administrateur Odoo)

1. Créer un **utilisateur technique**, par exemple `cockpit@enogia.com`, avec des droits de **lecture** sur les Achats (commandes, lignes de commande, articles).
2. Se connecter avec ce compte, puis aller dans **Préférences › Sécurité du compte › Nouvelle clé API**. Garder la clé de côté : elle ne s'affiche qu'une fois.
3. Noter les 4 informations suivantes :
   - le **domaine**, par exemple `enogia.odoo.com` ;
   - le nom de la **base de données** ;
   - l'**identifiant** du compte technique ;
   - la **version d'Odoo** : 14 à 18 → « JSON-RPC », 19 et plus → « API JSON-2 ».
4. Noter aussi le **nom technique du champ** qui porte le n° de projet, par exemple `x_studio_projet`. Pour le trouver : mode développeur, puis Paramètres › Technique › Champs, modèle `purchase.order.line` (ou `purchase.order`). La fonction cherche le champ sur les lignes, puis sur la commande.

## 2. Côté Firebase (une seule fois)

1. Ouvrir la [console Firebase](https://console.firebase.google.com), projet **enogia-planning**, puis passer au forfait **Blaze**. Il est obligatoire pour les Cloud Functions et Secret Manager.
   - À ce volume, le coût est normalement nul : une exécution par nuit et quelques clics.
   - Ajoutez une **alerte de budget** à 5 € dans Google Cloud › Facturation › Budgets.
2. Installer l'outil Firebase et se connecter :
   ```
   npm install -g firebase-tools
   firebase login
   ```
3. Installer les dépendances de la fonction :
   ```
   cd functions
   npm install
   ```
4. Ranger la clé API. La commande la demande : collez-la, elle ne s'affiche pas.
   ```
   firebase functions:secrets:set ODOO_API_KEY
   ```
5. Déployer la fonction. Il faut être dans le dossier du projet, pas dans `functions` :
   ```
   firebase deploy --only functions
   ```
   - Si le déploiement signale une **région** différente de celle de la base Firestore, changez `REGION` en tête de `functions/index.js` (`europe-west1` pour une base `eur3`), puis relancez.
   - Si Google demande d'**activer des API** (Cloud Functions, Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler, Secret Manager), acceptez.

## 3. Premier essai, sur la bêta

1. Ouvrir le site bêta, puis **Achats / Appro › Réglages › Connexion Odoo**.
2. Remplir le domaine, la base, l'identifiant, la version de l'API et le champ projet.
3. Mettre « Commandes depuis » à une date récente pour commencer, par exemple il y a 3 mois.
4. Cliquer sur **Enregistrer la connexion**, puis sur **Synchroniser maintenant**.
5. Après quelques secondes, le compte rendu apparaît sous les boutons :
   - « OK » avec le nombre de lignes ajoutées et mises à jour ;
   - ou le message d'erreur d'Odoo.
6. Vérifier l'onglet **PO**. Les lignes venues d'Odoo sont en lecture seule.
7. Si tout est bon, faire la même chose sur le site de production.

## Au quotidien

- **Voir ce qui s'est passé** : `firebase functions:log`, ou Google Cloud › Logging.
- **Changer la clé API** : relancer `firebase functions:secrets:set ODOO_API_KEY`, puis `firebase deploy --only functions`.
- **Arrêter la synchronisation de nuit** : décocher « Synchronisation automatique chaque nuit » dans la page.
- **Tests locaux** (ils n'appellent pas Odoo) : `cd functions && npm test`.

## Ce que la synchronisation ne fait jamais

- Elle n'écrit rien dans Odoo.
- Elle ne touche pas aux PO saisies à la main.
- Elle ne modifie pas l'affectation d'une PO à une ligne de nomenclature.
- Elle ne change rien aux commandes plus anciennes que « Commandes depuis ».
- Une commande annulée ou disparue d'Odoo est **marquée annulée** si elle est affectée à une ligne de nomenclature, sinon elle est retirée.

## Domaines Odoo autorisés (v354)

Par sécurité, la fonction n'envoie la clé API qu'à un domaine `*.odoo.com`. Si l'Odoo d'ENOGIA est sur un autre domaine (par exemple `erp.enogia.com`), créer le fichier `functions/.env` avec la ligne :

```
ODOO_ALLOWED_HOSTS=erp.enogia.com
```

puis redéployer les fonctions (`firebase deploy --only functions`). Plusieurs domaines : séparés par des virgules.

## Fiche du lundi du Cash in (v374)

Le site envoie lui-même la synthèse du Cash in, chaque lundi à 7 h (heure de Paris), par mail avec un PDF de 3 pages
(l'année, le mois en cours avec les retards, le mois qui arrive). L'artefact « Cash in PJ » n'est plus utilisé pour cet envoi.
Réglages dans le Cockpit : Cash in › Fiche du lundi (destinataires, envoi automatique, test, envoi immédiat, historique).

Fonctions : `cashWeeklyLundi` (lundi 7 h, production seulement, si « Envoi automatique » est coché),
`cashWeeklyDemandeProd` / `cashWeeklyDemandeBeta` (boutons « M'envoyer un test » et « Envoyer maintenant »).

### Une seule fois

1. **Compte d'envoi** : une adresse Google Workspace d'ENOGIA (par exemple une adresse dédiée au Cockpit) avec la validation en deux étapes activée.
   Dans ce compte : Gestion du compte Google › Sécurité › **Mots de passe des applications** › créer un mot de passe (16 caractères).
   Si l'option n'apparaît pas, l'administrateur Google Workspace doit l'autoriser pour ce compte.
2. **Secrets** (jamais dans le dépôt ni dans Firestore) :
   ```
   firebase functions:secrets:set MAIL_USER     (l'adresse d'envoi)
   firebase functions:secrets:set MAIL_PASS     (le mot de passe d'application, sans espaces)
   ```
3. **Dépendances** : `cd functions && npm install` (nodemailer, pdfkit, @resvg/resvg-js).
4. **Règles Firestore** : publier `firestore.rules` (document `cashinWeekly`, lu et écrit par la Finance « Admin » ou les admins).
5. **Déploiement** : `firebase deploy --only functions`. Avant chaque déploiement, `scripts/sync-functions.js` recopie
   `src/cashinLink.js`, `src/cashinModel.js` et `src/cashWeekly.js` dans `functions/shared` (mêmes calculs que l'aperçu du site).

### Premier essai

Sur la bêta : Cash in › Fiche du lundi › « M'envoyer un test ». Le mail arrive avec « [Test] [Bêta] » dans l'objet.
En cas d'erreur, le message s'affiche sous les boutons et dans « Derniers envois ».

---
name: Cockpit BU ORC
description: Tableau de bord interne d'ENOGIA qui suit les machines ORC, de la commande à l'expédition.
colors:
  ink-strong: "#101828"
  ink-body: "#344054"
  ink-muted: "#52607A"
  ink-faint: "#5B6880"
  hairline: "#DDE2EA"
  field-line: "#7E8796"
  page-cool: "#F3F5F8"
  surface-raised: "#E9EDF3"
  card-white: "#FFFFFF"
  slate-navy: "#1D2C4E"
  slate-navy-deep: "#121B30"
  slate-navy-wash: "#E8EAF0"
  instrument-teal: "#0A9DB5"
  instrument-teal-ink: "#076477"
  instrument-teal-wash: "#D3F0F6"
  highlighter-gold: "#F3C35B"
  stage-arrival: "#A8D5E2"
  stage-production: "#0D3B66"
  stage-tests: "#F4D35E"
  stage-endprod: "#548C2F"
  stage-departure: "#104911"
  risk-red: "#B8331A"
  risk-red-wash: "#FEE6DF"
  vigilance-amber: "#8A5700"
  vigilance-amber-wash: "#FDF0D5"
  conform-green: "#3B6620"
  conform-green-wash: "#E6F0DF"
  info-blue: "#2557B8"
  info-blue-wash: "#E6EEFC"
  graphite-page: "#111214"
  graphite-card: "#191A1D"
  graphite-raised: "#1F2125"
  graphite-hairline: "#2A2C31"
  graphite-ink: "#F2F3F5"
  graphite-gold: "#F4D35E"
typography:
  display:
    fontFamily: "'Cabinet Grotesk', 'Satoshi', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(32px, 3.6vw, 44px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Satoshi', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Satoshi', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Satoshi', -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.35
  figure:
    fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
  identifier:
    fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace"
    fontSize: "13px"
    fontWeight: 600
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  button-danger:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.risk-red}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  input-field:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
    height: "34px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  pj-plate:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.identifier}"
    rounded: "{rounded.xs}"
    padding: "3px 7px"
  status-pill:
    backgroundColor: "{colors.vigilance-amber-wash}"
    textColor: "{colors.vigilance-amber}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "20px"
---

# Design System: Cockpit BU ORC

## Overview

**Creative North Star: "Le tableau de bord d'atelier"**

Le Cockpit est l'outil de travail quotidien de la BU ORC : on y suit chaque machine de la commande au départ, au bureau comme au pied du banc d'essai, à la souris comme au doigt sur tablette. Tout y est **calme, exact, industriel** : chaque élément a une raison d'être, la donnée prime sur la décoration, et l'écran se lit d'un coup d'œil comme le tableau d'une machine en marche.

La structure est neutre (gris froid en clair, graphite en sombre) et dense par défaut ; la couleur est réservée à deux usages précis : **les étapes de production** (arrivée, production, tests, fin de production, départ, toujours les mêmes teintes partout) et **les signaux** (rouge = retard, ambre = vigilance, vert = conforme, bleu = information). L'identité vit dans les détails : la plaque du n° de PJ, le surligneur sous les titres, les chiffres tabulaires, le liseré de couleur en haut des cartes.

Rejets confirmés : pas de dégradé décoratif, pas de verre dépoli ni de flou, pas de néomorphisme, pas d'émoji en guise d'icône, pas de majuscules espacées, pas de graisse au-delà de 600.

**Key Characteristics:**
- Neutres froids, une seule couleur d'accent, couleurs d'étape et de signal fixes
- Trois familles de police : Cabinet Grotesk (titres, chiffres), Satoshi (texte), JetBrains Mono (identifiants)
- Rayons 4 · 8 · 12 et pilule, rien d'autre
- Plat par défaut, ombre seulement sur ce qui flotte
- Clair et sombre conçus ensemble, contrastes AA vérifiés
- Cibles de 44 px au doigt, densité compacte à la souris

## Colors

Une palette de bureau d'études : neutres froids pour la structure, teintes d'étape pour le planning, quatre couleurs de signal, un accent rare.

### Primary
- **Ardoise marine** (slate-navy, slate-navy-deep, slate-navy-wash) : couleur de marque issue du logo ENOGIA ; trait sous les titres de page, éléments sélectionnés, menu actif. En sombre, elle s'éclaircit (bleu acier) pour rester lisible.

### Secondary
- **Sarcelle instrument** (instrument-teal, instrument-teal-ink, instrument-teal-wash) : l'unique accent décoratif ; liens « Ouvrir … », anneau de focus, valeur mise en avant. Il est choisi hors des teintes de signal pour ne jamais être pris pour un statut. En sombre, l'accent devient **l'or** (graphite-gold).

### Tertiary
- **Surligneur or** (highlighter-gold) : trait épais sous le mot clé d'un titre (« Cockpit **BU ORC** », titres de page) et sous les chiffres de la phrase d'accueil. Identité du site, jamais un statut.

### Neutral
- **Encre forte** (ink-strong) : titres, chiffres, texte principal, bouton principal plein.
- **Encre de lecture** (ink-body) : texte courant des cellules et des fiches.
- **Encre discrète** (ink-muted, ink-faint) : étiquettes, sous-titres, en-têtes de tableau.
- **Filet** (hairline) : séparations de lignes et bords des cartes ; **filet de champ** (field-line) pour le bord des champs de saisie (≥ 3:1).
- **Papier froid** (page-cool), **surface relevée** (surface-raised), **carte blanche** (card-white) : les trois niveaux de fond en clair.
- **Graphite** (graphite-page, graphite-card, graphite-raised, graphite-hairline, graphite-ink) : les mêmes niveaux en sombre, neutres et non bleutés.

### Named Rules
**The Stage Color Rule.** Arrivée bleu clair, production marine, tests or, fin de production vert forêt, départ vert sapin : la même teinte pour la même étape dans la Liste, le Gantt, le Calendrier, les Tests et la fiche d'un PJ. Une nouvelle vue n'invente pas sa palette d'étapes.

**The Signal Rule.** Rouge = retard ou risque, ambre = vigilance, vert = conforme ou en avance, bleu = information. Ces couleurs ne servent qu'à ça, et elles s'accompagnent toujours d'un mot, d'une forme ou d'une hachure (un daltonien doit lire le même statut).

**The Token-Only Rule.** Aucune couleur écrite en dur dans un composant : tout passe par les jetons du thème, qui changent entre clair et sombre. Un style défini hors d'un composant lit le thème par accesseurs.

## Typography

**Display Font:** Cabinet Grotesk (repli Satoshi, police système)
**Body Font:** Satoshi (repli police système)
**Label/Mono Font:** JetBrains Mono pour les identifiants (n° de PJ, S/N, raccourcis)

**Character:** Un grotesque à caractère pour les titres et les grands chiffres, un sans-serif doux et lisible pour tout le reste ; le mono n'apparaît que là où un identifiant doit se lire caractère par caractère.

### Hierarchy
- **Display** (600, clamp 32–44 px, 1,1) : titre de page (`PageHead`), avec surligneur et phrase d'explication sur la même ligne.
- **Headline** (600, 20 px, 1,25) : titres de zone et de fenêtre.
- **Title** (600, 16 px, 1,3) : titres de carte et de bloc.
- **Body** (400, 14 px, 1,5) : texte courant ; 13 px dans les tableaux denses, jamais moins de 12 px.
- **Label** (600, 12 px) : étiquettes grises au-dessus des valeurs, en-têtes de tableau, en casse normale.
- **Figure** (500, 28–36 px, chiffres tabulaires) : chiffres clés ; le chiffre « réponse » de l'écran peut monter à 1,3 fois (46 px au plus).

### Named Rules
**The 600 Ceiling Rule.** Graisses 400, 500 et 600 seulement ; jamais 700 ou plus, y compris pour `<b>`.

**The Sentence Case Rule.** Casse normale partout : pas de majuscules espacées sur les étiquettes, pas de point final sur un libellé, un bouton ou un message d'une phrase.

**The Tabular Figures Rule.** Tout nombre qui se compare (tableaux, chiffres clés, dates, compteurs) est en chiffres tabulaires et aligné à droite dans une colonne.

## Layout

Application en pleine largeur : menu latéral masqué qui s'ouvre au bord gauche (ou épinglé à 216 px), barre du haut, puis la page dans `<main>`. Chaque page commence par le même en-tête (titre surligné, phrase, actions à droite, trait de 3 px), puis un sélecteur segmenté de sous-pages.

Les cadrans de l'accueil se placent sur une grille de 12 colonnes ; les fiches utilisent des grilles fixes à deux colonnes (ce qu'on écrit à gauche, le contexte à droite) qui ne changent pas de place quand un bloc grandit. Les tableaux remplissent la largeur ; en-tête collé en haut, lignes de 36 px au moins.

Espacements sur une grille de 4 px (4, 8, 12, 16, 20, 24). Densité **automatique** : compacte à la souris, confortable au doigt (boutons, champs et onglets à 44 px, champs en 16 px). Sous 900 px, les grilles s'empilent ; la tablette est surtout utilisée en paysage.

## Elevation & Depth

Le système est **plat par défaut**. La profondeur vient des tons (papier froid → surface relevée → carte blanche ; graphite en sombre) et des filets d'1 px, pas des ombres. Seul ce qui flotte au-dessus de la page porte une ombre : menus, bulles, fenêtres, tiroirs. En sombre, le relief vient d'un filet clair, pas d'ombres noires. Les fenêtres posent un voile sombre derrière elles, sans flou.

### Shadow Vocabulary
- **Plat** (`0 0 0 1px rgba(16,24,34,.07)`) : simple filet des boutons, champs et pastilles.
- **Carte** (`0 0 0 1px rgba(16,24,34,.06), 0 1px 2px rgba(16,24,34,.05), 0 6px 16px -8px rgba(16,24,34,.12)`) : réservé aux éléments qui doivent se détacher d'un fond identique.
- **Flottant** (`0 16px 40px rgba(10,20,32,.14), 0 2px 8px rgba(10,20,32,.06)`) : menus, fenêtres, tiroirs.

### Named Rules
**The Flat-By-Default Rule.** Une surface au repos est plate. Une bordure ou une ombre, jamais les deux ; l'ombre est réservée à ce qui flotte.

## Shapes

Trois rayons et une pilule : **4 px** pour les petites plaques, barres et cases ; **8 px** pour les contrôles (boutons, champs, menus) ; **12 px** pour les cadres (cartes, cadrans, fenêtres) ; **pilule** pour les pastilles de statut et les sélecteurs segmentés. Les colonnes de graphiques ont des angles nets. Un liseré coloré de 4 px en haut d'une carte donne son thème (tests, départs, alertes) ; la plaque du n° de PJ porte un liseré de 3 px à gauche, couleur de l'état de la machine.

## Components

### Buttons
Sobres et nets : l'action se lit, le bouton ne crie pas.
- **Shape:** contrôle arrondi (8 px), 34 px de haut (28 px en petit), 44 px au doigt.
- **Primary:** encre pleine (ink-strong) et texte blanc ; **un seul par écran**.
- **Secondary:** carte blanche, filet, texte fort ; c'est le bouton par défaut.
- **Ghost / Danger:** transparent pour les actions secondaires ; texte rouge sur fond blanc pour supprimer, toujours précédé d'une confirmation qui nomme l'action.
- **Hover / Focus:** fond un peu plus soutenu au survol, enfoncement à 0,97 à l'appui, anneau de focus de 2 px en sarcelle (or en sombre) au clavier seulement.

### Chips
- **Style:** puce à cocher en pilule, filet au repos, fond teinté et coche quand elle est active (`aria-pressed`).
- **State:** filtres simples en sélecteur segmenté, filtres multiples en puces avec leur nombre.

### Cards / Containers
- **Corner Style:** 12 px.
- **Background:** carte blanche sur papier froid (graphite-card sur graphite-page en sombre).
- **Shadow Strategy:** plat (voir Elevation & Depth).
- **Border:** filet d'1 px, ou liseré de 4 px en haut pour les cadrans thématiques.
- **Internal Padding:** 12 à 16 px.

### Inputs / Fields
- **Style:** fond carte, bord field-line (≥ 3:1), 8 px de rayon, libellé visible au-dessus ou nom accessible à la source.
- **Focus:** anneau de 2 px en sarcelle (or en sombre).
- **Error / Disabled:** message sous le champ, en rouge, qui dit la cause ; désactivé en gris, jamais en lecture seule déguisée.

### Navigation
- **Style:** menu latéral masqué (ouvert au bord gauche, au bouton ☰ ou Ctrl + B), rubriques Opérations · Gestion · Administration, repère sur la page active (or en sombre) ; sous-pages dépliées sous l'entrée active ; sélecteur segmenté pour les vues d'une page (touches 1 2 3).

### Plaque de PJ (signature)
Le n° de PJ est une plaque signalétique : police d'identifiant, fond relevé, filet, rayon 4 px, liseré gauche couleur de l'état. Elle identifie une machine partout où elle apparaît et ouvre sa fiche.

### Pastille d'état
Teinte pâle de l'état et texte foncé de la même teinte, contour à l'encre de l'état (≥ 3:1), point de couleur et libellé : jamais la couleur seule.

## Do's and Don'ts

### Do:
- **Do** prendre toute couleur dans les jetons du thème et vérifier le contraste en clair et en sombre (`npm run check:contrast`, 0 échec).
- **Do** garder les teintes d'étape (arrivée #A8D5E2, production #0D3B66, tests #F4D35E, fin de production #548C2F, départ #104911) identiques dans toutes les vues.
- **Do** doubler chaque statut coloré d'un mot, d'une forme ou d'une hachure.
- **Do** utiliser les briques communes : bouton `btn()` / `Btn`, `Pill`, `Chip`, `Segmented`, `Panel`, `tableTh` / `tableTd`, `PageHead`, `askConfirm`.
- **Do** donner 44 px aux cibles au doigt et `touch-action: none` aux éléments à glisser.
- **Do** garder le liseré des cartes, les lignes alternées du planning des bancs, les camemberts des répartitions et le « Bonsoir Prénom » de l'accueil : choix validés.

### Don't:
- **Don't** utiliser de graisse 700 ou plus, de majuscules espacées, ni de point final sur un libellé.
- **Don't** utiliser de dégradé décoratif, de verre dépoli, de flou derrière les fenêtres, ni d'ombre sur une surface au repos.
- **Don't** utiliser d'autres rayons que 4, 8, 12 et la pilule.
- **Don't** écrire « #fff » sur un aplat : le texte sur un aplat prend `onFill` ou `inkOn(fond)`.
- **Don't** utiliser d'émoji comme icône : une seule famille d'icônes, au trait, de la couleur du texte.
- **Don't** définir un composant à l'intérieur d'un autre composant.

---
name: ElecTracker
description: Suivi d'électricité prépayée — interface utilitaire, chaude et lisible
colors:
  bg: "oklch(0.13 0.014 68)"
  surface: "oklch(0.17 0.017 68)"
  surface-raised: "oklch(0.21 0.02 68)"
  border: "oklch(0.28 0.018 68)"
  border-subtle: "oklch(0.24 0.015 68)"
  text: "oklch(0.91 0.012 68)"
  muted: "oklch(0.58 0.022 68)"
  label: "oklch(0.72 0.018 68)"
  accent: "oklch(0.78 0.13 72)"
  accent-fg: "oklch(0.16 0.02 72)"
  accent-muted: "oklch(0.78 0.13 72 / 0.12)"
  accent-border: "oklch(0.78 0.13 72 / 0.35)"
  green: "oklch(0.72 0.14 155)"
  amber: "oklch(0.78 0.13 72)"
  red: "oklch(0.68 0.17 25)"
  focus-ring: "oklch(0.78 0.13 72 / 0.25)"
typography:
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "'Space Mono', ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  nav-link-active:
    textColor: "{colors.text}"
    typography: "{typography.label}"
---

# Design System: ElecTracker

## 1. Overview

**Creative North Star: "The Prepaid Ledger"**

ElecTracker est un outil domestique de suivi de crédit électrique prépayé. L'interface doit disparaître derrière la tâche : lire un solde, comprendre une consommation, savoir quand recharger. Le design est chaleureux mais sobre, pensé pour une consultation le soir sur téléphone ou ordinateur, dans une pièce peu éclairée.

La densité est modérée : assez d'information pour décider, sans surcharge visuelle. La profondeur vient du contraste tonal entre `--bg`, `--surface` et `--surface-raised`, pas d'effets décoratifs. L'accent ambre signale l'énergie et les actions primaires ; il reste rare sur chaque écran.

Le système rejette explicitement l'esthétique « dashboard SaaS IA » : pas de glassmorphism, pas de dégradés décoratifs, pas de cartes flottantes avec hover dramatique, pas d'emojis comme icônes, pas de labels en majuscules espacées.

**Key Characteristics:**

- Registre *product* : familiarité gagnée, pas surprise décorative
- Palette *Restrained* : neutres chauds teintés + accent ambre ≤10% par écran
- Typographie UI unique (DM Sans) + mono tabulaire pour les chiffres (Space Mono)
- Coins modérés (8–10px), bordures 1px, ombres discrètes
- Motion limitée aux changements d'état (150–250 ms, ease-out)

## 2. Colors

Palette chaude orientée électricité domestique : fond sombre teinté olive-ambre, surfaces légèrement plus claires, accent ambre pour l'action.

### Primary

- **Warm Meter Amber** (oklch(0.78 0.13 72)): accent principal. Boutons primaires, onglet actif, focus ring, badge « PRÉPAYÉ », jauge de crédit en bon état. Rare et intentionnel.
- **Amber Foreground** (oklch(0.16 0.02 72)): texte sur fond accent (boutons primaires, logo icon).

### Neutral

- **Night Kitchen** (oklch(0.13 0.014 68)): fond de page (`--bg`).
- **Meter Surface** (oklch(0.17 0.017 68)): cartes, header, tableaux (`--surface`).
- **Raised Panel** (oklch(0.21 0.02 68)): hover de lignes, champs, états surélevés (`--surface-raised`).
- **Warm Divider** (oklch(0.28 0.018 68)): bordures de conteneurs (`--border`).
- **Soft Divider** (oklch(0.24 0.015 68)): séparateurs internes, pistes de progression (`--border-subtle`).
- **Reading Light** (oklch(0.91 0.012 68)): texte principal (`--text`).
- **Dim Label** (oklch(0.58 0.022 68)): texte secondaire, sous-titres (`--muted`).
- **Section Label** (oklch(0.72 0.018 68)): titres de graphiques, labels de section (`--label`).

### Semantic

- **Credit Healthy** (oklch(0.72 0.14 155)): crédit confortable, budget OK (`--green`).
- **Credit Warning** (oklch(0.78 0.13 72)): crédit bas, alertes info (`--amber`).
- **Credit Critical** (oklch(0.68 0.17 25)): crédit critique, dépassement budget (`--red`).

### Named Rules

**The One Accent Rule.** L'ambre est réservé aux actions primaires, à la sélection courante et aux indicateurs d'état. Il ne sert jamais de couleur de fond décorative sur de larges surfaces.

**The Tinted Neutral Rule.** Aucun noir pur ni blanc pur. Tous les neutres portent une teinte chaude (hue ~68) avec chroma faible (0.005–0.02).

## 3. Typography

**Body Font:** DM Sans (system-ui fallback)
**Label/Mono Font:** Space Mono (ui-monospace fallback)

**Character:** DM Sans assure une lisibilité UI calme et moderne. Space Mono est strictement réservé aux valeurs numériques (kWh, Ar, dates tabulaires) pour un alignement fiable dans tableaux et cartes stats.

### Hierarchy

- **Title** (600, 1.125rem, 1.3): titres de page (« Historique des relevés »).
- **Body** (400, 15px, 1.5): texte courant, bannières, descriptions. Longueur max ~65–75ch pour le prose.
- **Label** (600, 0.75rem): labels de stats, titres de graphiques. Casse normale, pas de uppercase espacé.
- **Mono stat** (700, 1.25–2.5rem selon contexte): chiffres clés (crédit restant, stats dashboard). `font-variant-numeric: tabular-nums`.

### Named Rules

**The Numbers-Only Mono Rule.** Space Mono n'apparaît jamais sur labels, boutons ou navigation. Uniquement données chiffrées.

**The Flat Scale Rule.** Échelle typographique fixe en rem (ratio ~1.125–1.2). Pas de clamp fluide sur les titres UI.

## 4. Elevation

Profondeur par layering tonal, pas par ombres dramatiques. Les surfaces reposent sur `--bg` → `--surface` → `--surface-raised`. Les ombres sont discrètes et réservées aux éléments flottants (menus, modales).

### Shadow Vocabulary

- **Ambient sm** (`0 1px 2px oklch(0 0 0 / 0.2)`): tableaux, conteneurs au repos.
- **Ambient md** (`0 4px 12px oklch(0 0 0 / 0.25)`): réservé si besoin futur.
- **Ambient lg** (`0 8px 24px oklch(0 0 0 / 0.3)`): menus déroulants, modales.

### Named Rules

**The Flat-By-Default Rule.** Cartes et blocs stats n'ont pas d'ombre au repos. Une bordure 1px `--border` suffit.

**The No-Lift Rule.** Interdit : `transform: translateY()` au hover sur boutons ou cartes. Le feedback est couleur/bordure uniquement.

## 5. Components

### Buttons

- **Shape:** coins légèrement arrondis (8px / `--radius`).
- **Primary:** fond `--accent`, texte `--accent-fg`, padding 8px 16px, font-weight 600, 0.875rem.
- **Hover / Focus:** `filter: brightness(1.06)` sur primary ; secondary passe à `--surface-raised`. Focus visible : outline 2px `--accent`, offset 2px.
- **Secondary:** transparent, bordure `--border`, texte `--text`.
- **Icon:** padding 0.5rem, bordure `--border` ou transparente en header desktop.

### Cards / Containers

- **Corner Style:** 10px (`--radius-lg`) pour cartes hero, stats, graphiques.
- **Background:** `--surface` avec bordure `--border`.
- **Shadow Strategy:** aucune au repos ; ombre `--shadow-lg` uniquement pour overlays flottants.
- **Internal Padding:** 14–20px selon densité (hero 1.25rem, stats 0.875rem).

### Inputs / Fields

- **Style:** fond `--surface-raised` ou `--bg-dark`, bordure `--border`, radius 8px, padding 0.55–0.6rem.
- **Focus:** bordure `--accent`, box-shadow `0 0 0 3px var(--focus-ring)`.
- **Error:** bordure `--red`, message en `--red` 0.85rem.

### Navigation

- **Style:** onglets horizontaux sous le header, bordure basse 2px pour l'actif.
- **Default:** `--muted`, 0.8125rem, font-weight 600.
- **Active:** `--text` + bordure basse `--accent`.
- **Mobile:** onglets flexibles, padding réduit, menu hamburger pour actions header.

### Hero Credit Card (signature)

- **Structure:** label + grande valeur mono + sous-texte + jauge arc + barre de progression 4px.
- **Valeur:** 2.5rem mono, couleur sémantique (green/amber/red selon niveau).
- **Progression:** barre pleine sans dégradé, couleur sémantique unie.

### Alert Banners

- **Info:** fond `--accent-muted`, bordure `--accent-border`.
- **Warning:** fond/teinte amber à 10%, bordure amber 35%.
- **Critical:** fond/teinte red à 10%, bordure red 35%.

### Data Tables

- **Wrapper:** `--surface`, bordure, radius lg, shadow sm.
- **Header row:** `--surface-raised`, labels 0.75rem `--muted`.
- **Body cells:** chiffres en Space Mono 0.8125rem ; hover ligne `--surface-raised`.

## 6. Do's and Don'ts

### Do:

- **Do** utiliser OKLCH pour tous les tokens couleur, avec teinte chaude cohérente (hue ~68–72).
- **Do** réserver l'accent ambre aux actions primaires, sélection et états (≤10% de surface visible).
- **Do** afficher les données numériques en Space Mono avec `tabular-nums`.
- **Do** maintenir des rayons 8–10px et des bordures 1px sur tous les conteneurs.
- **Do** limiter les transitions à 150–250 ms avec `cubic-bezier(0.25, 1, 0.5, 1)`.

### Don't:

- **Don't** utiliser glassmorphism, `backdrop-filter`, ou overlays flous comme langage visuel par défaut.
- **Don't** appliquer des dégradés décoratifs (logo, barres de progression, texte).
- **Don't** utiliser des emojis comme icônes de stats ou d'états vides.
- **Don't** écrire des labels en MAJUSCULES avec letter-spacing > 0.05em (style eyebrow SaaS).
- **Don't** animer `transform: translateY()` au hover sur boutons ou cartes.
- **Don't** créer des grilles de cartes identiques avec icône + titre + texte répétés sans raison fonctionnelle.
- **Don't** adopter la palette bleu-cyan « observability dashboard » comme accent principal.
- **Don't** imbriquer des cartes dans des cartes : un niveau de surface suffit.

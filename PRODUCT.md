# Product

## Register

product

## Users

Particuliers à Madagascar équipés d'un compteur d'électricité prépayé. Ils consultent l'app le soir, souvent sur téléphone, dans une pièce peu éclairée, pour vérifier leur solde en kWh et leurs dépenses en Ar. Certains gèrent plusieurs compteurs (maison, bureau). Ils ne sont pas des analystes de données : ils veulent une réponse claire, pas un tableau de bord complexe.

## Product Purpose

ElecTracker aide à suivre le crédit électrique prépayé sans serveur ni compte : relevés de compteur, achats de recharge, estimations de consommation et alertes avant épuisement. Le succès, c'est de savoir **quand recharger** et **pourquoi la facture évolue**, en une ouverture d'app. Les données restent sur l'appareil (localStorage) ; l'utilisateur garde le contrôle via export et import.

## Brand Personality

**Chaleureux · sobre · fiable**

Voix directe, en français, sans jargon technique inutile. Ton utilitaire domestique, pas startup SaaS. L'interface disparaît derrière la tâche : lire un solde, comprendre une conso, agir (relevé, achat, recharge). Références de feeling : outils product bien faits (Linear, Stripe) pour la clarté des états et des actions, pas pour la décoration.

## Anti-references

- Dashboard SaaS « généré par IA » : glassmorphism, dégradés décoratifs, cartes flottantes, hero-metrics géants, grilles de KPI identiques
- Palette observability bleu-cyan sur fond sombre
- Labels en majuscules espacées (eyebrows), emojis comme icônes d'état
- Modales systématiques là où une action inline suffirait
- Surcharge visuelle à l'onboarding (placeholders vides empilés avant la première saisie)
- Animations de lift au hover, motion décorative sans lien avec un changement d'état

## Design Principles

1. **La tâche avant l'interface** : chaque écran répond à une question concrète (combien il reste, combien ça coûte, quand recharger).
2. **Décider en un coup d'œil** : hiérarchie nette, chiffres tabulaires lisibles, alertes priorisées (critique d'abord, le reste repliable).
3. **Familiarité gagnée** : navigation prévisible (dashboard, relevés, achats, paramètres), composants cohérents écran à écran.
4. **Données locales, confiance locale** : pas de cloud implicite ; export/import explicites ; feedback sur la persistance des données.
5. **Honêteté sur la prévision** : indiquer quand l'estimation est peu fiable plutôt que feindre la précision.

## Accessibility & Inclusion

- Cible **WCAG 2.1 AA** pour le texte, le contraste et les focus visibles
- Navigation clavier sur modales et actions principales ; libellés texte sur les boutons d'action (pas icon-only seul sur desktop)
- Respect de `prefers-reduced-motion` pour skeletons, modales et transitions
- Graphiques accompagnés de données tabulaires ou résumés textuels lorsque possible
- Copy en français clair ; montants en Ar et consommation en kWh sans abréviations obscures

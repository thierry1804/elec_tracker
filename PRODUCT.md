# Product

## Register

product

## Users

Particuliers à Madagascar équipés d'un compteur d'électricité prépayé (crédit qui baisse) ou postpayé (index qui monte). Ils consultent l'app le soir, souvent sur téléphone, dans une pièce peu éclairée, pour vérifier leur solde ou leur index en kWh et leurs dépenses en Ar. Certains gèrent plusieurs compteurs (maison, bureau), de types différents. Ils ne sont pas des analystes de données : ils veulent une réponse claire, pas un tableau de bord complexe.

## Product Purpose

ElecTracker aide à suivre sa consommation d'électricité : relevés de compteur, achats de recharge ou factures, estimations de consommation et alertes (crédit bientôt épuisé, relevé trop ancien, type de compteur incohérent). Le succès, c'est de savoir **quand recharger ou relever** et **pourquoi la facture évolue**, en une ouverture d'app.

Chaque utilisateur se connecte avec son compte Google et ne voit que ses propres données, synchronisées entre ses appareils. L'app reste utilisable hors ligne : les modifications sont gardées sur l'appareil puis envoyées à la reconnexion. Les données d'un appareil utilisé avant la connexion peuvent être importées dans le compte. L'export et l'import de fichier restent disponibles.

## Brand Personality

**Chaleureux · sobre · fiable**

Voix directe, en français, sans jargon technique inutile. Ton utilitaire domestique, pas startup SaaS. L'interface disparaît derrière la tâche : lire un solde, comprendre une conso, agir (relevé, achat, recharge). Références de feeling : outils product bien faits (Linear, Stripe) pour la clarté des états et des actions, pas pour la décoration.

## Anti-references

- Dashboard SaaS « généré par IA » : glassmorphism, dégradés décoratifs, cartes flottantes, hero-metrics géants, grilles de KPI identiques
- Palette observability bleu-cyan sur fond sombre
- Labels en majuscules espacées (eyebrows), badges redondants (le type du compteur n'est affiché qu'une fois), emojis comme icônes d'état
- Cartes de statistiques vides (« — ») : une valeur inconnue disparaît et laisse place à une invite avec action
- Modales systématiques là où une action inline suffirait
- Surcharge visuelle à l'onboarding (placeholders vides empilés avant la première saisie)
- Animations de lift au hover, motion décorative sans lien avec un changement d'état

## Design Principles

1. **La tâche avant l'interface** : chaque écran répond à une question concrète (combien il reste, combien ça coûte, quand recharger).
2. **Décider en un coup d'œil** : hiérarchie nette, chiffres tabulaires lisibles, alertes priorisées (critique d'abord, le reste repliable).
3. **Familiarité gagnée** : navigation prévisible (dashboard, relevés, achats, paramètres), composants cohérents écran à écran.
4. **Mes données, où que je sois** : compte personnel, synchronisation visible (état en un coup d'œil, modifications en attente, refus expliqués), usage hors ligne, import et export explicites. Aucune donnée n'est partagée entre comptes.
5. **Honêteté sur la prévision** : indiquer quand l'estimation est peu fiable plutôt que feindre la précision.

## Accessibility & Inclusion

- Cible **WCAG 2.1 AA** pour le texte, le contraste et les focus visibles
- Navigation clavier sur modales et actions principales ; libellés texte sur les boutons d'action (pas icon-only seul sur desktop)
- Respect de `prefers-reduced-motion` pour skeletons, modales et transitions
- Graphiques accompagnés de données tabulaires ou résumés textuels lorsque possible
- Copy en français clair ; montants en Ar et consommation en kWh sans abréviations obscures
- Nombres au format français (virgule décimale, espace pour les milliers) partout, par un formateur unique ; aucune valeur affichée avec un point décimal
- Texte jamais sous 12 px ; contrôles tactiles d'au moins 32 px ; commandes étiquetées en texte (périodes, affichage courbe/tableau, thème)
- Thème automatique : sombre de 18 h à 6 h (heure de l'appareil), clair en journée, avec choix manuel clair ou sombre

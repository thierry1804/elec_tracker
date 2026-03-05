# Plan d’implémentation — ElecTracker

Périmètre : MUST HAVE + SHOULD HAVE (hors PWA). Ordre pensé pour limiter les reprises et les blocages.

---

## Vue d’ensemble

| Phase | Contenu | Durée estimée |
|-------|--------|----------------|
| **1** | Export / Import + Dernière sauvegarde | 1–2 j |
| **2** | Édition relevé + Édition achat | 1–2 j |
| **3** | Validation formulaires | 0,5–1 j |
| **4** | Thème clair / sombre | 0,5 j |
| **5** | Rappels / notifications | 1 j |
| **6** | Export CSV (et option PDF) | 1 j |
| **7** | Objectif / budget mensuel | 1–2 j |

Total indicatif : **6–10 j** selon le niveau de détail (tests, UX).

---

## Phase 1 — Export, import, dernière sauvegarde

**Objectif** : ne plus dépendre uniquement du localStorage ; rassurer l’utilisateur sur la persistance des données.

### 1.1 Format d’export

- Définir un format de fichier (recommandé : JSON avec version).
- Exemple de structure :
  ```json
  { "version": 1, "exportedAt": "2025-03-05T12:00:00.000Z", "data": { "releves": [...], "achats": [...] } }
  ```
- Un seul format pour export et import (fichier `.json` ou nom libre avec extension).

### 1.2 Export des données

- **Où** : Paramètres (modal) ou page dédiée « Sauvegarde ».
- **Action** : bouton « Exporter » → `JSON.stringify` sur `AppData` (+ métadonnées) → téléchargement via `Blob` + `URL.createObjectURL` + `<a download>`.
- **Fichier** : ex. `electracker-backup-YYYY-MM-DD.json`.

### 1.3 Import / restauration

- **Où** : même endroit que l’export.
- **Action** : `<input type="file" accept=".json">` → lecture fichier → `JSON.parse` → validation (présence de `releves` et `achats`, tableaux).
- **Comportement** : choix entre « Remplacer » (écrase le localStorage) et « Fusionner » (optionnel : concaténation des tableaux avec dédoublonnage par `id` ou par date+montant/kWh).
- Afficher un résumé (nb relevés, nb achats) avant de confirmer.
- En cas d’erreur de parsing ou de format : message clair, pas d’écrasement.

### 1.4 Dernière sauvegarde (localStorage)

- Dans `storage.ts` : à chaque `saveData`, écrire aussi une clé du type `electracker_last_save` = `Date.now()` ou ISO string.
- Dans Paramètres (ou footer) : afficher « Dernière sauvegarde : [date/heure locale] » en lisant cette clé.
- Optionnel : afficher aussi « Dernier export : … » si on stocke la date du dernier export (localStorage).

**Livrables Phase 1** : export JSON, import (remplacer + option fusion si souhaité), indication « dernière sauvegarde » dans l’UI.

---

## Phase 2 — Édition relevé et édition achat

**Objectif** : corriger une saisie sans supprimer l’entrée.

### 2.1 Modifier un relevé

- **Storage / contexte** : ajouter `updateReleve(id, { date?, creditRestantKwh? })` dans `useAppData` (et dans `storage` si on factorise la logique). Mise à jour de l’élément dans `data.releves` par `id`.
- **UI** : dans la page Historique, sur chaque ligne, bouton « Modifier » (icône crayon) à côté de « Supprimer ».
- **Modal** : réutiliser le même formulaire que « Nouveau relevé » (même champs : date, heure, crédit kWh), prérempli avec les valeurs du relevé. À la soumission, appeler `updateReleve(id, ...)` au lieu de `addReleve`.
- **Cohérence** : vérifier que les calculs (consommations entre relevés, prévision) se mettent à jour correctement (déjà le cas si `data` réactif).

### 2.2 Modifier un achat

- **Storage / contexte** : ajouter `updateAchat(id, { date?, montantAr?, creditKwh? })`. Recalculer `prixUnitaireArPerKwh` dans le hook.
- **Règle métier** : aujourd’hui, un « nouvel achat » crée aussi un relevé synthétique (solde après achat). Pour l’édition d’un achat :
  - **Option A** : mettre à jour uniquement l’achat (date, montant, kWh) ; ne pas toucher aux relevés (relevés = saisies manuelles + anciens relevés créés par achat). Plus simple.
  - **Option B** : identifier le relevé créé à la date de l’achat et recalculer le solde de ce relevé et des suivants. Plus cohérent mais plus complexe.
- Recommandation pour la v1 : **Option A** (éditer uniquement l’achat). Documenter le comportement.
- **UI** : page Achats, bouton « Modifier » par ligne ; modal « Modifier l’achat » (même champs que nouvel achat), prérempli.

**Livrables Phase 2** : `updateReleve` / `updateAchat` utilisables, boutons Modifier + modales d’édition sur Historique et Achats.

---

## Phase 3 — Validation et feedback des formulaires

**Objectif** : champs requis, formats corrects, messages d’erreur explicites.

- **ReleveForm** : date/heure requis ; crédit restant requis, numérique, ≥ 0. Messages : « Saisissez un nombre », « Le crédit ne peut pas être négatif ».
- **AchatForm** : date requise ; montant et crédit requis, numériques, > 0. Mêmes types de messages.
- **Implémentation** : soit validation au submit + affichage des erreurs sous les champs, soit validation en temps réel (onBlur / onChange). Éviter de bloquer la saisie (ex. accepter la virgule puis normaliser).
- **Accessibilité** : `aria-invalid`, `aria-describedby` vers le message d’erreur, lien entre label et input.

**Livrables Phase 3** : tous les formulaires (nouveau relevé, nouveau achat, édition) avec validation et messages clairs.

---

## Phase 4 — Thème clair / sombre

- **CSS** : variables déjà présentes (ex. `--bg-card`, `--text-secondary`) ; ajouter un jeu de variables pour le thème clair et un pour le sombre (ex. `[data-theme="dark"]` ou classe sur `html`).
- **Persistance** : stocker la préférence dans `localStorage` (ex. `electracker_theme`: `"light"` | `"dark"`).
- **UI** : dans Paramètres (ou header), toggle ou bouton « Thème : Clair / Sombre ». Au chargement, appliquer le thème sauvegardé.
- **Optionnel** : détection `prefers-color-scheme` pour la valeur par défaut au premier lancement.

**Livrables Phase 4** : bascule clair/sombre persistée, sans casser les graphiques (couleurs en variables).

---

## Phase 5 — Rappels / notifications

- **Permission** : demander l’autorisation Notification du navigateur (après un bouton « Activer les rappels » dans Paramètres).
- **Données** : stocker en localStorage ex. `electracker_reminder`: `{ enabled: boolean, daysBefore?: number }` (ex. « me notifier X jours avant la date d’épuisement »).
- **Déclenchement** : à l’ouverture de l’app (ou via un Service Worker si on ajoute le PWA plus tard), comparer la date du jour à la date d’épuisement estimée ; si `joursRestants <= daysBefore` et pas encore notifié pour cette période, afficher une notification (Notification API).
- **Limitation** : sans PWA/background, le rappel ne se déclenche que quand l’utilisateur ouvre l’app. Le documenter (ex. « Ouvrez l’application pour vérifier les rappels »).
- **UI** : dans Paramètres, section « Rappels » : case à cocher « Me rappeler de recharger », champ « Nombre de jours avant épuisement » (défaut 3).

**Livrables Phase 5** : paramètre rappel persisté, notification au chargement de l’app si condition remplie.

---

## Phase 6 — Export CSV (et option PDF)

- **CSV** :
  - Deux exports possibles : « Historique des relevés » (date, heure, crédit kWh, conso. calculée, durée) et « Historique des achats » (date, montant, crédit kWh, prix unitaire). Ou un seul fichier avec deux onglets (non standard en CSV) ; plus simple : deux boutons « Export relevés CSV » et « Export achats CSV ».
  - Génération côté client : tableau de lignes → `array.map(row => row.join(';'))` + en-têtes, encodage UTF-8 avec BOM pour Excel.
- **PDF** (optionnel) : librairie type jsPDF ou react-pdf pour générer un rapport simple (tableau des relevés + tableau des achats + éventuellement courbe solde). Peut être déplacé en SHOULD HAVE ultérieur si priorité au CSV.

**Livrables Phase 6** : export CSV relevés et export CSV achats (fichiers séparés ou choix utilisateur).

---

## Phase 7 — Objectif / budget mensuel

- **Modèle** : ajouter dans le stockage (ex. dans `AppData` ou clé séparée `electracker_settings`) un objectif optionnel : `budgetMensuelAr?: number` et/ou `objectifKwhMois?: number`.
- **Paramètres** : formulaire « Objectif mensuel » (Ar et/ou kWh), sauvegardé en localStorage.
- **Dashboard** :
  - Si objectif Ar : comparer `coût mensuel estimé` à `budgetMensuelAr` ; afficher une carte ou un indicateur « Dans la cible » / « Dépassement de X Ar » (couleur/icône).
  - Si objectif kWh : comparer `kwhMoisEstime` (≈ taux × 30) à `objectifKwhMois` ; « Dans la cible » / « Au-dessus de X kWh ».
- **Optionnel** : petite jauge ou barre de progression (ex. 80 % du budget utilisé).

**Livrables Phase 7** : paramètres objectif, affichage sur le dashboard avec indicateur dans la cible / dépassement.

---

## Ordre des phases et dépendances

```
Phase 1 (Export/Import + Dernière sauvegarde)  →  base de données « portable »
Phase 2 (Édition relevé/achat)                 →  pas de dépendance technique sur Phase 1
Phase 3 (Validation formulaires)              →  améliore les modales de Phase 2 si fait après
Phase 4 (Thème)                                →  indépendant
Phase 5 (Rappels)                              →  utilise prévision existante
Phase 6 (CSV)                                  →  réutilise la logique de sérialisation (format différent)
Phase 7 (Budget)                               →  réutilise coût mensuel et kWh/mois du dashboard
```

On peut enchaîner 1 → 2 → 3, puis 4, 5, 6, 7 en parallèle ou dans l’ordre selon les priorités.

---

## Fichiers à créer ou modifier (résumé)

| Fonctionnalité        | Fichiers concernés (exemples) |
|-----------------------|--------------------------------|
| Export / Import       | `storage.ts`, nouveau `lib/exportImport.ts`, `SettingsModal.tsx` ou page Sauvegarde |
| Dernière sauvegarde   | `storage.ts`, `SettingsModal.tsx` ou footer |
| updateReleve          | `useAppData.ts`, `Historique.tsx`, `ReleveForm.tsx` (mode édition) |
| updateAchat           | `useAppData.ts`, `Achats.tsx`, `AchatForm.tsx` (mode édition) |
| Validation formulaires| `ReleveForm.tsx`, `AchatForm.tsx` |
| Thème                 | `index.css` (variables), `Layout.tsx` ou `SettingsModal`, localStorage |
| Rappels               | nouveau hook ou util `notifications.ts`, `SettingsModal.tsx`, permission Notification |
| Export CSV            | nouveau `lib/csvExport.ts`, boutons dans Paramètres ou Historique/Achats |
| Budget                | `types.ts` (ou settings), `storage.ts`, `SettingsModal.tsx`, `DashboardCards.tsx` |

---

## Hors périmètre pour ce plan

- **PWA** : à traiter dans un plan ultérieur (manifest, Service Worker, stratégie cache, installabilité).

---

## Fonctionnalités « intelligentes » (fancy / avancées)

Idées de fonctionnalités qui s’appuient sur les données déjà présentes pour offrir plus de valeur sans changer le cœur métier.

### Analyse et comparaisons

| Idée | Description |
|------|-------------|
| **Comparaison de périodes** | « Ce mois vs mois dernier » : kWh consommés, coût en Ar, évolution en %. Afficher sur le dashboard ou dans une section « Statistiques ». |
| **Évolution du prix moyen** | Déjà partiellement couvert par le graphique Achats ; ajouter « Prix moyen ce mois vs mois dernier » (Ar/kWh) pour voir si les recharges récentes sont plus chères. |
| **Tendance consommation** | Indicateur « Votre conso. baisse / reste stable / augmente » (régression sur les taux journaliers), avec pourcentage d’évolution sur 30 j. |

### Prévisions et objectifs avancés

| Idée | Description |
|------|-------------|
| **Prévision annuelle** | Estimation du coût sur 12 mois (× coût mensuel estimé) avec fourchette basée sur l’écart-type des consommations passées. Utile pour budgétiser. |
| **Objectif d’économie** | « Si vous réduisez de 10 % votre conso., vous économiserez environ X Ar/mois » à partir du coût mensuel actuel. |
| **Date de recharge « typique »** | À partir de l’historique des achats : « En moyenne vous rechargez tous les X jours » et « Prochaine recharge suggérée (habitude) : … ». Complète la prévision basée sur le solde. |

### Détection et alertes intelligentes

| Idée | Description |
|------|-------------|
| **Anomalie de consommation** | Détection d’un pic : « Cette semaine votre conso. est d’environ X kWh/j vs une moyenne de Y — vérifiez un appareil ou une fuite. » (seuils configurables ou heuristiques). |
| **Alerte dépassement budget** | Si objectif mensuel est défini : « Au rythme actuel vous dépasserez votre objectif de Z Ar ce mois » (extrapolation à partir du coût mensuel estimé). |
| **Rappel basé sur l’habitude** | En plus du rappel « X jours avant épuisement », proposer « Vous rechargez en moyenne tous les N jours ; prochaine recharge suggérée : [date] » (calculée à partir des achats passés). |

### Résumés et rapports

| Idée | Description |
|------|-------------|
| **Résumé hebdo / mensuel** | Bloc « Cette semaine : X kWh, Y Ar » et « Ce mois : X kWh, Y Ar » (agrégation des consommations entre relevés et des achats dans la période). |
| **Saisonnalité** | Avec suffisamment de données : « Conso. habituellement plus élevée en [mois] » (moyenne par mois sur les années passées). |
| **Export « rapport »** | Export PDF ou HTML : synthèse (solde actuel, dernier relevé, dernier achat, conso. moyenne, coût mensuel, objectif si défini) + tableaux relevés/achats. |

### UX et personnalisation

| Idée | Description |
|------|-------------|
| **Conseils contextuels** | Messages courts selon la situation : « Rechargez avant le week-end pour éviter la file » ou « Votre prix moyen a augmenté ce mois — comparez les offres ». |
| **Unité préférée** | Choix d’affichage (Ar vs kAr, ou arrondi à l’entier) dans les paramètres. |
| **Période par défaut des graphiques** | Choix « 7 / 30 / 90 jours » ou « Tout » pour les courbes du dashboard. |

Ces idées peuvent être priorisées après les phases 1–7 (MUST / SHOULD) et intégrées par petits incréments (ex. comparaison de périodes puis prévision annuelle, etc.).

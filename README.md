# ElecTracker - Suivi Électricité Prépayée

Application React (Vite, TypeScript) de suivi de consommation et de crédit d’électricité prépayée. Données stockées localement dans le navigateur (localStorage). Aucun serveur requis.

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173

---

## Fonctionnalités

### Tableau de bord (Dashboard)

- **Crédit restant** : affichage du solde en kWh avec jauge circulaire et barre de progression (niveaux vert / orange / rouge selon le niveau).
- **Jours restants** : estimation du nombre de jours avant épuisement du crédit, au rythme de consommation actuel.
- **Consommation journalière** : taux moyen en kWh/jour (moyenne pondérée sur 7 j, 30 j et global). Indication « IA » pendant le chargement si une clé API est configurée, et « peu fiable » si l’historique couvre moins de 3 jours.
- **Prix moyen** : prix unitaire moyen en Ar/kWh sur l’ensemble des achats.
- **Coût mensuel estimé** : coût en Ar pour 30 jours, basé sur la conso. journalière et le prix moyen.
- **Prochain achat suggéré** : date et quantité en kWh suggérées (environ 3 jours avant épuisement), avec bouton « Acheter maintenant » ouvrant le formulaire d’achat.
- **Alertes** : bandeau si le crédit sera épuisé bientôt ; message si la prévision est indisponible ou peu fiable (relevés sur moins de 2–3 jours ou intervalles &lt; 6 h).
- **Graphiques** :
  - **Évolution du solde** : courbe du solde (kWh) dans le temps, avec courbe de prévision et intervalle de confiance lorsque la prévision est disponible.
  - **Consommation entre relevés** : barres des kWh consommés entre chaque paire de relevés (avec durée en heures ou jours).

### Historique des relevés

- Liste chronologique (du plus récent au plus ancien) : date et heure du relevé, crédit restant (kWh), consommation calculée entre deux relevés (kWh et durée).
- Suppression d’un relevé (avec confirmation).

### Achats (recharges)

- **Graphique** : évolution du prix unitaire (Ar/kWh) dans le temps (courbe par date d’achat).
- **Tableau** : date, montant (Ar), crédit (kWh), prix unitaire (Ar/kWh).
- Suppression d’un achat (avec confirmation).

### Saisie des données

- **Nouveau relevé** (bouton « + Relevé » dans l’en-tête) : date, heure et crédit restant (kWh). Modal avec sélecteur de date (fr).
- **Nouvel achat** (bouton « + Achat ») : date, montant (Ar) et crédit (kWh) ; le prix unitaire Ar/kWh est calculé automatiquement.

### Prévision et paramètres (IA optionnelle)

- **Prévision locale** (par défaut) : taux journalier pondéré (7 j à 60 %, 30 j à 30 %, global à 10 %) pour estimer jours restants, date d’épuisement et prochain achat. Aucune clé API requise.
- **Prévision IA** (optionnelle) : via **Paramètres** (icône engrenage), configuration d’une clé API (OpenAI ou compatible), URL de l’API et modèle. Si une clé est renseignée et qu’il y a au moins 2 relevés, l’appel à l’IA améliore l’estimation du taux journalier. Possibilité de désactiver l’IA pour revenir au calcul local.

### Navigation et interface

- En-tête avec date du jour, logo ElecTracker, badges « PRÉPAYÉ », boutons Paramètres, + Relevé, + Achat.
- Navigation par onglets : Dashboard, Historique, Achats.
- Menu hamburger sur mobile pour accéder aux mêmes actions.
- Données sauvegardées automatiquement dans le navigateur (localStorage).

---

## Roadmap — Fonctionnalités proposées

### MUST HAVE (indispensables)

| Fonctionnalité | Raison |
|----------------|--------|
| **Modifier un relevé** | Aujourd’hui seule la suppression existe ; une erreur de saisie (date, heure, kWh) oblige à supprimer et recréer. L’édition évite la perte de cohérence de l’historique. |
| **Modifier un achat** | Même besoin : corriger une date, un montant ou un crédit kWh sans supprimer l’entrée. |
| **Export / sauvegarde des données** | Les données ne vivent que dans le localStorage (nettoyage du navigateur, changement d’appareil = perte totale). Un export JSON (ou fichier téléchargeable) permet de sauvegarder et de conserver l’historique. |
| **Import / restauration** | Complément de l’export : restaurer une sauvegarde ou reprendre sur un autre appareil. Sans ça, l’export seul est peu utile à long terme. |

### SHOULD HAVE (souhaitables)

| Fonctionnalité | Raison |
|----------------|--------|
| **Rappels / notifications** | Rappel « Pensez à recharger dans X jours » (notifications navigateur ou date à choisir). Renforce l’utilité de la prévision et limite les coupures. |
| **Export CSV (ou PDF)** | Export lisible (Excel, imprimable) pour l’historique des relevés et des achats : déclarations, suivi perso, partage avec un comptable. |
| **Thème clair / sombre** | Confort d’utilisation selon l’heure ou la préférence utilisateur ; souvent attendu sur les applis de suivi. |
| **Objectif ou budget mensuel** | Saisie optionnelle d’un budget en Ar ou d’un plafond en kWh/mois, avec indicateur « dans la cible » / « dépassement ». Aide à maîtriser la dépense. |
| **PWA (installable, offline)** | *Hors périmètre du plan actuel.* À traiter ultérieurement. |
| **Validation et feedback des formulaires** | Champs requis, formats (nombre, date), messages d’erreur explicites. Réduit les saisies invalides et améliore l’accessibilité. |
| **Indication « dernière sauvegarde »** | Afficher en bas de page ou dans les paramètres la date/heure du dernier enregistrement réussi dans le localStorage. Rassure l'utilisateur sur la persistance des données. |

### Plan d'implémentation (sans PWA)

Un **plan d'implémentation détaillé** (phases, ordre, fichiers impactés) est dans [IMPLEMENTATION.md](./IMPLEMENTATION.md). Résumé des phases :

1. **Phase 1** — Export / Import + indication « dernière sauvegarde »
2. **Phase 2** — Modifier un relevé + Modifier un achat
3. **Phase 3** — Validation et feedback des formulaires
4. **Phase 4** — Thème clair / sombre
5. **Phase 5** — Rappels / notifications (navigateur)
6. **Phase 6** — Export CSV (et option PDF)
7. **Phase 7** — Objectif / budget mensuel

### Fonctionnalités intelligentes (fancy)

Voir le détail dans [IMPLEMENTATION.md](./IMPLEMENTATION.md). Idées proposées :

- **Analyse** : comparaison de périodes (ce mois vs mois dernier), tendance conso., évolution du prix moyen
- **Prévisions avancées** : coût annuel estimé, objectif d'économie (« −10 % conso. = X Ar économisés »), date de recharge « typique » selon l'historique
- **Alertes** : anomalie de consommation (pic), alerte dépassement budget, rappel basé sur l'habitude de recharge
- **Rapports** : résumé hebdo/mensuel, saisonnalité (si assez de données), export « rapport » (PDF/HTML)
- **UX** : conseils contextuels, unité préférée (Ar/kAr), période par défaut des graphiques

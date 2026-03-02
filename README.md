# ElecTracker - Suivi Électricité Prépayée

Application React de suivi de consommation et de crédit d'électricité prépayée. Données stockées localement (localStorage).

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Fonctionnalités

- **Dashboard** : solde restant, jours avant épuisement, consommation journalière, prix moyen Ar/kWh, coût mensuel estimé, date suggérée pour le prochain achat, alertes si crédit faible
- **Graphiques** : évolution du solde (kWh) et barres de consommation entre relevés
- **Historique** : liste des relevés avec consommation calculée entre chaque paire
- **Achats** : suivi des recharges avec prix unitaire Ar/kWh et courbe d'évolution du prix

Les données sont sauvegardées automatiquement dans le navigateur.

## Development server
Run `ng serve` to start

## Build
Run `ng build` to build the project. (config déjà faite dans angular.json pour build sous docs/)

## Fichiers importés
Le bouton « Importer factures » accepte deux exports Odoo et reconnaît lequel
c'est d'après les intitulés de colonnes : « Écriture comptable » (une ligne =
une ligne de facture, regroupée par numéro de facture) et « Tournée devis »
(une ligne = une ligne de bon de commande, regroupée par référence commande).
Les deux sont décrits dans `src/app/formats-fichier.ts` ; le format reconnu est
affiché dans la barre d'outils après l'import.

## Tests
Run `npm run test:ci` to run the test suite once, or `npm test` to watch.
Run `npm run fixtures` to write sample Excel files into `helpers/fixtures/`.
See [TESTS.md](TESTS.md).

# Tests automatisés

105 tests couvrent la lecture des fichiers Excel, les regroupements, le contenu
des PDF et la mise à jour de l'inventaire.

## Lancer les tests

```bash
npm run test:ci     # une passe, sans fenêtre, pour vérifier avant de committer
npm test            # mode surveillance : relance à chaque modification
```

`test:ci` utilise Chrome en mode headless (Chrome doit être installé).

## Générer des fichiers Excel de test

```bash
npm run fixtures
```

Écrit dans `helpers/fixtures/` de vrais `.xlsx` correspondant aux données des
tests, pour essayer l'application à la main sans données client :

| Fichier | Sert à |
|---|---|
| `factures.xlsx` | export « Écriture comptable » standard |
| `inventaire.xlsx` | export d'inventaire standard |
| `factures_ancien_format.xlsx` | numéro de facture sur la 1re ligne seulement |
| `factures_colonne_manquante.xlsx` | déclenche le message d'erreur d'import |
| `inventaire_sans_reference.xlsx` | déclenche l'erreur de colonne manquante |

Ces fichiers sont **générés**, pas versionnés : la source est
`src/app/testing/excel-fixtures.ts`, la même que celle des tests.

## Ce qui est couvert

| Fichier | Tests | Vérifie |
|---|---:|---|
| `sort-excel.service.spec.ts` | 17 | détection des colonnes par intitulé, colonne obligatoire manquante, regroupement par facture, propagation du client, produit répété, avoirs, lignes sans produit, ancien et nouveau format d'export |
| `update-inventaire.service.spec.ts` | 29 | totaux par référence, exclusion des alcools, casse et espaces, colonnes retirées, déduction sur les 2 colonnes de quantité, négatifs, décimales, références inconnues, **fichier source jamais modifié**, inventaire mal formé |
| `generate-pdf.service.spec.ts` | 18 | présence ou absence de la section Vini, ordre des sections, découpage en colonnes (15 vins / 22 autres), sauts de page, format `qte⇥nom`, génération d'un vrai PDF |
| `liste-commande.component.spec.ts` | 31 | import, réimport sans doublon, total produits, impression par tournée, suppression d'une facture, mise à jour de l'inventaire de bout en bout, réinitialisation |
| `familles.spec.ts` | 5 | familles FA0001 / FA0004 exclues des agrégats |

## Jeu de données standard

Défini dans `src/app/testing/excel-fixtures.ts`. Trois factures qui couvrent
volontairement les cas tordus :

- **INV/2026/0001** — Trattoria Uno : 6 GRAPPA *(alcool)*
- **INV/2026/0002** — Pizzeria Due : 36 CHIARETTO *(vin)*, 10 SCAMPI, 6 ORECCHIETTE,
  3 ARANCINI *(absent de l'inventaire)*
- **INV/2026/0003** — Trattoria Uno *(2e facture du même client)* : 20 SCAMPI,
  5 SCAMPI *(même produit deux fois)*, −1 AMARONE *(avoir sur un vin)*

Après mise à jour de l'inventaire on doit obtenir :

| Réf. | Avant | Après | Pourquoi |
|---|---|---|---|
| `SCAM` | 100 / 110 | 65 / 75 | 10 + 20 + 5 vendus |
| `OREC` | 50 / 50 | 44 / 44 | 6 vendus |
| `ZZZZ` | 7 / 8 | 7 / 8 | non vendu |
| *(sans réf.)* | 3 / 3 | 3 / 3 | pas de référence interne |
| `AMASC` | 12 / 12 | 12 / 12 | vin exclu, même en avoir |

plus un avertissement : `ARAXL` facturé mais absent de l'inventaire.

## Ajouter un cas de test

Les classeurs sont construits en mémoire puis relus par un vrai cycle
écriture/lecture `.xlsx`, donc les tests passent par le même chemin qu'un
fichier importé par l'utilisateur.

```ts
import { construireEcritureComptable, FAMILLE } from './testing/excel-fixtures';

const workbook = await construireEcritureComptable([{
  numero: 'INV/1', codeClient: '1', nomClient: 'Client',
  lignes: [{ codeProduit: '1', nomProduit: 'PRODUIT', famille: FAMILLE.POISSON, qte: 4, ref: 'REF' }],
}]);
```

Options utiles :

- `colonnesAbsentes: [...]` — simule un export incomplet
- `numeroSurChaqueLigne: false` — ancien format
- `clientSurPremiereLigneSeulement: false` — client répété sur chaque ligne

Pour l'inventaire, `construireInventaire(produits, { colonnesAbsentes })`.

## Points d'attention

- `ConfirmationService` est déclaré dans les `providers` du composant : pour le
  remplacer dans un test il faut `fixture.debugElement.injector.get(...)`, pas
  `TestBed.inject(...)`.
- Le téléchargement du fichier généré est neutralisé en interceptant
  `URL.createObjectURL` et le `click()` de l'ancre, ce qui permet aussi de
  relire le classeur produit.
- `GeneratePdfService.construireDocument()` renvoie la définition pdfmake sans
  déclencher de téléchargement : c'est ce qui rend le contenu des PDF vérifiable.

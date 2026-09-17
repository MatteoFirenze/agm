# Tests automatisés

176 tests couvrent la lecture des fichiers Excel, la reconnaissance des deux
formats d'import, les regroupements, le contenu des PDF, la mise à jour de
l'inventaire et le catalogue produits.

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
| `tournee_devis.xlsx` | export « Tournée devis » standard |
| `inventaire.xlsx` | export d'inventaire standard |
| `factures_ancien_format.xlsx` | numéro de facture sur la 1re ligne seulement |
| `factures_colonne_manquante.xlsx` | déclenche le message d'erreur d'import |
| `inventaire_sans_reference.xlsx` | déclenche l'erreur de colonne manquante |

Ces fichiers sont **générés**, pas versionnés : la source est
`src/app/testing/excel-fixtures.ts`, la même que celle des tests.

## Ce qui est couvert

| Fichier | Tests | Vérifie |
|---|---:|---|
| `liste-commande.component.spec.ts` | 49 | import des deux formats, réimport sans doublon, total produits, impression par tournée, suppression d'une facture, mise à jour de l'inventaire de bout en bout, catalogue produits, fichier d'un format inconnu, réinitialisation |
| `sort-excel.service.spec.ts` | 36 | reconnaissance du format par les intitulés, colonne obligatoire manquante, regroupement par pièce, propagation du client et du numéro de pièce, référence entre crochets, produit répété, avoirs, lignes sans produit, produits sans catégorie, **équivalence des deux formats** |
| `update-inventaire.service.spec.ts` | 29 | totaux par référence, exclusion des alcools, casse et espaces, colonnes retirées et réordonnées, déduction sur les 2 colonnes de quantité, négatifs, décimales, références inconnues, **fichier source jamais modifié**, inventaire mal formé |
| `generate-catalogue.service.spec.ts` | 21 | regroupement par étiquette (à défaut par catégorie), prix repris tels quels (TTC), articles épuisés écartés, tri par nom, ordre des groupes, répartition en 2 colonnes, échappement HTML, logo facultatif, rien de téléchargé si catalogue vide |
| `generate-pdf.service.spec.ts` | 18 | présence ou absence de la section Vini, ordre des sections, découpage en colonnes (15 vins / 22 autres), sauts de page, format `qte⇥nom`, génération d'un vrai PDF |
| `formats-fichier.spec.ts` | 13 | extraction de la référence entre crochets, colonnes retrouvées quelle que soit leur position, intitulés en double, colonnes d'un autre format |
| `familles.spec.ts` | 5 | familles FA0001 / FA0004 exclues des agrégats |

## Les deux formats d'import

Décrits dans `src/app/formats-fichier.ts`. Le fichier importé est reconnu à
partir des intitulés de sa ligne 1 : l'utilisateur n'a rien à déclarer, et les
colonnes sont retrouvées par leur intitulé et jamais par leur position — l'ordre
change d'un export Odoo à l'autre.

| | Écriture comptable | Tournée devis |
|---|---|---|
| une ligne = | une ligne de facture | une ligne de bon de commande |
| pièce de regroupement | `Lignes de facture/Numéro` (`INV/2026/…`) | `Référence commande` (`S00…`) |
| client | `Partenaire/ID` + `Nom d'affichage…` | `Client/ID` + `Client` |
| produit | `Lignes de facture/Produit/Nom` | `Lignes de commande/Produit` |
| référence interne | colonne dédiée | préfixe du nom : `[PANZ] PANZEROTTINI…` |

Deux mécanismes rendent les deux formats interchangeables :

- **propagation** : une ligne sans numéro de pièce appartient à la dernière pièce
  vue, une ligne sans client au dernier client vu. Dans une tournée devis c'est
  le cas de toutes les lignes de continuation ; le client, lui, est souvent le
  même sur tout le fichier, d'où le regroupement par pièce et non par client.
- **`separerRefEtNom()`** : le texte entre crochets est exactement la
  « Référence interne » du produit, et ce qui suit exactement son « Nom » tel que
  l'écriture comptable et l'inventaire l'écrivent. Les deux formats donnent donc
  les mêmes listes de chambre et la même mise à jour d'inventaire — c'est ce que
  vérifie le test « donne exactement le même résultat que l'écriture comptable ».

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

## Jeu de données « Tournée devis »

`COMMANDES_STANDARD`, calqué sur un export réel : **le même client sur les trois
commandes**, seule la référence commande les distingue.

- **S00891** — PRIVE BON : 12 GRILLO *(vin)*, 12 NERO *(vin)*
- **S00892** — PRIVE BON : 18 GRILLO *(même produit qu'en S00891)*, 3 SCAMPI
- **S00893** — PRIVE BON : 8 ORECCHIETTE, 1 OLIO *(sans catégorie de produits)*

Attendu : `SCAM` 100/110 → 97/107, `OREC` 50/50 → 42/42, les vins inchangés, un
avertissement pour OLIO qui n'a pas de catégorie donc n'ira dans aucune chambre,
et un autre pour `OLI5` absent de l'inventaire.

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

`construireTourneeDevis(...)` prend **exactement le même jeu de données** et
l'écrit dans l'autre nomenclature : la référence passe entre crochets devant le
nom, et la référence commande n'est mise que sur la 1re ligne de chaque commande.
C'est ce qui permet de confronter les deux imports sur les mêmes données.

Options utiles, communes aux deux fabriques :

- `colonnesAbsentes: [...]` — simule un export incomplet
- `numeroSurChaqueLigne` — numéro de pièce répété ou seulement sur la 1re ligne
  (par défaut `true` pour l'écriture comptable, `false` pour la tournée devis,
  soit ce que font les vrais exports)
- `clientSurPremiereLigneSeulement: false` — client répété sur chaque ligne

Pour l'inventaire, `construireInventaire(produits, { colonnesAbsentes })`.

## Colonnes du fichier d'inventaire généré

`Favori` et `Activité exception décoration` sont retirées, puis `Nom`,
`Prix de vente` et `Quantité disponible` sont remontées en tête — ce sont celles
que l'on consulte en premier. Le reste suit dans l'ordre du fichier importé :

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| Nom | Prix de vente | Quantité disponible | Référence interne | Étiquettes | Taxes de vente | Catégorie de produits | Quantité prévue |

Cet ordre est défini par `COLONNES_EN_TETE` dans `update-inventaire.service.ts`
et vérifié par un seul test ; les autres lisent les valeurs par intitulé de
colonne (`lignesParTitre()`), donc changer l'ordre ne les casse pas.

## Points d'attention

- `ConfirmationService` est déclaré dans les `providers` du composant : pour le
  remplacer dans un test il faut `fixture.debugElement.injector.get(...)`, pas
  `TestBed.inject(...)`.
- Le téléchargement du fichier généré est neutralisé en interceptant
  `URL.createObjectURL` et le `click()` de l'ancre, ce qui permet aussi de
  relire le classeur produit.
- `GeneratePdfService.construireDocument()` renvoie la définition pdfmake sans
  déclencher de téléchargement : c'est ce qui rend le contenu des PDF vérifiable.
- `SortExcelService.sortExcel()` renvoie le format reconnu, ou `null` s'il n'en
  reconnaît aucun — auquel cas il a déjà averti et appelé le callback de reset.
  Plusieurs tests s'appuient sur cette valeur de retour.
- Le catalogue intègre `assets/catalogue-logo.png`, récupéré par `fetch` : les
  tests remplacent `window.fetch` pour ne pas dépendre de cet asset.

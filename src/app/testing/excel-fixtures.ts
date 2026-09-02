import * as ExcelJS from 'exceljs' ;

/*Fabriques de fichiers Excel de test.

Les classeurs sont construits en mémoire puis relus via un vrai cycle
écriture/lecture xlsx : les tests passent donc par le même chemin qu'un
fichier réellement importé par l'utilisateur.

Les données sont anonymisées mais la forme reproduit exactement les exports
Odoo : mêmes intitulés de colonnes, et client renseigné uniquement sur la
première ligne de chaque facture.*/

/*Catégories de produits telles qu'Odoo les exporte*/
export const FAMILLE = {
  VIN:             'FA0001 - FA0001',
  PATES_SURG:      'FA0002 - FA0002',
  POISSON:         'FA0003 - FA0003',
  GRAPPA:          'FA0004 - FA0004',
  VERDURE:         'FA0006 - FA0006',
  DESSERT:         'FA0007 - FA0007',
  VIVA:            'FA0008 - FA0008',
  PATES_FRAICHES:  'FA0009 - FA0009',
  GLACE:           'FA0010 - FA0010',
  PORCINI:         'FA0011 - FA0011',
};

/*Intitulés exacts des colonnes de l'export « Écriture comptable »*/
export const COLONNES_FACTURE = {
  codeClient: 'Partenaire/ID',
  nomClient:  "Nom d'affichage du partenaire de la facture",
  codeProduit:'Lignes de facture/Produit/ID',
  nomProduit: 'Lignes de facture/Produit/Nom',
  famille:    'Lignes de facture/Produit/Catégorie de produits',
  qte:        'Lignes de facture/Quantité',
  numero:     'Lignes de facture/Numéro',
  ref:        'Lignes de facture/Produit/Référence interne',
};

/*Intitulés exacts des colonnes de l'export d'inventaire*/
export const COLONNES_INVENTAIRE = ['Favori', 'Nom', 'Référence interne', 'Étiquettes',
  'Prix de vente', 'Taxes de vente', 'Catégorie de produits',
  'Quantité disponible', 'Quantité prévue', 'Activité exception décoration'];

export interface LigneFixture {
  codeProduit? : any,
  nomProduit? : any,
  famille? : any,
  qte? : any,
  ref? : any,
}

export interface FactureFixture {
  numero : string,
  codeClient? : any,
  nomClient? : any,
  lignes : LigneFixture[],
}

export interface OptionsFacture {
  /*Colonnes à ne pas écrire, pour tester la détection d'un export incomplet*/
  colonnesAbsentes? : string[],
  /*false = ancien export, le numéro de facture n'est que sur la 1re ligne*/
  numeroSurChaqueLigne? : boolean,
  /*false = le client est répété sur chaque ligne au lieu de la 1re seulement*/
  clientSurPremiereLigneSeulement? : boolean,
}

export interface ProduitInventaire {
  nom? : any,
  ref? : any,
  etiquettes? : any,
  prix? : any,
  taxes? : any,
  famille? : any,
  dispo? : any,
  prevu? : any,
}

/*Écrit puis relit le classeur : reproduit fidèlement l'import utilisateur
et garantit que les adresses de cellules ($A$1…) sont bien celles d'un vrai
fichier.*/
async function allerRetour(workbook : ExcelJS.Workbook) : Promise<ExcelJS.Workbook> {
  const buffer = await workbook.xlsx.writeBuffer();
  const relu = new ExcelJS.Workbook();
  await relu.xlsx.load(buffer as any);
  return relu;
}

/*Construit un classeur au format « Écriture comptable »*/
export async function construireEcritureComptable(
  factures : FactureFixture[],
  options : OptionsFacture = {}
) : Promise<ExcelJS.Workbook> {

  const absentes = options.colonnesAbsentes || [];
  const numeroPartout = options.numeroSurChaqueLigne !== false;
  const clientPremiereSeulement = options.clientSurPremiereLigneSeulement !== false;

  /*ordre des colonnes tel qu'Odoo les sort*/
  const ordre : { cle : keyof typeof COLONNES_FACTURE, titre : string }[] =
    (Object.keys(COLONNES_FACTURE) as (keyof typeof COLONNES_FACTURE)[])
      .map(cle => ({ cle, titre: COLONNES_FACTURE[cle] }))
      .filter(c => absentes.indexOf(c.titre) === -1);

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet('Sheet1');
  feuille.addRow(ordre.map(c => c.titre));

  factures.forEach(facture => {
    facture.lignes.forEach((ligne, index) => {
      const premiere = index === 0;
      const valeurs : any = {
        codeClient:  (!clientPremiereSeulement || premiere) ? nul(facture.codeClient) : null,
        nomClient:   (!clientPremiereSeulement || premiere) ? nul(facture.nomClient) : null,
        codeProduit: nul(ligne.codeProduit),
        nomProduit:  nul(ligne.nomProduit),
        famille:     nul(ligne.famille),
        qte:         nul(ligne.qte),
        numero:      (numeroPartout || premiere) ? facture.numero : null,
        ref:         nul(ligne.ref),
      };
      feuille.addRow(ordre.map(c => valeurs[c.cle]));
    });
  });

  return allerRetour(workbook);
}

/*Construit un classeur au format inventaire*/
export async function construireInventaire(
  produits : ProduitInventaire[],
  options : { colonnesAbsentes? : string[] } = {}
) : Promise<ExcelJS.Workbook> {

  const absentes = options.colonnesAbsentes || [];
  const ordre : { titre : string, valeur : (p : ProduitInventaire) => any }[] = [
    { titre: 'Favori',                          valeur: () => false },
    { titre: 'Nom',                             valeur: (p : ProduitInventaire) => nul(p.nom) },
    { titre: 'Référence interne',               valeur: (p : ProduitInventaire) => nul(p.ref) },
    { titre: 'Étiquettes',                      valeur: (p : ProduitInventaire) => nul(p.etiquettes) },
    { titre: 'Prix de vente',                   valeur: (p : ProduitInventaire) => nul(p.prix) },
    { titre: 'Taxes de vente',                  valeur: (p : ProduitInventaire) => nul(p.taxes) },
    { titre: 'Catégorie de produits',           valeur: (p : ProduitInventaire) => nul(p.famille) },
    { titre: 'Quantité disponible',             valeur: (p : ProduitInventaire) => nul(p.dispo) },
    { titre: 'Quantité prévue',                 valeur: (p : ProduitInventaire) => nul(p.prevu) },
    { titre: 'Activité exception décoration',   valeur: () => null },
  ].filter(c => absentes.indexOf(c.titre) === -1);

  const workbook = new ExcelJS.Workbook();
  const feuille = workbook.addWorksheet('Sheet1');
  feuille.addRow(ordre.map(c => c.titre));
  produits.forEach(p => feuille.addRow(ordre.map(c => c.valeur(p))));

  return allerRetour(workbook);
}

/*Relit un classeur généré par le service pour vérifier son contenu*/
export async function relireBuffer(buffer : any) : Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet(1);
}

/*Toutes les lignes d'une feuille sous forme de tableaux de valeurs simples*/
export function lignesDe(feuille : ExcelJS.Worksheet) : any[][] {
  const lignes : any[][] = [];
  feuille.eachRow(row => {
    const valeurs : any[] = [];
    for (let col = 1; col <= feuille.columnCount; col++) {
      const v = row.getCell(col).value;
      valeurs.push(v === undefined ? null : v);
    }
    lignes.push(valeurs);
  });
  return lignes;
}

function nul(valeur : any) : any {
  return valeur === undefined ? null : valeur;
}

// ─── Jeu de données standard ────────────────────────────────────────────────
// Couvre : 2 factures pour un même client, un produit répété dans une même
// facture, un avoir (quantité négative), de l'alcool, et un produit absent
// de l'inventaire.

export const FACTURES_STANDARD : FactureFixture[] = [
  {
    numero: 'INV/2026/0001', codeClient: '1001', nomClient: 'Trattoria Uno',
    lignes: [
      { codeProduit: '605', nomProduit: 'GRAPPA TEST 0.70', famille: FAMILLE.GRAPPA, qte: 6, ref: 'GRAP' },
    ],
  },
  {
    numero: 'INV/2026/0002', codeClient: '1002', nomClient: 'Pizzeria Due',
    lignes: [
      { codeProduit: '490', nomProduit: 'CHIARETTO TEST 1.5LT', famille: FAMILLE.VIN, qte: 36, ref: 'CHI15' },
      { codeProduit: '770', nomProduit: 'SCAMPI TEST 1KG', famille: FAMILLE.POISSON, qte: 10, ref: 'SCAM' },
      { codeProduit: '683', nomProduit: 'ORECCHIETTE TEST 1KG', famille: FAMILLE.PATES_FRAICHES, qte: 6, ref: 'OREC' },
      { codeProduit: '936', nomProduit: 'ARANCINI TEST 1KG', famille: FAMILLE.VIVA, qte: 3, ref: 'ARAXL' },
    ],
  },
  {
    numero: 'INV/2026/0003', codeClient: '1001', nomClient: 'Trattoria Uno',
    lignes: [
      { codeProduit: '770', nomProduit: 'SCAMPI TEST 1KG', famille: FAMILLE.POISSON, qte: 20, ref: 'SCAM' },
      { codeProduit: '770', nomProduit: 'SCAMPI TEST 1KG', famille: FAMILLE.POISSON, qte: 5, ref: 'SCAM' },
      { codeProduit: '431', nomProduit: 'AMARONE TEST 0.75', famille: FAMILLE.VIN, qte: -1, ref: 'AMASC' },
    ],
  },
];

export const INVENTAIRE_STANDARD : ProduitInventaire[] = [
  { nom: 'SCAMPI TEST 1KG',      ref: 'SCAM',  etiquettes: 'Poissons',        prix: 30,   taxes: '6%', famille: FAMILLE.POISSON,        dispo: 100, prevu: 110 },
  { nom: 'ORECCHIETTE TEST 1KG', ref: 'OREC',  etiquettes: 'Pâtes Fraiches',  prix: 8.5,  taxes: '6%', famille: FAMILLE.PATES_FRAICHES, dispo: 50,  prevu: 50 },
  { nom: 'PRODUIT NON VENDU',    ref: 'ZZZZ',  etiquettes: 'Divers',          prix: 1,    taxes: '6%', famille: FAMILLE.PATES_SURG,     dispo: 7,   prevu: 8 },
  { nom: 'PRODUIT SANS REF',     ref: null,    etiquettes: 'Verdure',         prix: 10.5, taxes: '6%', famille: null,                   dispo: 3,   prevu: 3 },
  { nom: 'AMARONE TEST 0.75',    ref: 'AMASC', etiquettes: 'Vins',            prix: 49.5, taxes: '21%',famille: FAMILLE.VIN,            dispo: 12,  prevu: 12 },
];

import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs' ;

import { UpdateInventaireService, TotalReference } from './update-inventaire.service';
import { SortExcelService } from './sort-excel.service';
import { Commande } from './commande';
import {
  construireEcritureComptable, construireInventaire, relireBuffer, lignesDe,
  FAMILLE, FACTURES_STANDARD, INVENTAIRE_STANDARD,
  FactureFixture, ProduitInventaire,
} from './testing/excel-fixtures';

describe('UpdateInventaireService', () => {
  let service : UpdateInventaireService;
  let sortExcel : SortExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateInventaireService);
    sortExcel = TestBed.inject(SortExcelService);
    sortExcel.setResetCallback(() => {});
  });

  /*Construit la map de factures comme le fait le composant après un import*/
  async function chargerFactures(factures : FactureFixture[]) : Promise<Map<string, Commande>> {
    const workbook = await construireEcritureComptable(factures);
    const map : Map<string, Commande> = new Map();
    sortExcel.sortExcel(workbook.getWorksheet(1), map, { add: () => {} }, new Map());
    return map;
  }

  /*Neutralise le téléchargement et récupère le classeur produit*/
  function interceptTelechargement() {
    const capture : { blob : Blob | null, nom : string } = { blob: null, nom: '' };
    const vraiCreateElement = document.createElement.bind(document);

    spyOn(document, 'createElement').and.callFake((balise : string) => {
      const element : any = vraiCreateElement(balise);
      if (balise === 'a') {
        element.click = () => { capture.nom = element.download; };
      }
      return element;
    });
    spyOn(URL, 'createObjectURL').and.callFake((objet : any) => { capture.blob = objet; return 'blob:test'; });
    spyOn(URL, 'revokeObjectURL').and.stub();

    return capture;
  }

  async function feuilleProduite(capture : { blob : Blob | null }) : Promise<ExcelJS.Worksheet> {
    const buffer = await capture.blob!.arrayBuffer();
    return relireBuffer(buffer);
  }

  /*Retrouve une ligne du fichier produit par sa référence interne (colonne 2)*/
  function ligneParRef(feuille : ExcelJS.Worksheet, ref : string | null) : any[] {
    return lignesDe(feuille).slice(1).find(l => (l[1] === null ? null : String(l[1])) === ref)!;
  }

  it('se crée', () => {
    expect(service).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('totauxParReference', () => {

    it('additionne les quantités d\'une même référence sur plusieurs factures', async () => {
      const totaux = service.totauxParReference(await chargerFactures(FACTURES_STANDARD));
      //SCAM : 10 (facture 2) + 20 + 5 (facture 3)
      expect(totaux.get('SCAM')!.qte).toBe(35);
    });

    it('exclut les alcools et vins', async () => {
      const totaux = service.totauxParReference(await chargerFactures(FACTURES_STANDARD));

      expect(totaux.has('GRAP')).withContext('grappa FA0004').toBeFalse();
      expect(totaux.has('CHI15')).withContext('vin FA0001').toBeFalse();
      expect(totaux.has('AMASC')).withContext('vin FA0001 en avoir').toBeFalse();
      expect(Array.from(totaux.keys()).sort()).toEqual(['ARAXL', 'OREC', 'SCAM']);
    });

    it('conserve le signe négatif d\'un avoir', async () => {
      const totaux = service.totauxParReference(await chargerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [
          { codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 10, ref: 'P1' },
          { codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: -3, ref: 'P1' },
        ],
      }]));

      expect(totaux.get('P1')!.qte).toBe(7);
    });

    it('rapproche les références malgré la casse et les espaces', async () => {
      const totaux = service.totauxParReference(await chargerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [
          { codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 2, ref: 'scam' },
          { codeProduit: '2', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 3, ref: '  SCAM  ' },
        ],
      }]));

      expect(totaux.size).toBe(1);
      expect(totaux.get('SCAM')!.qte).toBe(5);
    });

    it('ignore les lignes sans référence interne', async () => {
      const totaux = service.totauxParReference(await chargerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [
          { codeProduit: '1', nomProduit: 'AVEC', famille: FAMILLE.POISSON, qte: 2, ref: 'A' },
          { codeProduit: '2', nomProduit: 'SANS', famille: FAMILLE.POISSON, qte: 9, ref: null },
        ],
      }]));

      expect(Array.from(totaux.keys())).toEqual(['A']);
    });

    it('arrondit pour éviter les artefacts de calcul flottant', async () => {
      const totaux = service.totauxParReference(await chargerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [
          { codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 0.1, ref: 'P1' },
          { codeProduit: '2', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 0.2, ref: 'P1' },
        ],
      }]));

      expect(totaux.get('P1')!.qte).toBe(0.3);
    });

    it('renvoie une map vide quand aucune facture n\'est chargée', () => {
      expect(service.totauxParReference(new Map()).size).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('genererInventaireMisAJour', () => {
    let capture : { blob : Blob | null, nom : string };
    let inventaire : ExcelJS.Workbook;
    let totaux : Map<string, TotalReference>;

    beforeEach(async () => {
      capture = interceptTelechargement();
      inventaire = await construireInventaire(INVENTAIRE_STANDARD);
      totaux = service.totauxParReference(await chargerFactures(FACTURES_STANDARD));
    });

    it('retire les colonnes Favori et Activité exception décoration', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      expect(lignesDe(feuille)[0]).toEqual([
        'Nom', 'Référence interne', 'Étiquettes', 'Prix de vente',
        'Taxes de vente', 'Catégorie de produits', 'Quantité disponible', 'Quantité prévue',
      ]);
    });

    it('garde tous les produits, vendus ou non', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      expect(lignesDe(feuille).length - 1).toBe(INVENTAIRE_STANDARD.length);
    });

    it('retranche la quantité vendue des deux colonnes de quantité', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      const scam = ligneParRef(feuille, 'SCAM');
      expect(scam[6]).withContext('disponible 100 - 35').toBe(65);
      expect(scam[7]).withContext('prévue 110 - 35').toBe(75);

      const orec = ligneParRef(feuille, 'OREC');
      expect(orec[6]).toBe(44);
      expect(orec[7]).toBe(44);
    });

    it('ne touche pas aux produits absents des factures', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      const zzzz = ligneParRef(feuille, 'ZZZZ');
      expect([zzzz[6], zzzz[7]]).toEqual([7, 8]);
    });

    it('ne touche pas aux produits sans référence interne', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      const sansRef = ligneParRef(feuille, null);
      expect([sansRef[6], sansRef[7]]).toEqual([3, 3]);
    });

    it('ne touche pas à un alcool même s\'il figure dans l\'inventaire', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      const amarone = ligneParRef(feuille, 'AMASC');
      expect([amarone[6], amarone[7]])
        .withContext('l\'avoir sur un vin ne doit pas remonter le stock').toEqual([12, 12]);
    });

    it('recopie les autres colonnes à l\'identique', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const feuille = await feuilleProduite(capture);

      const scam = ligneParRef(feuille, 'SCAM');
      expect(scam.slice(0, 6)).toEqual(['SCAMPI TEST 1KG', 'SCAM', 'Poissons', 30, '6%', FAMILLE.POISSON]);
    });

    it('compte les lignes réellement mises à jour', async () => {
      const resultat = await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      expect(resultat.lignesMisesAJour).withContext('SCAM et OREC').toBe(2);
    });

    it('signale les références facturées absentes de l\'inventaire', async () => {
      const resultat = await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');

      expect(resultat.referencesInconnues.map(r => r.ref)).toEqual(['ARAXL']);
      expect(resultat.referencesInconnues[0].nom).toBe('ARANCINI TEST 1KG');
    });

    it('ne modifie jamais le classeur importé', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');

      const source = inventaire.getWorksheet(1);
      const scam = lignesDe(source).slice(1).find(l => l[2] === 'SCAM')!;
      expect([scam[7], scam[8]])
        .withContext('la source doit garder ses quantités d\'origine').toEqual([100, 110]);
      expect(lignesDe(source)[0].length).withContext('et toutes ses colonnes').toBe(10);
    });

    it('peut être relancé plusieurs fois sans cumuler les déductions', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const premier = ligneParRef(await feuilleProduite(capture), 'SCAM');

      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      const second = ligneParRef(await feuilleProduite(capture), 'SCAM');

      expect(second[6]).toBe(premier[6]);
      expect(second[6]).toBe(65);
    });

    it('nomme le fichier téléchargé', async () => {
      await service.genererInventaireMisAJour(inventaire, totaux, 'mon_inventaire.xlsx');
      expect(capture.nom).toBe('mon_inventaire.xlsx');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('quantités négatives et décimales', () => {
    let capture : { blob : Blob | null, nom : string };

    beforeEach(() => { capture = interceptTelechargement(); });

    async function generer(produits : ProduitInventaire[], factures : FactureFixture[]) {
      const inventaire = await construireInventaire(produits);
      const totaux = service.totauxParReference(await chargerFactures(factures));
      await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      return feuilleProduite(capture);
    }

    it('augmente le stock quand la quantité facturée est négative', async () => {
      const feuille = await generer(
        [{ nom: 'P', ref: 'P1', famille: FAMILLE.POISSON, dispo: 10, prevu: 12 }],
        [{ numero: 'INV/1', codeClient: '1', nomClient: 'C',
           lignes: [{ codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: -4, ref: 'P1' }] }]
      );

      const p = ligneParRef(feuille, 'P1');
      expect([p[6], p[7]]).withContext('10-(-4) et 12-(-4)').toEqual([14, 16]);
    });

    it('laisse le résultat passer sous zéro sans le ramener à 0', async () => {
      const feuille = await generer(
        [{ nom: 'P', ref: 'P1', famille: FAMILLE.POISSON, dispo: 4, prevu: 0 }],
        [{ numero: 'INV/1', codeClient: '1', nomClient: 'C',
           lignes: [{ codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 8, ref: 'P1' }] }]
      );

      const p = ligneParRef(feuille, 'P1');
      expect([p[6], p[7]]).toEqual([-4, -8]);
    });

    it('calcule juste sur des décimales', async () => {
      const feuille = await generer(
        [{ nom: 'P', ref: 'P1', famille: FAMILLE.POISSON, dispo: 146.28, prevu: 150.6 }],
        [{ numero: 'INV/1', codeClient: '1', nomClient: 'C',
           lignes: [{ codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 10.77, ref: 'P1' }] }]
      );

      const p = ligneParRef(feuille, 'P1');
      expect(p[6]).withContext('pas de 135.50999999999999').toBe(135.51);
      expect(p[7]).toBe(139.83);
    });

    it('traite une quantité de stock vide comme 0', async () => {
      const feuille = await generer(
        [{ nom: 'P', ref: 'P1', famille: FAMILLE.POISSON, dispo: null, prevu: null }],
        [{ numero: 'INV/1', codeClient: '1', nomClient: 'C',
           lignes: [{ codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 3, ref: 'P1' }] }]
      );

      const p = ligneParRef(feuille, 'P1');
      expect([p[6], p[7]]).toEqual([-3, -3]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('inventaire mal formé', () => {

    beforeEach(() => { interceptTelechargement(); });

    it('refuse un inventaire sans colonne Référence interne', async () => {
      const inventaire = await construireInventaire(INVENTAIRE_STANDARD,
        { colonnesAbsentes: ['Référence interne'] });

      await expectAsync(service.genererInventaireMisAJour(inventaire, new Map(), 'x.xlsx'))
        .toBeRejectedWithError(/Référence interne/);
    });

    it('refuse un inventaire sans colonne de quantité', async () => {
      const inventaire = await construireInventaire(INVENTAIRE_STANDARD,
        { colonnesAbsentes: ['Quantité disponible', 'Quantité prévue'] });

      await expectAsync(service.genererInventaireMisAJour(inventaire, new Map(), 'x.xlsx'))
        .toBeRejectedWithError(/quantité/i);
    });

    it('accepte un inventaire qui n\'a qu\'une seule colonne de quantité', async () => {
      const capture = interceptTelechargementDejaPose();
      const inventaire = await construireInventaire(
        [{ nom: 'P', ref: 'P1', famille: FAMILLE.POISSON, dispo: 10, prevu: 10 }],
        { colonnesAbsentes: ['Quantité prévue'] });
      const totaux = service.totauxParReference(await chargerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [{ codeProduit: '1', nomProduit: 'P', famille: FAMILLE.POISSON, qte: 4, ref: 'P1' }],
      }]));

      const resultat = await service.genererInventaireMisAJour(inventaire, totaux, 'x.xlsx');
      expect(resultat.lignesMisesAJour).toBe(1);
      expect(capture.blob).not.toBeNull();
    });

    /*Le spy est déjà posé par le beforeEach : on récupère juste la capture*/
    function interceptTelechargementDejaPose() {
      const capture : { blob : Blob | null } = { blob: null };
      (URL.createObjectURL as jasmine.Spy).and.callFake((objet : any) => { capture.blob = objet; return 'blob:test'; });
      return capture;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('nomFichierSortie', () => {

    it('retire l\'extension et ajoute la date du jour', () => {
      const aujourdhui = new Date();
      const jour = ('0' + aujourdhui.getDate()).slice(-2);
      const mois = ('0' + (aujourdhui.getMonth() + 1)).slice(-2);
      const attendu = `inventaire_maj_${jour}-${mois}-${aujourdhui.getFullYear()}.xlsx`;

      expect(service.nomFichierSortie('inventaire.xlsx')).toBe(attendu);
      expect(service.nomFichierSortie('inventaire.XLSX')).toBe(attendu);
      expect(service.nomFichierSortie('inventaire')).toBe(attendu);
    });

    it('reste utilisable si aucun nom n\'est fourni', () => {
      expect(service.nomFichierSortie('')).toMatch(/^inventaire_maj_\d{2}-\d{2}-\d{4}\.xlsx$/);
    });
  });
});

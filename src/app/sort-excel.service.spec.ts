import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs' ;

import { SortExcelService } from './sort-excel.service';
import { Commande } from './commande';
import {
  construireEcritureComptable, COLONNES_FACTURE, FAMILLE,
  FACTURES_STANDARD, FactureFixture, OptionsFacture,
} from './testing/excel-fixtures';

describe('SortExcelService', () => {
  let service : SortExcelService;
  let map : Map<string, Commande>;
  let noms : Map<string, string>;
  let message : { add : jasmine.Spy };
  let resetAppele : boolean;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SortExcelService);

    map = new Map();
    noms = new Map();
    message = { add: jasmine.createSpy('add') };
    resetAppele = false;
    service.setResetCallback(() => { resetAppele = true; });
  });

  /*Lance le tri sur un classeur fabriqué à partir des factures données*/
  async function trier(factures : FactureFixture[], options : OptionsFacture = {}) {
    const workbook = await construireEcritureComptable(factures, options);
    service.sortExcel(workbook.getWorksheet(1), map, message, noms);
  }

  function articlesDe(facture : string) : any[] {
    return Array.from(map.get(facture)!.article.values());
  }

  it('se crée', () => {
    expect(service).toBeTruthy();
  });

  describe('détection des colonnes', () => {

    it('retrouve les colonnes par leur intitulé et non par leur position', async () => {
      await trier(FACTURES_STANDARD);
      expect(message.add).not.toHaveBeenCalled();
      expect(map.size).toBe(3);
    });

    it('refuse le fichier et réinitialise si une colonne obligatoire manque', async () => {
      await trier(FACTURES_STANDARD, { colonnesAbsentes: [COLONNES_FACTURE.numero] });

      expect(message.add).toHaveBeenCalled();
      expect(message.add.calls.mostRecent().args[0].severity).toBe('error');
      expect(resetAppele).withContext('le callback de reset doit être appelé').toBeTrue();
      expect(map.size).toBe(0);
    });

    it('signale chaque colonne obligatoire manquante', async () => {
      const obligatoires = [
        COLONNES_FACTURE.codeClient, COLONNES_FACTURE.nomClient,
        COLONNES_FACTURE.codeProduit, COLONNES_FACTURE.nomProduit,
        COLONNES_FACTURE.famille, COLONNES_FACTURE.qte, COLONNES_FACTURE.numero,
      ];

      for (const colonne of obligatoires) {
        map = new Map(); noms = new Map();
        message = { add: jasmine.createSpy('add') };
        await trier(FACTURES_STANDARD, { colonnesAbsentes: [colonne] });
        expect(message.add).withContext(colonne).toHaveBeenCalled();
        expect(map.size).withContext(colonne).toBe(0);
      }
    });

    it('accepte un fichier sans la colonne Référence interne, qui est facultative', async () => {
      await trier(FACTURES_STANDARD, { colonnesAbsentes: [COLONNES_FACTURE.ref] });

      expect(message.add).not.toHaveBeenCalled();
      expect(map.size).toBe(3);
      expect(articlesDe('INV/2026/0002')[0].ref).toBeNull();
    });
  });

  describe('regroupement', () => {

    it('crée une entrée par facture, pas par client', async () => {
      await trier(FACTURES_STANDARD);

      expect(Array.from(map.keys())).toEqual(['INV/2026/0001', 'INV/2026/0002', 'INV/2026/0003']);
      //le même client a deux factures distinctes
      expect(noms.get('INV/2026/0001')).toBe('Trattoria Uno');
      expect(noms.get('INV/2026/0003')).toBe('Trattoria Uno');
      expect(noms.get('INV/2026/0002')).toBe('Pizzeria Due');
    });

    it('rattache toutes les lignes à leur facture', async () => {
      await trier(FACTURES_STANDARD);

      expect(map.get('INV/2026/0001')!.article.size).toBe(1);
      expect(map.get('INV/2026/0002')!.article.size).toBe(4);
      expect(map.get('INV/2026/0003')!.article.size).toBe(3);
    });

    it('propage le client sur les lignes de continuation', async () => {
      await trier(FACTURES_STANDARD);
      //le fixture ne renseigne le client que sur la 1re ligne de chaque facture
      expect(noms.get('INV/2026/0002')).toBe('Pizzeria Due');
    });

    it('conserve les deux lignes quand un produit apparaît deux fois dans la même facture', async () => {
      await trier(FACTURES_STANDARD);

      const scampis = articlesDe('INV/2026/0003').filter(a => a.ref === 'SCAM');
      expect(scampis.length).withContext('les 2 lignes SCAM doivent être gardées').toBe(2);
      expect(scampis.map(a => a.qte).sort((a, b) => a - b)).toEqual([5, 20]);
    });

    it('conserve les quantités négatives des avoirs', async () => {
      await trier(FACTURES_STANDARD);

      const avoir = articlesDe('INV/2026/0003').find(a => a.ref === 'AMASC');
      expect(avoir.qte).toBe(-1);
    });

    it('lit la référence interne, le nom et la famille de chaque ligne', async () => {
      await trier(FACTURES_STANDARD);

      const ligne = articlesDe('INV/2026/0002').find(a => a.ref === 'OREC');
      expect(ligne.nom).toBe('ORECCHIETTE TEST 1KG');
      expect(ligne.famille).toBe(FAMILLE.PATES_FRAICHES);
      expect(ligne.qte).toBe(6);
    });
  });

  describe('tolérance aux variantes d\'export', () => {

    it('accepte le numéro de facture répété sur chaque ligne (export actuel)', async () => {
      await trier(FACTURES_STANDARD, { numeroSurChaqueLigne: true });
      expect(map.get('INV/2026/0002')!.article.size).toBe(4);
    });

    it('accepte le numéro de facture sur la première ligne seulement (ancien export)', async () => {
      await trier(FACTURES_STANDARD, { numeroSurChaqueLigne: false });

      expect(map.size).toBe(3);
      expect(map.get('INV/2026/0002')!.article.size)
        .withContext('le numéro doit être propagé aux lignes suivantes').toBe(4);
    });

    it('accepte le client répété sur chaque ligne', async () => {
      await trier(FACTURES_STANDARD, { clientSurPremiereLigneSeulement: false });

      expect(map.size).toBe(3);
      expect(noms.get('INV/2026/0002')).toBe('Pizzeria Due');
    });
  });

  describe('lignes particulières', () => {

    it('ignore les lignes sans produit (section, note, écriture sans article)', async () => {
      await trier([{
        numero: 'INV/2026/9001', codeClient: '1', nomClient: 'Client',
        lignes: [
          { codeProduit: '1', nomProduit: 'VRAI PRODUIT', famille: FAMILLE.POISSON, qte: 2, ref: 'A' },
          { codeProduit: null, nomProduit: null, famille: null, qte: null, ref: null },
        ],
      }]);

      expect(map.get('INV/2026/9001')!.article.size)
        .withContext('la ligne sans produit ne doit pas créer d\'article').toBe(1);
    });

    it('accepte les quantités décimales sans les altérer', async () => {
      await trier([{
        numero: 'INV/2026/9002', codeClient: '1', nomClient: 'Client',
        lignes: [{ codeProduit: '1', nomProduit: 'CALAMARI', famille: FAMILLE.POISSON, qte: 10.77, ref: 'CALA' }],
      }]);

      expect(articlesDe('INV/2026/9002')[0].qte).toBe(10.77);
    });

    it('ne garde rien quand le fichier ne contient que l\'en-tête', async () => {
      await trier([]);
      expect(map.size).toBe(0);
      expect(message.add).not.toHaveBeenCalled();
    });
  });
});

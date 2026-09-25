import { TestBed } from '@angular/core/testing';
import * as ExcelJS from 'exceljs' ;

import { SortExcelService } from './sort-excel.service';
import { Commande } from './commande';
import {
  construireEcritureComptable, construireTourneeDevis,
  COLONNES_FACTURE, COLONNES_TOURNEE, FAMILLE,
  FACTURES_STANDARD, COMMANDES_STANDARD, FactureFixture, OptionsFacture,
} from './testing/excel-fixtures';
import { ECRITURE_COMPTABLE, TOURNEE_DEVIS } from './formats-fichier';

describe('SortExcelService', () => {
  let service : SortExcelService;
  let map : Map<string, Commande>;
  let noms : Map<string, string>;
  let message : { add : jasmine.Spy };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SortExcelService);

    map = new Map();
    noms = new Map();
    message = { add: jasmine.createSpy('add') };
  });

  /*Lance le tri sur un classeur fabriqué à partir des factures données*/
  async function trier(factures : FactureFixture[], options : OptionsFacture = {}) {
    const workbook = await construireEcritureComptable(factures, options);
    return service.sortExcel(workbook.getWorksheet(1), map, message, noms);
  }

  /*Idem avec la nomenclature « Tournée devis »*/
  async function trierTournee(commandes : FactureFixture[], options : OptionsFacture = {}) {
    const workbook = await construireTourneeDevis(commandes, options);
    return service.sortExcel(workbook.getWorksheet(1), map, message, noms);
  }

  function articlesDe(facture : string) : any[] {
    return Array.from(map.get(facture)!.article.values());
  }

  /*Contenu complet de la map sous forme comparable, pour confronter deux imports*/
  function resume(rangee : Map<string, Commande>) : any[] {
    return Array.from(rangee.entries()).map(([piece, commande]) => [piece,
      Array.from(commande.article.entries())
        .map(([code, ligne]) => [code, ligne.qte, ligne.nom, ligne.famille, ligne.ref])]);
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
      expect(map.size).withContext('rien n’est rangé depuis un fichier refusé').toBe(0);
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

  // ─────────────────────────────────────────────────────────────────────────
  describe('format « Tournée devis »', () => {

    it('reconnaît le format au seul vu des intitulés de colonnes', async () => {
      const format = await trierTournee(COMMANDES_STANDARD);

      expect(format).toBe(TOURNEE_DEVIS);
    });

    it('reconnaît toujours l\'écriture comptable', async () => {
      expect(await trier(FACTURES_STANDARD)).toBe(ECRITURE_COMPTABLE);
    });

    it('crée une entrée par référence commande', async () => {
      await trierTournee(COMMANDES_STANDARD);

      expect(Array.from(map.keys())).toEqual(['S00891', 'S00892', 'S00893']);
    });

    it('distingue les commandes d\'un client unique, qui ne peut pas les distinguer', async () => {
      await trierTournee(COMMANDES_STANDARD);

      //tout le fichier porte le même client : seule la référence commande sépare
      expect(map.size).toBe(3);
      expect(Array.from(noms.values())).toEqual(['PRIVE BON', 'PRIVE BON', 'PRIVE BON']);
    });

    it('rattache une ligne sans référence à la dernière commande référencée', async () => {
      await trierTournee(COMMANDES_STANDARD);

      //l'export ne référence que la 1re ligne de chaque commande
      expect(map.get('S00891')!.article.size).toBe(2);
      expect(map.get('S00892')!.article.size).toBe(2);
      expect(map.get('S00893')!.article.size).toBe(2);
    });

    it('accepte aussi la référence commande répétée sur chaque ligne', async () => {
      await trierTournee(COMMANDES_STANDARD, { numeroSurChaqueLigne: true });

      expect(Array.from(map.keys())).toEqual(['S00891', 'S00892', 'S00893']);
      expect(map.get('S00893')!.article.size).toBe(2);
    });

    it('accepte le client répété sur chaque ligne', async () => {
      await trierTournee(COMMANDES_STANDARD, { clientSurPremiereLigneSeulement: false });

      expect(map.size).toBe(3);
      expect(noms.get('S00892')).toBe('PRIVE BON');
    });

    it('extrait la référence interne des crochets et la retire du nom', async () => {
      await trierTournee(COMMANDES_STANDARD);

      const ligne = articlesDe('S00893').find(a => a.ref === 'OREC');
      expect(ligne.nom).withContext('sans le préfixe [OREC]').toBe('ORECCHIETTE TEST 1KG');
      expect(ligne.famille).toBe(FAMILLE.PATES_FRAICHES);
      expect(ligne.qte).toBe(8);
    });

    it('garde le nom entier quand le produit n\'a pas de crochets', async () => {
      await trierTournee([{
        numero: 'S00900', codeClient: '4028', nomClient: 'PRIVE BON',
        lignes: [{ codeProduit: '680', nomProduit: 'OLIO TEST 5LT', famille: FAMILLE.VERDURE, qte: 1 }],
      }]);

      const ligne = articlesDe('S00900')[0];
      expect(ligne.nom).toBe('OLIO TEST 5LT');
      expect(ligne.ref).toBeNull();
    });

    it('conserve les deux lignes d\'un produit commandé sur deux commandes', async () => {
      await trierTournee(COMMANDES_STANDARD);

      //GRIP est sur S00891 et S00892 : une ligne dans chaque commande
      expect(articlesDe('S00891').filter(a => a.ref === 'GRIP').length).toBe(1);
      expect(articlesDe('S00892').filter(a => a.ref === 'GRIP').length).toBe(1);
    });

    it('donne exactement le même résultat que l\'écriture comptable', async () => {
      //même jeu de données écrit dans les deux nomenclatures : les deux imports
      //doivent être interchangeables, c'est tout l'intérêt du préfixe [REF]
      await trier(FACTURES_STANDARD);
      const parEcriture = resume(map);

      map = new Map(); noms = new Map();
      await trierTournee(FACTURES_STANDARD);

      expect(resume(map)).toEqual(parEcriture);
    });

    it('refuse un fichier dont la référence commande manque', async () => {
      await trierTournee(COMMANDES_STANDARD, { colonnesAbsentes: [COLONNES_TOURNEE.numero] });

      expect(message.add.calls.mostRecent().args[0].severity).toBe('error');
      expect(map.size).toBe(0);
    });

    it('nomme la colonne manquante du format le plus proche', async () => {
      await trierTournee(COMMANDES_STANDARD, { colonnesAbsentes: [COLONNES_TOURNEE.qte] });

      const detail = message.add.calls.mostRecent().args[0].detail;
      expect(detail).toContain('Tournée devis');
      expect(detail).toContain(COLONNES_TOURNEE.qte);
    });

    it('renvoie null sur un fichier qui ne correspond à aucun format', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Sheet1').addRow(['Colonne A', 'Colonne B']);

      expect(service.sortExcel(workbook.getWorksheet(1), map, message, noms)).toBeNull();
      expect(message.add.calls.mostRecent().args[0].severity).toBe('error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('produits sans catégorie', () => {

    it('avertit des produits qui n\'iront dans aucune chambre', async () => {
      await trierTournee(COMMANDES_STANDARD);

      const alerte = message.add.calls.mostRecent().args[0];
      expect(alerte.severity).toBe('warn');
      expect(alerte.detail).toContain('OLIO TEST 5LT');
      expect(alerte.detail).toContain('1 produit(s)');
    });

    it('garde malgré tout la ligne dans la commande', async () => {
      await trierTournee(COMMANDES_STANDARD);

      const ligne = articlesDe('S00893').find(a => a.ref === 'OLI5');
      expect(ligne).withContext('visible dans le détail de la commande').toBeDefined();
      expect(ligne.qte).toBe(1);
    });

    it('avertit aussi sur une écriture comptable', async () => {
      await trier([{
        numero: 'INV/2026/9003', codeClient: '1', nomClient: 'Client',
        lignes: [{ codeProduit: '1', nomProduit: 'PRODUIT SANS FAMILLE', famille: null, qte: 1, ref: 'X' }],
      }]);

      expect(message.add.calls.mostRecent().args[0].detail).toContain('PRODUIT SANS FAMILLE');
    });

    it('ne compte qu\'une fois un produit sans catégorie commandé plusieurs fois', async () => {
      await trierTournee([
        {
          numero: 'S00901', codeClient: '4028', nomClient: 'PRIVE BON',
          lignes: [{ codeProduit: '680', nomProduit: 'OLIO TEST 5LT', famille: null, qte: 1, ref: 'OLI5' }],
        },
        {
          numero: 'S00902', codeClient: '4028', nomClient: 'PRIVE BON',
          lignes: [{ codeProduit: '680', nomProduit: 'OLIO TEST 5LT', famille: null, qte: 2, ref: 'OLI5' }],
        },
      ]);

      expect(message.add.calls.mostRecent().args[0].detail).toContain('1 produit(s)');
    });

    it('n\'avertit pas quand toutes les lignes ont une catégorie', async () => {
      await trier(FACTURES_STANDARD);
      expect(message.add).not.toHaveBeenCalled();
    });
  });
});

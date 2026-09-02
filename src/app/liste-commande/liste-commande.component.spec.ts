import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import * as ExcelJS from 'exceljs' ;

import { ListeCommandeComponent } from './liste-commande.component';
import { GeneratePdfService } from '../generate-pdf.service';
import {
  construireEcritureComptable, construireInventaire, relireBuffer, lignesDe,
  FAMILLE, FACTURES_STANDARD, INVENTAIRE_STANDARD, FactureFixture,
} from '../testing/excel-fixtures';

describe('ListeCommandeComponent', () => {
  let component : ListeCommandeComponent;
  let fixture : ComponentFixture<ListeCommandeComponent>;
  let generatePdf : GeneratePdfService;
  let messages : { severity : string, summary : string, detail : string }[];

  /*Contenu des 6 ensembles envoyés au PDF, figé au moment de l'appel :
  le composant les vide juste après.*/
  let envoyeAuPdf : any[][][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListeCommandeComponent],
      imports: [CommonModule, DragDropModule],
      providers: [MessageService, ConfirmationService],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ListeCommandeComponent);
    component = fixture.componentInstance;
    generatePdf = TestBed.inject(GeneratePdfService);

    messages = [];
    spyOn(TestBed.inject(MessageService), 'add').and.callFake((m : any) => { messages.push(m); });

    envoyeAuPdf = [];
    spyOn(generatePdf, 'generatePdf').and.callFake((...ensembles : any[]) => {
      envoyeAuPdf = ensembles.map(e => Array.from(e as Set<any[]>).map(ligne => ligne.slice()));
    });

    fixture.detectChanges();
  });

  // ─── outils ──────────────────────────────────────────────────────────────

  async function fichier(workbook : ExcelJS.Workbook, nom : string) : Promise<any> {
    const buffer = await workbook.xlsx.writeBuffer();
    const f = new File([buffer as any], nom);
    return { currentTarget: { files: [f] }, target: { files: [f] } };
  }

  async function importerFactures(factures : FactureFixture[] = FACTURES_STANDARD) {
    await component.readAndSortExcel(await fichier(await construireEcritureComptable(factures), 'factures.xlsx'));
  }

  async function importerInventaire(produits = INVENTAIRE_STANDARD) {
    await component.importerInventaire(await fichier(await construireInventaire(produits), 'inventaire.xlsx'));
  }

  /*Neutralise le téléchargement et capture le classeur produit*/
  function interceptTelechargement() {
    const capture : { blob : Blob | null, nom : string } = { blob: null, nom: '' };
    const vraiCreateElement = document.createElement.bind(document);

    spyOn(document, 'createElement').and.callFake((balise : string) => {
      const element : any = vraiCreateElement(balise);
      if (balise === 'a') element.click = () => { capture.nom = element.download; };
      return element;
    });
    spyOn(URL, 'createObjectURL').and.callFake((objet : any) => { capture.blob = objet; return 'blob:test'; });
    spyOn(URL, 'revokeObjectURL').and.stub();
    return capture;
  }

  /*Trie [qte, nom] par nom pour comparer sans dépendre de l'ordre d'insertion*/
  function parNom(lignes : any[][]) : any[][] {
    return lignes.slice().sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }

  /*ConfirmationService est déclaré dans les providers du composant : il faut
  donc l'injecteur du composant, pas celui du TestBed.*/
  function accepterLaConfirmation() {
    const confirmation = fixture.debugElement.injector.get(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((options : any) => {
      options.accept();
      return confirmation;
    });
  }

  const VINS = 0, POISSONS = 1, GLACES_VIVA = 2, PATES_SURG = 3, PATES_FRAICHES = 4, DESSERTS = 5;

  // ─────────────────────────────────────────────────────────────────────────
  it('se crée', () => {
    expect(component).toBeTruthy();
  });

  describe('import des factures', () => {

    it('remplit la liste avec une entrée par facture', async () => {
      await importerFactures();

      expect(component.clients).toEqual(['INV/2026/0001', 'INV/2026/0002', 'INV/2026/0003']);
      expect(component.clients_nom_map.get('INV/2026/0001')).toBe('Trattoria Uno');
    });

    it('active les boutons après un import réussi', async () => {
      expect(component.isButtonDisabled).toBeTrue();
      await importerFactures();
      expect(component.isButtonDisabled).toBeFalse();
    });

    it('ne duplique rien si on réimporte sans réinitialiser', async () => {
      await importerFactures();
      await importerFactures();

      expect(component.clients.length).withContext('3 factures, pas 6').toBe(3);
      expect(component.map.size).toBe(3);
    });

    it('remet les factures déjà triées en tournée dans la première colonne', async () => {
      await importerFactures();
      component.tournee1.push(component.clients.shift());
      expect(component.tournee1.length).toBe(1);

      await importerFactures();

      expect(component.tournee1.length).withContext('les tournées sont réinitialisées').toBe(0);
      expect(component.clients.length).toBe(3);
    });

    it('ne fait rien si aucun fichier n\'est choisi', async () => {
      await component.readAndSortExcel({ currentTarget: { files: [] } });
      expect(component.map.size).toBe(0);
    });

    it('conserve l\'inventaire déjà importé', async () => {
      await importerInventaire();
      await importerFactures();

      expect(component.inventaire).not.toBeNull();
      expect(component.nomInventaire).toBe('inventaire.xlsx');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('total produits', () => {

    it('exclut les alcools et vins', async () => {
      await importerFactures();
      component.computeTotalItems();

      expect(envoyeAuPdf[VINS]).withContext('aucun vin dans le total').toEqual([]);
    });

    it('additionne les quantités d\'un même produit sur toutes les factures', async () => {
      await importerFactures();
      component.computeTotalItems();

      //SCAMPI : 10 + 20 + 5
      expect(envoyeAuPdf[POISSONS]).toEqual([[35, 'SCAMPI TEST 1KG']]);
    });

    it('range chaque famille dans la bonne chambre', async () => {
      await importerFactures();
      component.computeTotalItems();

      expect(envoyeAuPdf[POISSONS]).toEqual([[35, 'SCAMPI TEST 1KG']]);
      expect(envoyeAuPdf[PATES_FRAICHES]).toEqual([[6, 'ORECCHIETTE TEST 1KG']]);
      expect(envoyeAuPdf[GLACES_VIVA]).toEqual([[3, 'ARANCINI TEST 1KG']]);
      expect(envoyeAuPdf[PATES_SURG]).toEqual([]);
      expect(envoyeAuPdf[DESSERTS]).toEqual([]);
    });

    it('couvre toutes les familles non alcoolisées', async () => {
      await importerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [
          { codeProduit: '1', nomProduit: 'PATE SURG',    famille: FAMILLE.PATES_SURG,     qte: 1, ref: 'A' },
          { codeProduit: '2', nomProduit: 'POISSON',      famille: FAMILLE.POISSON,        qte: 2, ref: 'B' },
          { codeProduit: '3', nomProduit: 'VERDURE',      famille: FAMILLE.VERDURE,        qte: 3, ref: 'C' },
          { codeProduit: '4', nomProduit: 'DESSERT',      famille: FAMILLE.DESSERT,        qte: 4, ref: 'D' },
          { codeProduit: '5', nomProduit: 'VIVA',         famille: FAMILLE.VIVA,           qte: 5, ref: 'E' },
          { codeProduit: '6', nomProduit: 'PATE FRAICHE', famille: FAMILLE.PATES_FRAICHES, qte: 6, ref: 'F' },
          { codeProduit: '7', nomProduit: 'GLACE',        famille: FAMILLE.GLACE,          qte: 7, ref: 'G' },
          { codeProduit: '8', nomProduit: 'PORCINI',      famille: FAMILLE.PORCINI,        qte: 8, ref: 'H' },
        ],
      }]);
      component.computeTotalItems();

      expect(envoyeAuPdf[PATES_SURG]).toEqual([[1, 'PATE SURG']]);
      expect(envoyeAuPdf[POISSONS]).toEqual([[2, 'POISSON']]);
      expect(parNom(envoyeAuPdf[DESSERTS])).toEqual([[4, 'DESSERT'], [3, 'VERDURE']]);
      expect(parNom(envoyeAuPdf[GLACES_VIVA])).toEqual([[7, 'GLACE'], [8, 'PORCINI'], [5, 'VIVA']]);
      expect(envoyeAuPdf[PATES_FRAICHES]).toEqual([[6, 'PATE FRAICHE']]);
    });

    it('vide les ensembles après génération pour ne pas cumuler d\'un clic à l\'autre', async () => {
      await importerFactures();
      component.computeTotalItems();
      component.computeTotalItems();

      expect(envoyeAuPdf[POISSONS]).withContext('toujours 35, pas 70').toEqual([[35, 'SCAMPI TEST 1KG']]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('impression par tournée', () => {

    it('garde les vins, contrairement au total produits', async () => {
      await importerFactures();
      await component.imprimer(1);

      expect(parNom(envoyeAuPdf[VINS]))
        .toEqual([[-1, 'AMARONE TEST 0.75'], [36, 'CHIARETTO TEST 1.5LT'], [6, 'GRAPPA TEST 0.70']]);
    });

    it('liste chaque ligne séparément sans les additionner', async () => {
      await importerFactures();
      await component.imprimer(1);

      expect(envoyeAuPdf[POISSONS].length).withContext('3 lignes SCAMPI distinctes').toBe(3);
      expect(envoyeAuPdf[POISSONS].map(l => l[0]).sort((a, b) => a - b)).toEqual([5, 10, 20]);
    });

    it('n\'imprime que les factures de la tournée demandée', async () => {
      await importerFactures();
      //on déplace la 2e facture en tournée 2
      component.tournee1.push(component.clients.splice(1, 1)[0]);

      await component.imprimer(2);

      expect(envoyeAuPdf[POISSONS]).toEqual([[10, 'SCAMPI TEST 1KG']]);
      expect(envoyeAuPdf[VINS]).toEqual([[36, 'CHIARETTO TEST 1.5LT']]);
    });

    it('produit un PDF vide si la tournée ne contient rien', async () => {
      await importerFactures();
      await component.imprimer(3);

      expect(envoyeAuPdf.every(e => e.length === 0)).toBeTrue();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('détail et suppression', () => {

    it('affiche le détail d\'une facture', async () => {
      await importerFactures();
      component.developperFacture('INV/2026/0002');

      expect(component.visible).toBeTrue();
      expect(component.stringAffichage).toContain('10 SCAMPI TEST 1KG');
      expect(component.stringAffichage).toContain('6 ORECCHIETTE TEST 1KG');
    });

    it('supprime une facture de la map et des trois listes', async () => {
      await importerFactures();
      accepterLaConfirmation();

      component.deleteClient('INV/2026/0002');

      expect(component.map.has('INV/2026/0002')).toBeFalse();
      expect(component.clients).toEqual(['INV/2026/0001', 'INV/2026/0003']);
    });

    it('exclut du total produits une facture supprimée', async () => {
      await importerFactures();
      accepterLaConfirmation();

      component.deleteClient('INV/2026/0003'); //contient 20 + 5 SCAMPI
      component.computeTotalItems();

      expect(envoyeAuPdf[POISSONS]).toEqual([[10, 'SCAMPI TEST 1KG']]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('mise à jour de l\'inventaire', () => {

    it('reste impossible tant que les deux fichiers ne sont pas chargés', async () => {
      expect(component.inventaireMajPossible).toBeFalse();

      await importerFactures();
      expect(component.inventaireMajPossible).withContext('inventaire manquant').toBeFalse();

      await importerInventaire();
      expect(component.inventaireMajPossible).toBeTrue();
    });

    it('ne fait rien si on l\'appelle sans les deux fichiers', async () => {
      const capture = interceptTelechargement();
      await importerFactures();

      await component.mettreAJourInventaire();

      expect(capture.blob).toBeNull();
    });

    it('génère un fichier avec les quantités déduites', async () => {
      const capture = interceptTelechargement();
      await importerFactures();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const feuille = await relireBuffer(await capture.blob!.arrayBuffer());
      const lignes = lignesDe(feuille);
      const scam = lignes.find(l => l[1] === 'SCAM')!;

      expect(lignes[0].length).withContext('2 colonnes retirées').toBe(8);
      expect([scam[6], scam[7]]).toEqual([65, 75]);
    });

    it('n\'applique pas les alcools au stock', async () => {
      interceptTelechargement();
      await importerFactures();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const succes = messages.find(m => m.severity === 'success')!;
      expect(succes.detail).withContext('SCAM et OREC seulement').toContain('2 produit(s)');
    });

    it('avertit des références absentes de l\'inventaire', async () => {
      interceptTelechargement();
      await importerFactures();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const alerte = messages.find(m => m.severity === 'warn')!;
      expect(alerte).withContext('ARAXL est absent de l\'inventaire').toBeDefined();
      expect(alerte.detail).toContain('ARAXL');
    });

    it('n\'avertit pas quand toutes les références sont trouvées', async () => {
      interceptTelechargement();
      await importerFactures([{
        numero: 'INV/1', codeClient: '1', nomClient: 'C',
        lignes: [{ codeProduit: '1', nomProduit: 'SCAMPI TEST 1KG', famille: FAMILLE.POISSON, qte: 4, ref: 'SCAM' }],
      }]);
      await importerInventaire();

      await component.mettreAJourInventaire();

      expect(messages.filter(m => m.severity === 'warn').length).toBe(0);
      expect(messages.filter(m => m.severity === 'success').length).toBe(1);
    });

    it('signale un fichier de factures sans référence interne', async () => {
      interceptTelechargement();
      const workbook = await construireEcritureComptable(FACTURES_STANDARD,
        { colonnesAbsentes: ['Lignes de facture/Produit/Référence interne'] });
      await component.readAndSortExcel(await fichier(workbook, 'factures.xlsx'));
      await importerInventaire();

      await component.mettreAJourInventaire();

      const erreur = messages.find(m => m.severity === 'error')!;
      expect(erreur).toBeDefined();
      expect(erreur.detail).toContain('Référence interne');
    });

    it('signale un inventaire sans colonne Référence interne', async () => {
      interceptTelechargement();
      await importerFactures();
      await component.importerInventaire(await fichier(
        await construireInventaire(INVENTAIRE_STANDARD, { colonnesAbsentes: ['Référence interne'] }),
        'inventaire.xlsx'));

      await component.mettreAJourInventaire();

      expect(messages.find(m => m.severity === 'error')!.detail).toContain('Référence interne');
    });

    it('nomme le fichier à partir de celui importé', async () => {
      const capture = interceptTelechargement();
      await importerFactures();
      await importerInventaire();

      await component.mettreAJourInventaire();

      expect(capture.nom).toMatch(/^inventaire_maj_\d{2}-\d{2}-\d{4}\.xlsx$/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('réinitialisation', () => {

    it('vide les factures, les tournées et l\'inventaire', async () => {
      await importerFactures();
      await importerInventaire();

      component.reset();

      expect(component.clients).toEqual([]);
      expect(component.tournee1).toEqual([]);
      expect(component.tournee2).toEqual([]);
      expect(component.map.size).toBe(0);
      expect(component.clients_nom_map.size).toBe(0);
      expect(component.inventaire).toBeNull();
      expect(component.nomInventaire).toBe('');
      expect(component.isButtonDisabled).toBeTrue();
    });

    it('vide le champ de fichier pour qu\'on puisse réimporter le même fichier', async () => {
      fixture.detectChanges();
      const input = document.querySelector('.import-factures') as HTMLInputElement;
      expect(input).withContext('le champ doit exister dans le DOM').not.toBeNull();

      component.reset();
      expect(input.value).toBe('');
    });

    it('permet un nouvel import après réinitialisation', async () => {
      await importerFactures();
      component.reset();
      await importerFactures();

      expect(component.clients.length).toBe(3);
    });
  });
});

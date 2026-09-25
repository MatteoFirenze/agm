import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import * as ExcelJS from 'exceljs' ;

import { ListeCommandeComponent } from './liste-commande.component';
import { GeneratePdfService } from '../generate-pdf.service';
import {
  construireEcritureComptable, construireTourneeDevis, construireInventaire,
  relireBuffer, lignesDe, lignesParTitre,
  FAMILLE, FACTURES_STANDARD, COMMANDES_STANDARD, INVENTAIRE_STANDARD, FactureFixture,
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

  /*Un seul champ de fichiers portant plusieurs classeurs, comme quand
  l'utilisateur sélectionne la facture et le devis d'un coup*/
  async function plusieursFichiers(...classeurs : [ExcelJS.Workbook, string][]) : Promise<any> {
    const liste = await Promise.all(classeurs.map(async ([workbook, nom]) =>
      new File([await workbook.xlsx.writeBuffer() as any], nom)));
    return { currentTarget: { files: liste }, target: { files: liste } };
  }

  async function importerFactures(factures : FactureFixture[] = FACTURES_STANDARD) {
    await component.readAndSortExcel(await fichier(await construireEcritureComptable(factures), 'factures.xlsx'));
  }

  async function importerTournee(commandes : FactureFixture[] = COMMANDES_STANDARD) {
    await component.readAndSortExcel(await fichier(await construireTourneeDevis(commandes), 'tournee.xlsx'));
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

  //intitulés du fichier d'inventaire produit, pour ne pas figer l'ordre des colonnes
  const REF = 'Référence interne', DISPO = 'Quantité disponible', PREVU = 'Quantité prévue';

  /*Le fichier d'inventaire généré, une ligne par produit lue par intitulé*/
  async function inventaireGenere(capture : { blob : Blob | null }) {
    const feuille = await relireBuffer(await capture.blob!.arrayBuffer());
    const produits = lignesParTitre(feuille);
    return {
      titres: lignesDe(feuille)[0],
      parRef: (ref : string) => produits.find(l => String(l[REF]) === ref)!,
    };
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

    it('laisse les fiches déjà réparties dans leur tournée quand on réimporte le fichier', async () => {
      await importerFactures();
      component.tournee1.push(component.clients.shift());

      await importerFactures();

      expect(component.tournee1).withContext('la répartition déjà faite est gardée').toEqual(['INV/2026/0001']);
      expect(component.clients).toEqual(['INV/2026/0002', 'INV/2026/0003']);
    });

    it('retire les pièces qui ont disparu du fichier réimporté', async () => {
      await importerFactures();

      await importerFactures(FACTURES_STANDARD.slice(0, 2));

      expect(component.clients).toEqual(['INV/2026/0001', 'INV/2026/0002']);
      expect(component.map.has('INV/2026/0003')).withContext('absente du nouvel export').toBeFalse();
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

      const inventaire = await inventaireGenere(capture);
      const scam = inventaire.parRef('SCAM');

      expect(inventaire.titres.length).withContext('2 colonnes retirées').toBe(8);
      expect([scam[DISPO], scam[PREVU]]).toEqual([65, 75]);
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
  describe('catalogue produits', () => {

    /*Le bouton du catalogue, retrouvé par son libellé*/
    function boutonCatalogue() : HTMLButtonElement {
      fixture.detectChanges();
      const boutons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
      return boutons.find(b => b.textContent!.includes('Générer le catalogue'))!;
    }

    beforeEach(() => {
      //le logo n'est pas servi pendant les tests : le catalogue doit s'en passer
      spyOn(window, 'fetch').and.rejectWith(new Error('hors ligne'));
    });

    it('n\'est possible qu\'une fois l\'inventaire importé, sans factures', async () => {
      expect(boutonCatalogue().disabled).withContext('rien d\'importé').toBeTrue();

      await importerInventaire();

      expect(boutonCatalogue().disabled).withContext('inventaire seul').toBeFalse();
    });

    it('télécharge le catalogue des articles en stock', async () => {
      const capture = interceptTelechargement();
      await importerInventaire();

      boutonCatalogue().click();
      await fixture.whenStable();

      expect(capture.nom).toBe('catalogue_produits.html');
      const html = await capture.blob!.text();
      expect(html).toContain('SCAMPI TEST 1KG');
      expect(messages.find(m => m.severity === 'success')!.detail).toContain('5 article(s)');
    });

    it('reprend les quantités de l\'inventaire importé, sans déduire les factures', async () => {
      const capture = interceptTelechargement();
      await importerFactures();
      await importerInventaire();

      await component.genererCatalogue();

      const page = new DOMParser().parseFromString(await capture.blob!.text(), 'text/html');
      const scampi = Array.from(page.querySelectorAll('tbody tr')).find(tr => tr.textContent!.includes('SCAMPI'))!;
      expect(scampi.lastElementChild!.textContent).withContext('100 en stock, 35 facturés ignorés').toBe('100');
    });

    it('avertit sans rien télécharger quand aucun article n\'est en stock', async () => {
      const capture = interceptTelechargement();
      await importerInventaire(INVENTAIRE_STANDARD.map(p => ({ ...p, dispo: 0 })));

      await component.genererCatalogue();

      expect(capture.blob).toBeNull();
      expect(messages.find(m => m.severity === 'warn')!.summary).toBe('Catalogue vide');
    });

    it('signale un inventaire sans colonne de prix', async () => {
      interceptTelechargement();
      await component.importerInventaire(await fichier(
        await construireInventaire(INVENTAIRE_STANDARD, { colonnesAbsentes: ['Prix de vente'] }),
        'inventaire.xlsx'));

      await component.genererCatalogue();

      expect(messages.find(m => m.severity === 'error')!.detail).toContain('Prix de vente');
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

  // ─────────────────────────────────────────────────────────────────────────
  describe('import d\'une tournée devis', () => {

    it('reconnaît le format sans que l\'utilisateur ait à le dire', async () => {
      await importerTournee();

      expect(component.fichiers[0].format.nom).toBe('Tournée devis');
      expect(component.fichiers[0].nom).toBe('tournee.xlsx');
      expect(component.isButtonDisabled).toBeFalse();
    });

    it('liste une entrée par référence commande, le client étant le même partout', async () => {
      await importerTournee();

      expect(component.clients).toEqual(['S00891', 'S00892', 'S00893']);
      expect(component.clients_nom_map.get('S00892')).toBe('PRIVE BON');
    });

    it('affiche le détail d\'une commande sans le préfixe de référence', async () => {
      await importerTournee();
      component.developperFacture('S00893');

      expect(component.stringAffichage).toContain('8 ORECCHIETTE TEST 1KG');
      expect(component.stringAffichage).not.toContain('[OREC]');
    });

    it('range les produits dans les bonnes chambres et écarte les vins', async () => {
      await importerTournee();
      component.computeTotalItems();

      expect(envoyeAuPdf[POISSONS]).toEqual([[3, 'SCAMPI TEST 1KG']]);
      expect(envoyeAuPdf[PATES_FRAICHES]).toEqual([[8, 'ORECCHIETTE TEST 1KG']]);
      expect(envoyeAuPdf[VINS]).withContext('les vins sont hors total produits').toEqual([]);
    });

    it('avertit du produit sans catégorie, absent de toutes les listes', async () => {
      await importerTournee();
      component.computeTotalItems();

      const alerte = messages.find(m => m.summary === 'Produits sans catégorie')!;
      expect(alerte.detail).toContain('OLIO TEST 5LT');
      expect(envoyeAuPdf.every(e => e.every(l => l[1] !== 'OLIO TEST 5LT'))).toBeTrue();
    });

    it('déduit du stock les références lues entre crochets', async () => {
      const capture = interceptTelechargement();
      await importerTournee();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const inventaire = await inventaireGenere(capture);

      expect([inventaire.parRef('SCAM')[DISPO], inventaire.parRef('SCAM')[PREVU]])
        .withContext('100/110 moins 3').toEqual([97, 107]);
      expect([inventaire.parRef('OREC')[DISPO], inventaire.parRef('OREC')[PREVU]])
        .withContext('50/50 moins 8').toEqual([42, 42]);
    });

    it('laisse les vins hors de l\'inventaire comme pour une facture', async () => {
      const capture = interceptTelechargement();
      await importerTournee();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const inventaire = await inventaireGenere(capture);
      expect(inventaire.parRef('AMASC')[DISPO]).toBe(12);
      expect(messages.find(m => m.severity === 'success')!.detail).toContain('2 produit(s)');
    });

    it('signale la référence absente de l\'inventaire', async () => {
      interceptTelechargement();
      await importerTournee();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const alerte = messages.find(m => m.summary === "Références introuvables dans l'inventaire")!;
      expect(alerte.detail).toContain('OLI5');
    });

    it('affiche le nom du fichier et le format dans la barre d\'outils', async () => {
      await importerTournee();
      fixture.detectChanges();

      const chip = document.querySelector('.fichier-charge') as HTMLElement;
      expect(chip).withContext('la puce du fichier importé doit être rendue').not.toBeNull();
      expect(chip.textContent).toContain('tournee.xlsx');
      expect(chip.querySelector('.format-detecte')!.textContent!.trim()).toBe('Tournée devis');
    });

    it('retire la puce du fichier à la réinitialisation', async () => {
      await importerTournee();
      component.reset();
      fixture.detectChanges();

      expect(document.querySelector('.format-detecte')).toBeNull();
    });

    it('oublie les fichiers importés à la réinitialisation', async () => {
      await importerTournee();
      component.reset();

      expect(component.fichiers).toEqual([]);
      expect(component.origines.size).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  //Une journée se prépare souvent à partir de deux exports : les factures du
  //jour et la tournée devis du comptoir. Les deux tiennent sur la même planche.
  describe('facture et devis sur la même planche', () => {

    it('ajoute le second fichier aux fiches déjà présentes', async () => {
      await importerFactures();
      await importerTournee();

      expect(component.clients).toEqual(
        ['INV/2026/0001', 'INV/2026/0002', 'INV/2026/0003', 'S00891', 'S00892', 'S00893']);
      expect(component.map.size).toBe(6);
      expect(component.fichiers.map(f => f.nom)).toEqual(['factures.xlsx', 'tournee.xlsx']);
    });

    it('lit les deux fichiers choisis en une seule fois', async () => {
      await component.readAndSortExcel(await plusieursFichiers(
        [await construireEcritureComptable(FACTURES_STANDARD), 'factures.xlsx'],
        [await construireTourneeDevis(COMMANDES_STANDARD), 'tournee.xlsx']));

      expect(component.clients.length).toBe(6);
      expect(component.fichiers.map(f => f.format.nom)).toEqual(['Écriture comptable', 'Tournée devis']);
      expect(component.fichiers.map(f => f.pieces.length)).toEqual([3, 3]);
    });

    it('garde la répartition en tournées déjà faite', async () => {
      await importerFactures();
      component.tournee2.push(component.clients.shift());

      await importerTournee();

      expect(component.tournee2).toEqual(['INV/2026/0001']);
      expect(component.clients).toEqual(['INV/2026/0002', 'INV/2026/0003', 'S00891', 'S00892', 'S00893']);
    });

    it('additionne les deux fichiers dans le total produits', async () => {
      await importerFactures();
      await importerTournee();

      component.computeTotalItems();

      //SCAMPI : 10 + 20 + 5 facturés, 3 commandés
      expect(envoyeAuPdf[POISSONS]).toEqual([[38, 'SCAMPI TEST 1KG']]);
      //ORECCHIETTE : 6 facturés, 8 commandés
      expect(envoyeAuPdf[PATES_FRAICHES]).toEqual([[14, 'ORECCHIETTE TEST 1KG']]);
    });

    it('imprime une tournée qui mélange facture et commande', async () => {
      await importerFactures();
      await importerTournee();
      component.tournee1.push(...component.clients.splice(4, 1)); //S00892
      component.tournee1.push(...component.clients.splice(1, 1)); //INV/2026/0002

      await component.imprimer(2);

      expect(parNom(envoyeAuPdf[VINS]))
        .toEqual([[36, 'CHIARETTO TEST 1.5LT'], [18, 'GRILLO TEST 0.75']]);
      expect(envoyeAuPdf[POISSONS].map(l => l[0]).sort((a, b) => a - b))
        .withContext('les 2 lignes SCAMPI restent distinctes').toEqual([3, 10]);
    });

    it('déduit de l\'inventaire les lignes des deux fichiers', async () => {
      const capture = interceptTelechargement();
      await importerFactures();
      await importerTournee();
      await importerInventaire();

      await component.mettreAJourInventaire();

      const inventaire = await inventaireGenere(capture);
      expect([inventaire.parRef('SCAM')[DISPO], inventaire.parRef('SCAM')[PREVU]])
        .withContext('100 - 38 et 110 - 38').toEqual([62, 72]);
      expect(inventaire.parRef('OREC')[DISPO]).withContext('50 - 14').toBe(36);
    });

    it('étiquette les fiches quand la planche mélange les deux formats', async () => {
      await importerFactures();
      expect(component.formatsMelanges).withContext('un seul format : pas d\'étiquette').toBeFalse();

      await importerTournee();

      expect(component.formatsMelanges).toBeTrue();
      expect(component.provenance('INV/2026/0001')).toBe('Facture');
      expect(component.provenance('S00891')).toBe('Devis');
    });

    it('montre une puce par fichier, avec son format et son nombre de fiches', async () => {
      await importerFactures();
      await importerTournee();
      fixture.detectChanges();

      const puces = Array.from(document.querySelectorAll('.fichier-charge'));
      expect(puces.length).toBe(2);
      expect(puces.map(p => p.querySelector('.format-detecte')!.textContent!.trim()))
        .toEqual(['Écriture comptable', 'Tournée devis']);
      expect(puces[1].querySelector('.fichier-compte')!.textContent!.trim()).toBe('3 fiches');
    });

    it('ne perd pas la journée quand un fichier est refusé', async () => {
      await importerFactures();
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Sheet1').addRow(['Colonne A', 'Colonne B']);

      await component.readAndSortExcel(await fichier(workbook, 'inconnu.xlsx'));

      expect(component.clients.length).withContext('les factures restent en place').toBe(3);
      expect(component.fichiers.length).toBe(1);
      expect(component.isButtonDisabled).toBeFalse();
      expect(messages.find(m => m.severity === 'error')).toBeDefined();
    });

    it('garde la fiche en place quand deux fichiers portent le même numéro de pièce', async () => {
      await importerFactures();

      await component.readAndSortExcel(await fichier(await construireEcritureComptable([{
        numero: 'INV/2026/0001', codeClient: '9', nomClient: 'Autre Client',
        lignes: [{ codeProduit: '1', nomProduit: 'SCAMPI TEST 1KG', famille: FAMILLE.POISSON, qte: 4, ref: 'SCAM' }],
      }]), 'doublon.xlsx'));

      expect(component.clients_nom_map.get('INV/2026/0001')).toBe('Trattoria Uno');
      expect(component.clients.length).toBe(3);
      expect(messages.find(m => m.severity === 'warn')!.detail).toContain('INV/2026/0001');
    });

    it('retire un fichier sans toucher à l\'autre', async () => {
      await importerFactures();
      await importerTournee();

      component.retirerFichier(component.fichiers[0]);

      expect(component.clients).toEqual(['S00891', 'S00892', 'S00893']);
      expect(component.map.size).toBe(3);
      expect(component.fichiers.map(f => f.nom)).toEqual(['tournee.xlsx']);
    });

    it('revient à l\'écran de départ quand le dernier fichier est retiré', async () => {
      await importerTournee();

      component.retirerFichier(component.fichiers[0]);

      expect(component.clients).toEqual([]);
      expect(component.isButtonDisabled).toBeTrue();
      expect(component.prochaineEtape).toBe('importer');
    });

    it('décompte du fichier la fiche retirée par la corbeille', async () => {
      await importerFactures();
      accepterLaConfirmation();

      component.deleteClient('INV/2026/0002');

      expect(component.fichiers[0].pieces).toEqual(['INV/2026/0001', 'INV/2026/0003']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('fichier d\'un format inconnu', () => {

    it('refuse le fichier et laisse les boutons désactivés', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Sheet1').addRow(['Colonne A', 'Colonne B']);

      await component.readAndSortExcel(await fichier(workbook, 'inconnu.xlsx'));

      expect(component.fichiers).toEqual([]);
      expect(component.isButtonDisabled).toBeTrue();
      expect(component.clients).toEqual([]);
      expect(messages.find(m => m.severity === 'error')).toBeDefined();
    });
  });
});

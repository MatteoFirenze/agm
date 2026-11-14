import { TestBed } from '@angular/core/testing';

import { GenerateCatalogueService, GroupeCatalogue } from './generate-catalogue.service';
import { construireInventaire, FAMILLE, INVENTAIRE_STANDARD, ProduitInventaire } from './testing/excel-fixtures';

describe('GenerateCatalogueService', () => {
  let service : GenerateCatalogueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateCatalogueService);
  });

  async function lire(produits : ProduitInventaire[], options : { colonnesAbsentes? : string[] } = {}) : Promise<GroupeCatalogue[]> {
    const workbook = await construireInventaire(produits, options);
    return service.lireInventaire(workbook.getWorksheet(1));
  }

  function produit(nom : string, etiquettes : string | null, dispo : any, prix : any = 10) : ProduitInventaire {
    return { nom, ref: nom, etiquettes, prix, taxes: '6%', famille: FAMILLE.POISSON, dispo, prevu: dispo };
  }

  function groupe(titre : string, nbArticles : number) : GroupeCatalogue {
    return { titre, articles: Array.from({ length: nbArticles }, (_, i) => ({ nom: titre + i, prix: 1, qte: 1 })) };
  }

  /*Neutralise le téléchargement et récupère la page produite*/
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

  it('se crée', () => {
    expect(service).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('lireInventaire', () => {

    it('regroupe les articles par famille, nommées et dans l\'ordre des codes', async () => {
      const groupes = await lire(INVENTAIRE_STANDARD);

      expect(groupes.map(g => g.titre)).toEqual(['Vins', 'Pâtes surgelées', 'Poissons', 'Pâtes fraîches', 'Autres']);
    });

    it('reprend le prix de vente tel quel, sans conversion de taxe', async () => {
      const groupes = await lire(INVENTAIRE_STANDARD);
      const groupe = (titre : string) => groupes.find(g => g.titre === titre)!;

      expect(groupe('Poissons').articles).toEqual([{ nom: 'SCAMPI TEST 1KG', prix: 30, qte: 100 }]);
      expect(groupe('Vins').articles[0].prix).withContext('vin à 21 %').toBe(49.5);
    });

    it('ne tient pas compte des étiquettes', async () => {
      const groupes = await lire([
        { ...produit('SCAMPI', 'Poissons', 1), famille: FAMILLE.POISSON },
        { ...produit('MOULES', 'Crustacés', 1), famille: FAMILLE.POISSON },
        //ajouté à la mise à jour : famille connue, étiquette vide
        { ...produit('ESPADON', null, 0), famille: FAMILLE.POISSON },
      ]);

      expect(groupes).toEqual([{ titre: 'Poissons', articles: [
        { nom: 'ESPADON', prix: 10, qte: 0 }, { nom: 'MOULES', prix: 10, qte: 1 }, { nom: 'SCAMPI', prix: 10, qte: 1 },
      ] }]);
    });

    it('range les articles sans famille dans « Autres », en dernier', async () => {
      const groupes = await lire([
        { ...produit('A', null, 1), famille: null }, { ...produit('B', null, 1), famille: '' },
        { ...produit('C', null, 1), famille: FAMILLE.GLACE },
      ]);

      expect(groupes.map(g => [g.titre, g.articles.map(a => a.nom)])).toEqual([['Glaces', ['C']], ['Autres', ['A', 'B']]]);
    });

    it('garde la valeur Odoo d\'une famille inconnue, après les familles connues', async () => {
      const groupes = await lire([
        { ...produit('X', null, 1), famille: 'FA0099 - FA0099' },
        { ...produit('Y', null, 1), famille: FAMILLE.DESSERT },
      ]);

      expect(groupes.map(g => g.titre)).toEqual(['Desserts', 'FA0099 - FA0099']);
    });

    it('trie les articles par nom dans chaque groupe', async () => {
      const groupes = await lire([produit('CANNOLO', 'Dessert', 1), produit('BABA', 'Dessert', 1), produit('DELIZIA', 'Dessert', 1)]);

      expect(groupes[0].articles.map(a => a.nom)).toEqual(['BABA', 'CANNOLO', 'DELIZIA']);
    });

    it('garde les articles épuisés, négatifs ou sans quantité', async () => {
      const groupes = await lire([
        produit('EN STOCK', 'Poissons', 4), produit('EPUISE', 'Poissons', 0),
        produit('NEGATIF', 'Poissons', -2), produit('SANS QTE', 'Poissons', null),
      ]);

      expect(groupes[0].articles.map(a => [a.nom, a.qte])).toEqual([
        ['EN STOCK', 4], ['EPUISE', 0], ['NEGATIF', -2], ['SANS QTE', 0],
      ]);
    });

    it('garde un groupe entièrement épuisé, à sa place', async () => {
      const groupes = await lire([
        { ...produit('A', null, 1), famille: FAMILLE.DESSERT },
        { ...produit('B', null, 0), famille: FAMILLE.GLACE },
        { ...produit('C', null, -1), famille: FAMILLE.POISSON },
      ]);

      expect(groupes.map(g => g.titre)).toEqual(['Poissons', 'Desserts', 'Glaces']);
    });

    it('garde un article sans prix, prix laissé vide', async () => {
      const groupes = await lire([produit('SANS PRIX', 'Poissons', 1, null), produit('PRIX TEXTE', 'Poissons', 1, 'n/a')]);

      expect(groupes[0].articles).toEqual([
        { nom: 'PRIX TEXTE', prix: null, qte: 1 },
        { nom: 'SANS PRIX', prix: null, qte: 1 },
      ]);
    });

    it('affiche la référence d\'un article sans nom, ignore les lignes vides', async () => {
      const groupes = await lire([
        { ...produit(null as any, 'Poissons', 1), ref: 'ARAXL' },
        produit(null as any, 'Poissons', 1),
      ]);

      expect(groupes[0].articles.map(a => a.nom)).toEqual(['ARAXL']);
    });

    it('conserve les quantités décimales', async () => {
      const groupes = await lire([produit('ESPADON', 'Poissons', 28.35)]);

      expect(groupes[0].articles[0].qte).toBe(28.35);
    });

    it('signale les colonnes indispensables manquantes', async () => {
      await expectAsync(lire(INVENTAIRE_STANDARD, { colonnesAbsentes: ['Prix de vente'] }))
        .toBeRejectedWithError(/Prix de vente/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('repartirEnColonnes', () => {

    it('équilibre les 2 colonnes en gardant l\'ordre des groupes', () => {
      const [gauche, droite] = service.repartirEnColonnes([groupe('A', 3), groupe('B', 3), groupe('C', 3), groupe('D', 3)]);

      expect(gauche.map(g => g.titre)).toEqual(['A', 'B']);
      expect(droite.map(g => g.titre)).toEqual(['C', 'D']);
    });

    it('compte la ligne de titre de chaque groupe dans son poids', () => {
      //poids 11, 2, 2, 2 : total 17, moitié 8,5 — le 1er groupe suffit à la dépasser
      const [gauche, droite] = service.repartirEnColonnes([groupe('A', 10), groupe('B', 1), groupe('C', 1), groupe('D', 1)]);

      expect(gauche.map(g => g.titre)).toEqual(['A']);
      expect(droite.map(g => g.titre)).toEqual(['B', 'C', 'D']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('mise en forme', () => {

    it('affiche les prix avec 2 décimales et une virgule', () => {
      expect(service.formaterPrix(30)).toBe('30,00 €');
      expect(service.formaterPrix(8.5)).toBe('8,50 €');
    });

    it('laisse vide un prix non renseigné', () => {
      expect(service.formaterPrix(null)).toBe('');
    });

    it('affiche les quantités nulles et négatives', () => {
      expect(service.formaterQte(0)).toBe('0');
      expect(service.formaterQte(-2.5)).toBe('-2,50');
    });

    it('affiche les quantités entières sans décimale', () => {
      expect(service.formaterQte(21)).toBe('21');
      expect(service.formaterQte(28.35)).toBe('28,35');
    });

    it('construit une page en 2 colonnes, prix HTVA', async () => {
      const html = service.construireHtml(await lire(INVENTAIRE_STANDARD), null);
      const page = new DOMParser().parseFromString(html, 'text/html');

      expect(page.querySelectorAll('.columns > .col').length).toBe(2);
      expect(Array.from(page.querySelectorAll('.cat-title')).map(t => t.textContent))
        .toEqual(['Vins', 'Pâtes surgelées', 'Poissons', 'Pâtes fraîches', 'Autres']);
      //le « Prix de vente » Odoo est hors TVA : le catalogue le dit et le reprend tel quel
      expect(page.querySelector('thead')!.textContent).toBe('ArticlePrix HTVAQté');
      expect(html).not.toContain('TTC');

      const scampi = Array.from(page.querySelectorAll('tbody tr')).find(tr => tr.textContent!.includes('SCAMPI'))!;
      expect(Array.from(scampi.querySelectorAll('td')).map(td => td.textContent)).toEqual(['SCAMPI TEST 1KG', '30,00 €', '100']);
    });

    it('échappe les caractères HTML des noms', () => {
      const html = service.construireHtml([{ titre: 'Vins & <Spiritueux>', articles: [{ nom: 'A&B <script>', prix: 1, qte: 1 }] }], null);
      const page = new DOMParser().parseFromString(html, 'text/html');

      expect(page.querySelector('script')).toBeNull();
      expect(page.querySelector('.cat-title')!.textContent).toBe('Vins & <Spiritueux>');
      expect(page.querySelector('tbody td')!.textContent).toBe('A&B <script>');
    });

    it('intègre le logo seulement s\'il est fourni', () => {
      expect(service.construireHtml([groupe('A', 1)], 'AQID')).toContain('<img src="data:image/png;base64,AQID"');
      expect(service.construireHtml([groupe('A', 1)], null)).not.toContain('<img');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('genererCatalogue', () => {

    it('télécharge catalogue_produits.html avec le logo intégré', async () => {
      const capture = interceptTelechargement();
      spyOn(window, 'fetch').and.resolveTo(new Response(new Uint8Array([1, 2, 3])));

      const nbArticles = await service.genererCatalogue(await construireInventaire(INVENTAIRE_STANDARD));

      expect(nbArticles).toBe(5);
      expect(capture.nom).toBe('catalogue_produits.html');
      expect(capture.blob!.type).toContain('text/html');
      const html = await capture.blob!.text();
      expect(html).toContain('SCAMPI TEST 1KG');
      expect(html).toContain('data:image/png;base64,AQID');
    });

    it('génère le catalogue même si le logo est introuvable', async () => {
      const capture = interceptTelechargement();
      spyOn(window, 'fetch').and.rejectWith(new Error('hors ligne'));

      await service.genererCatalogue(await construireInventaire(INVENTAIRE_STANDARD));

      const html = await capture.blob!.text();
      expect(html).toContain('SCAMPI TEST 1KG');
      expect(html).not.toContain('<img');
    });

    it('liste aussi les articles épuisés', async () => {
      const capture = interceptTelechargement();
      spyOn(window, 'fetch').and.rejectWith(new Error('hors ligne'));

      const nbArticles = await service.genererCatalogue(await construireInventaire([produit('EPUISE', 'Poissons', 0)]));

      expect(nbArticles).toBe(1);
      expect(await capture.blob!.text()).toContain('EPUISE');
    });

    it('ne télécharge rien quand l\'inventaire est vide', async () => {
      const capture = interceptTelechargement();
      spyOn(window, 'fetch').and.rejectWith(new Error('hors ligne'));

      const nbArticles = await service.genererCatalogue(await construireInventaire([]));

      expect(nbArticles).toBe(0);
      expect(capture.blob).toBeNull();
    });
  });
});

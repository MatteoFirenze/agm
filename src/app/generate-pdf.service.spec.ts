import { TestBed } from '@angular/core/testing';

import { GeneratePdfService } from './generate-pdf.service';

const pdfMake = require('pdfmake/build/pdfmake.js');

describe('GeneratePdfService', () => {
  let service : GeneratePdfService;

  const vide = () => new Set<any[]>();

  /*Fabrique un ensemble de n articles nommés Article 1, Article 2, …*/
  function articles(n : number, prefixe = 'Article') : Set<any[]> {
    const set = new Set<any[]>();
    for (let i = 1; i <= n; i++) set.add([i, `${prefixe} ${i}`]);
    return set;
  }

  /*Construit un document avec uniquement les vins renseignés*/
  function documentAvecVins(n : number) : any {
    return service.construireDocument(articles(n, 'Vin'), vide(), vide(), vide(), vide(), vide());
  }

  /*Tous les textes d'articles contenus dans un bloc, à plat*/
  function textes(noeud : any) : string[] {
    if (noeud === null || noeud === undefined) return [];
    if (Array.isArray(noeud)) return noeud.reduce((acc, n) => acc.concat(textes(n)), [] as string[]);
    if (typeof noeud === 'object') {
      if (noeud.style === 'listItem' && typeof noeud.text === 'string') return [noeud.text];
      return textes(noeud.stack).concat(textes(noeud.columns));
    }
    return [];
  }

  function titres(document : any) : string[] {
    const trouves : string[] = [];
    const parcourir = (noeud : any) => {
      if (Array.isArray(noeud)) { noeud.forEach(parcourir); return; }
      if (noeud && typeof noeud === 'object') {
        if (noeud.style === 'header' && noeud.text) trouves.push(noeud.text);
        parcourir(noeud.stack); parcourir(noeud.columns);
      }
    };
    parcourir(document.content);
    return trouves;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneratePdfService);
  });

  it('se crée', () => {
    expect(service).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('section Vini', () => {

    it('imprime la section Vini quand il y a des vins (impression par tournée)', () => {
      const document = documentAvecVins(3);

      expect(titres(document)[0]).toBe('Vini');
      expect(textes(document.content[1])).toEqual(['1\tVin 1', '2\tVin 2', '3\tVin 3']);
    });

    it('n\'imprime pas la section Vini quand elle est vide (total produits)', () => {
      const document = service.construireDocument(vide(), articles(2, 'Poisson'), vide(), vide(), vide(), vide());

      expect(titres(document)).not.toContain('Vini');
    });

    it('ne commence pas par une page blanche quand il n\'y a pas de vins', () => {
      const document = service.construireDocument(vide(), articles(2), vide(), vide(), vide(), vide());

      expect(document.content[0].pageBreak)
        .withContext('aucun saut de page ne doit précéder la première section').toBeUndefined();
      expect(document.content.length).withContext('titres + contenus des 5 chambres').toBe(2);
    });

    it('sépare les vins en colonnes de 15 articles', () => {
      const document = documentAvecVins(31);
      const colonnes = document.content[1].columns;

      expect(colonnes.length).toBe(3);
      expect(textes(colonnes[0]).length).toBe(15);
      expect(textes(colonnes[1]).length).toBe(15);
      expect(textes(colonnes[2]).length).toBe(1);
    });

    it('passe à une nouvelle page tous les 5 colonnes de vins', () => {
      //6 colonnes de 15 => 2 pages
      const document = documentAvecVins(80);
      const sautsAvantLesChambres = document.content
        .slice(0, document.content.length - 2)
        .filter((bloc : any) => bloc.pageBreak === 'before');

      expect(sautsAvantLesChambres.length)
        .withContext('1 saut entre les 2 pages de vins + 1 avant les chambres').toBe(2);
    });

    it('n\'oublie aucun vin quel que soit le découpage', () => {
      const document = documentAvecVins(80);
      const tous = document.content.reduce((acc : string[], bloc : any) => acc.concat(textes(bloc)), []);

      expect(tous.length).toBe(80);
      expect(tous).toContain('1\tVin 1');
      expect(tous).toContain('80\tVin 80');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('sections chambres', () => {

    it('imprime les 5 sections dans l\'ordre attendu', () => {
      const document = service.construireDocument(vide(),
        articles(1, 'Poisson'), articles(1, 'Glace'), articles(1, 'PateSurg'),
        articles(1, 'PateFraiche'), articles(1, 'Dessert'));

      expect(titres(document)).toEqual(['Pesce', 'Pasta Surg', 'Pasta Fresca', 'Gelati/Fungi', 'Dessert/Verdura']);
    });

    it('place chaque chambre dans sa colonne', () => {
      const document = service.construireDocument(vide(),
        articles(1, 'Poisson'), articles(1, 'Glace'), articles(1, 'PateSurg'),
        articles(1, 'PateFraiche'), articles(1, 'Dessert'));

      const colonnes = document.content[1].columns;
      expect(textes(colonnes[0])).toEqual(['1\tPoisson 1']);
      expect(textes(colonnes[1])).withContext('ch3 = pâtes surgelées').toEqual(['1\tPateSurg 1']);
      expect(textes(colonnes[2])).withContext('ch4 = pâtes fraîches').toEqual(['1\tPateFraiche 1']);
      expect(textes(colonnes[3])).withContext('ch2 = glaces et champignons').toEqual(['1\tGlace 1']);
      expect(textes(colonnes[4])).withContext('ch5 = desserts et verdures').toEqual(['1\tDessert 1']);
    });

    it('imprime les titres même si toutes les chambres sont vides', () => {
      const document = service.construireDocument(vide(), vide(), vide(), vide(), vide(), vide());

      expect(titres(document)).toEqual(['Pesce', 'Pasta Surg', 'Pasta Fresca', 'Gelati/Fungi', 'Dessert/Verdura']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('mise en forme', () => {

    it('affiche la quantité puis le nom séparés par une tabulation', () => {
      const document = service.construireDocument(vide(), new Set([[10.77, 'CALAMARI 1KG']]), vide(), vide(), vide(), vide());

      expect(textes(document.content[1])).toEqual(['10.77\tCALAMARI 1KG']);
    });

    it('affiche les quantités négatives telles quelles', () => {
      const document = service.construireDocument(new Set([[-1, 'AMARONE']]), vide(), vide(), vide(), vide(), vide());

      expect(textes(document.content[1])).toEqual(['-1\tAMARONE']);
    });

    it('déclare les styles utilisés par le document', () => {
      const document = documentAvecVins(1);

      expect(Object.keys(document.styles).sort()).toEqual(['column', 'header', 'listItem']);
      expect(document.styles.header.bold).toBeTrue();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('processDataForColumns', () => {

    it('répartit les articles par paquets de la taille demandée', () => {
      const colonnes = service.processDataForColumns(Array.from(articles(50)), 22);

      expect(colonnes.length).toBe(3);
      expect(colonnes[0].stack.length).toBe(22);
      expect(colonnes[2].stack.length).toBe(6);
    });

    it('ne produit aucune colonne pour une liste vide', () => {
      expect(service.processDataForColumns([], 22).length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('téléchargement', () => {

    it('génère le PDF sous le nom Liste.pdf', () => {
      const download = jasmine.createSpy('download');
      spyOn(pdfMake, 'createPdf').and.returnValue({ download } as any);

      service.generatePdf(articles(2, 'Vin'), vide(), vide(), vide(), vide(), vide());

      expect(pdfMake.createPdf).toHaveBeenCalled();
      expect(download).toHaveBeenCalledWith('Liste.pdf');
    });

    it('transmet à pdfmake exactement le document construit', () => {
      const download = jasmine.createSpy('download');
      spyOn(pdfMake, 'createPdf').and.returnValue({ download } as any);
      const vins = articles(2, 'Vin');

      service.generatePdf(vins, vide(), vide(), vide(), vide(), vide());

      const transmis = (pdfMake.createPdf as jasmine.Spy).calls.mostRecent().args[0];
      expect(titres(transmis)[0]).toBe('Vini');
    });

    it('produit un vrai PDF que pdfmake accepte', (done) => {
      const document = service.construireDocument(
        articles(20, 'Vin'), articles(5, 'Poisson'), vide(), articles(3, 'Pate'), vide(), articles(2, 'Dessert'));

      pdfMake.createPdf(document).getBlob((blob : Blob) => {
        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toContain('pdf');
        done();
      });
    }, 30000);
  });
});

import * as ExcelJS from 'exceljs' ;

import {
  ECRITURE_COMPTABLE, TOURNEE_DEVIS, repererColonnes, separerRefEtNom,
} from './formats-fichier';

describe('separerRefEtNom', () => {

  /*Vérifié sur les fichiers réels : le texte entre crochets est exactement la
  « Référence interne » du produit, et ce qui suit exactement son « Nom ».*/
  it('sépare la référence interne du nom du produit', () => {
    expect(separerRefEtNom('[PANZ] PANZEROTTINI POM/MOZ 10X0.400GR 1KG'))
      .toEqual({ ref: 'PANZ', nom: 'PANZEROTTINI POM/MOZ 10X0.400GR 1KG' });
  });

  it('garde le nom entier quand il n\'y a pas de crochets', () => {
    expect(separerRefEtNom('OLIO EXTRAVERGINE ALBEROBELLO 5LT'))
      .toEqual({ ref: null, nom: 'OLIO EXTRAVERGINE ALBEROBELLO 5LT' });
  });

  it('ne garde que les premiers crochets, ceux du nom faisant partie du nom', () => {
    expect(separerRefEtNom('[CAPPO] CAPPELLI CEPES LOT 2925 [10/26]'))
      .toEqual({ ref: 'CAPPO', nom: 'CAPPELLI CEPES LOT 2925 [10/26]' });
  });

  it('ignore les espaces autour de la référence et du nom', () => {
    expect(separerRefEtNom('  [ CIME ]   CIME DI RAPE SAC 2KG  '))
      .toEqual({ ref: 'CIME', nom: 'CIME DI RAPE SAC 2KG' });
  });

  it('rend une référence nulle sur une cellule vide', () => {
    expect(separerRefEtNom(null)).toEqual({ ref: null, nom: null });
  });

  it('rend une référence nulle quand les crochets sont vides', () => {
    expect(separerRefEtNom('[] PRODUIT SANS REFERENCE'))
      .toEqual({ ref: null, nom: 'PRODUIT SANS REFERENCE' });
  });

  it('garde le texte entier si rien ne suit les crochets', () => {
    //« [PANZ] » seul ne dit rien du produit : mieux vaut l'afficher tel quel
    expect(separerRefEtNom('[PANZ]')).toEqual({ ref: null, nom: '[PANZ]' });
  });

  it('lit une cellule en texte enrichi', () => {
    const enrichi : any = { richText: [{ text: '[DTS] TORTA' }, { text: ' SMERALDO' }] };
    expect(separerRefEtNom(enrichi)).toEqual({ ref: 'DTS', nom: 'TORTA SMERALDO' });
  });
});

describe('repererColonnes', () => {

  /*Une feuille réduite à sa ligne d'en-tête*/
  function enTete(intitules : any[]) : ExcelJS.Row {
    const feuille = new ExcelJS.Workbook().addWorksheet('Sheet1');
    feuille.addRow(intitules);
    return feuille.getRow(1);
  }

  it('retrouve les colonnes quelles que soient leurs positions', () => {
    //l'ordre des colonnes change d'un export Odoo à l'autre
    const colonnes = repererColonnes(enTete([
      'Lignes de facture/Numéro', 'Partenaire/ID', 'Lignes de facture/Quantité',
    ]), ECRITURE_COMPTABLE);

    expect(colonnes.facture).toBe(1);
    expect(colonnes.codeClient).toBe(2);
    expect(colonnes.qte).toBe(3);
  });

  it('laisse de côté les champs dont la colonne est absente', () => {
    const colonnes = repererColonnes(enTete(['Partenaire/ID']), ECRITURE_COMPTABLE);

    expect(colonnes.codeClient).toBe(1);
    expect(colonnes.refArticle).toBeUndefined();
    expect(colonnes.famille).toBeUndefined();
  });

  it('ignore les colonnes d\'un autre format', () => {
    const colonnes = repererColonnes(enTete([
      'Client/ID', 'Référence commande', 'Lignes de facture/Numéro',
    ]), TOURNEE_DEVIS);

    expect(colonnes.codeClient).toBe(1);
    expect(colonnes.facture).toBe(2);
    expect(Object.keys(colonnes).length).toBe(2);
  });

  it('garde la première colonne en cas d\'intitulé en double', () => {
    const colonnes = repererColonnes(enTete(['Client/ID', 'Client/ID']), TOURNEE_DEVIS);
    expect(colonnes.codeClient).toBe(1);
  });

  it('ne confond pas « Client » avec « Client/ID »', () => {
    const colonnes = repererColonnes(enTete(['Client/ID', 'Client']), TOURNEE_DEVIS);

    expect(colonnes.codeClient).toBe(1);
    expect(colonnes.nomClient).toBe(2);
  });
});

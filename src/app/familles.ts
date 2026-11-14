import { CellValue } from "exceljs";

/*Familles de produits telles qu'Odoo les exporte dans
« Lignes de facture/Produit/Catégorie de produits ».
Les alcools et les vins sont livrés mais ne sont ni comptés dans le total
produits, ni suivis dans le fichier d'inventaire : on les écarte des agrégats.*/
export const FAMILLES_ALCOOL : string[] = ['FA0001 - FA0001', 'FA0004 - FA0004'];

export function estAlcool(famille : CellValue) : boolean {
    if (famille === null || famille === undefined) return false;
    return FAMILLES_ALCOOL.indexOf(String(famille).trim()) !== -1;
}

/*Nom affiché de chaque famille, dans l'ordre où elles apparaissent au
catalogue. L'export Odoo ne donne que le code (« FA0007 - FA0007 »).*/
export const NOMS_FAMILLES : { code : string, nom : string }[] = [
    { code: 'FA0001', nom: 'Vins' },
    { code: 'FA0002', nom: 'Pâtes surgelées' },
    { code: 'FA0003', nom: 'Poissons' },
    { code: 'FA0004', nom: 'Grappa' },
    { code: 'FA0006', nom: 'Verdure' },
    { code: 'FA0007', nom: 'Desserts' },
    { code: 'FA0008', nom: 'Viva' },
    { code: 'FA0009', nom: 'Pâtes fraîches' },
    { code: 'FA0010', nom: 'Glaces' },
    { code: 'FA0011', nom: 'Porcini' },
];

/*Code d'une famille telle qu'Odoo l'exporte : « FA0007 - FA0007 » -> « FA0007 ».
Chaîne vide si la valeur n'a pas la forme d'un code famille.*/
export function codeFamille(famille : CellValue) : string {
    if (famille === null || famille === undefined) return '';
    let code = /^\s*(FA\d+)/i.exec(String(famille));
    return code ? code[1].toUpperCase() : '';
}

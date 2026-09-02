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

import { CellValue } from "exceljs";

export interface LigneCommande {
    qte:CellValue,
    famille:CellValue,
    nom:CellValue,
    ref:CellValue, //référence interne du produit, sert à retrouver la ligne dans l'inventaire
}

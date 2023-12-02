import { CellValue } from "exceljs";

export interface Client {
    nom : CellValue,
    code : CellValue,
    facture: CellValue,
}

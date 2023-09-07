import { LigneCommande } from "./ligne-commande";
import { CellValue } from "exceljs";

export interface Commande {
    article : Map<CellValue,LigneCommande> //clé : num de l'article   valeur : la quantité + nom + famille
}

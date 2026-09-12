import { CellValue } from 'exceljs';

/*Lecture d'une cellule Excel.

Une cellule peut porter une formule, un lien ou du texte enrichi plutôt qu'une
valeur simple : ces deux fonctions en extraient ce que l'utilisateur voit dans
Excel, quelle que soit la forme du modèle exceljs.*/

/*Valeur affichée, ou null si la cellule est vide*/
export function valeurCellule(cellule : CellValue) : any {
  if (cellule === null || cellule === undefined) return null;
  if (typeof cellule === 'object') {
    let objet = cellule as any;
    if (objet.result !== undefined) return objet.result;
    if (objet.text !== undefined) return objet.text;
    if (objet.richText !== undefined) return objet.richText.map((m : any) => m.text).join('');
    if (objet.hyperlink !== undefined) return objet.hyperlink;
  }
  return cellule;
}

/*Même chose sous forme de texte, chaîne vide si la cellule est vide*/
export function texteCellule(cellule : CellValue) : string {
  let valeur = valeurCellule(cellule);
  return valeur === null || valeur === undefined ? '' : String(valeur);
}

import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs' ;
import { Commande } from './commande';
import { estAlcool } from './familles';
import { texteCellule, valeurCellule } from './cellule';

/*Total facturé pour une référence interne, toutes factures confondues*/
export interface TotalReference {
  ref : string,   //référence telle qu'écrite dans l'écriture comptable
  nom : string,
  qte : number,   //positif = sorti du stock, négatif = rentré (avoir/retour)
}

/*Ce qu'il s'est passé pendant la mise à jour, pour pouvoir en informer l'utilisateur*/
export interface ResultatMaj {
  lignesMisesAJour : number,
  referencesInconnues : TotalReference[],
}

@Injectable({
  providedIn: 'root'
})
export class UpdateInventaireService {

  //colonnes de l'inventaire que l'on ne garde pas dans le fichier généré
  private static readonly COLONNES_RETIREES = ['Favori', 'Activité exception décoration'];
  //colonnes de quantité à recalculer
  private static readonly COLONNES_QTE = ['Quantité disponible', 'Quantité prévue'];
  private static readonly COLONNE_REF = 'Référence interne';
  //colonnes placées en tête du fichier généré, dans cet ordre : ce sont celles
  //que l'on consulte en premier. Le reste suit dans l'ordre du fichier importé.
  private static readonly COLONNES_EN_TETE = ['Nom', 'Prix de vente', 'Quantité disponible'];

  /*Additionne les quantités facturées par référence interne.
  On travaille sur les factures encore chargées : celles supprimées via la
  corbeille sont donc naturellement exclues du calcul.
  Les alcools et vins sont écartés : ils ne figurent pas dans l'inventaire.*/
  totauxParReference(map : Map<string, Commande>) : Map<string, TotalReference> {
    let totaux : Map<string, TotalReference> = new Map();

    map.forEach(commande => {
      commande.article.forEach(ligne => {
        if (estAlcool(ligne.famille)) return; //alcools et vins hors inventaire

        let cle = this.normaliser(ligne.ref);
        if (cle === null) return; //ligne sans référence interne

        if (!totaux.has(cle)) {
          totaux.set(cle, { ref: texteCellule(ligne.ref), nom: texteCellule(ligne.nom), qte: 0 });
        }
        let total = totaux.get(cle)!;
        total.qte = this.arrondir(total.qte + (Number(valeurCellule(ligne.qte)) || 0));
      });
    });

    return totaux;
  }

  /*Recopie l'inventaire en retirant les 2 colonnes inutiles et en retranchant
  les quantités facturées. Une quantité facturée négative (avoir, retour)
  augmente donc le stock. Le fichier d'origine n'est pas modifié.*/
  async genererInventaireMisAJour(inventaire : ExcelJS.Workbook, totaux : Map<string, TotalReference>, nomFichier : string) : Promise<ResultatMaj> {
    let source = inventaire.getWorksheet(1);
    let enTete = source.getRow(1);

    //on repère les colonnes par leur en-tête : l'ordre du fichier Odoo peut changer
    let colonnesGardees : number[] = [];
    let titres : string[] = [];
    let colRef = -1;
    let colsQte : number[] = [];

    enTete.eachCell((cell, col) => {
      let titre = texteCellule(cell.value).trim();
      if (UpdateInventaireService.COLONNES_RETIREES.indexOf(titre) !== -1) return;

      colonnesGardees.push(col);
      titres.push(titre);
      if (titre === UpdateInventaireService.COLONNE_REF) colRef = col;
      if (UpdateInventaireService.COLONNES_QTE.indexOf(titre) !== -1) colsQte.push(col);
    });

    if (colRef === -1) {
      throw new Error("La colonne « " + UpdateInventaireService.COLONNE_REF + " » est introuvable dans le fichier d'inventaire.");
    }
    if (colsQte.length === 0) {
      throw new Error("Aucune colonne de quantité (« " + UpdateInventaireService.COLONNES_QTE.join(' », « ') + " ») dans le fichier d'inventaire.");
    }

    //nom, prix et quantité disponible passent devant ; colRef et colsQte restent
    //des numéros de colonne de la source, l'ordre de sortie ne les concerne pas
    let ordre = colonnesGardees
      .map((col, position) => ({ col, titre: titres[position], rang: this.rangEnTete(titres[position]), position }))
      .sort((a, b) => a.rang - b.rang || a.position - b.position);
    colonnesGardees = ordre.map(c => c.col);
    titres = ordre.map(c => c.titre);

    let sortie = new ExcelJS.Workbook();
    let feuille = sortie.addWorksheet(source.name || 'Inventaire');

    let ligneTitres = feuille.addRow(titres);
    ligneTitres.font = { bold: true };
    //on reprend les largeurs d'origine pour garder un fichier lisible
    colonnesGardees.forEach((col, i) => {
      let largeur = source.getColumn(col).width;
      if (largeur) feuille.getColumn(i + 1).width = largeur;
    });

    let referencesVues : Set<string> = new Set();
    let lignesMisesAJour = 0;

    source.eachRow((row, numero) => {
      if (numero === 1) return; //en-tête déjà écrit

      let cle = this.normaliser(row.getCell(colRef).value);
      let total = cle !== null ? totaux.get(cle) : undefined;
      if (total) {
        referencesVues.add(cle!);
        lignesMisesAJour++;
      }

      let valeurs = colonnesGardees.map(col => {
        let valeur = valeurCellule(row.getCell(col).value);
        if (!total || colsQte.indexOf(col) === -1) return valeur;
        //quantité facturée retranchée du stock ; négatif volontairement conservé
        return this.arrondir((Number(valeur) || 0) - total.qte);
      });

      feuille.addRow(valeurs);
    });

    //ce qui a été facturé mais qui n'existe pas dans l'inventaire
    let referencesInconnues : TotalReference[] = [];
    totaux.forEach((total, cle) => {
      if (!referencesVues.has(cle)) referencesInconnues.push(total);
    });

    await this.telecharger(sortie, nomFichier);

    return { lignesMisesAJour, referencesInconnues };
  }

  /*Nom du fichier généré, dérivé de celui que l'utilisateur a importé*/
  nomFichierSortie(nomOrigine : string) : string {
    let base = (nomOrigine || 'inventaire').replace(/\.(xlsx|xlsb|xls)$/i, '');
    let date = new Date();
    let jour = ('0' + date.getDate()).slice(-2);
    let mois = ('0' + (date.getMonth() + 1)).slice(-2);
    return base + '_maj_' + jour + '-' + mois + '-' + date.getFullYear() + '.xlsx';
  }

  private async telecharger(workbook : ExcelJS.Workbook, nomFichier : string) {
    let buffer = await workbook.xlsx.writeBuffer();
    let blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    let url = URL.createObjectURL(blob);

    let lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();

    URL.revokeObjectURL(url);
  }

  /*Rang de tri d'une colonne : sa place dans COLONNES_EN_TETE, sinon après
  toutes celles-là — à rang égal l'ordre du fichier importé est conservé*/
  private rangEnTete(titre : string) : number {
    let rang = UpdateInventaireService.COLONNES_EN_TETE.indexOf(titre);
    return rang === -1 ? UpdateInventaireService.COLONNES_EN_TETE.length : rang;
  }

  /*Clé de rapprochement : on ignore la casse et les espaces parasites,
  les références étant saisies à la main dans Odoo*/
  private normaliser(valeur : ExcelJS.CellValue) : string | null {
    let texte = texteCellule(valeur).trim();
    return texte === '' ? null : texte.toUpperCase();
  }

  /*Les quantités sont décimales : sans arrondi on obtient des 141.00000000000003*/
  private arrondir(nombre : number) : number {
    return Math.round(nombre * 1000) / 1000;
  }
}

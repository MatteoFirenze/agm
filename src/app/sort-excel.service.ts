import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs' ;
import { Client } from './client';
import { Commande } from './commande';
import { LigneCommande } from './ligne-commande';
import { texteCellule } from './cellule';
import {
  CHAMPS_OBLIGATOIRES, ChampFichier, Colonnes, FORMATS, FormatFichier,
  repererColonnes, separerRefEtNom,
} from './formats-fichier';

@Injectable({
  providedIn: 'root'
})
export class SortExcelService {
  message: any;
  map: any;

  // Declare the callback function
  private resetCallback!: () => void;

   // Define a function to receive the callback
   setResetCallback(callback: () => void) {
    this.resetCallback = callback;
  }
  /*Range les lignes du fichier importé par pièce : une facture pour l'export
  « Écriture comptable », un bon de commande pour l'export « Tournée devis ».
  Le format est reconnu à partir des intitulés de la ligne 1 (formats-fichier.ts),
  les colonnes n'étant jamais repérées par leur position.

  On regroupe par numéro de pièce et non par client : un même client peut avoir
  plusieurs pièces, et dans une tournée devis le client est souvent le même sur
  tout le fichier. Le client — et selon l'export le numéro de pièce lui-même —
  n'étant renseigné que sur la première ligne de chaque pièce, on propage la
  dernière valeur connue.
  Résultat : map(pièce, commande), la commande contenant une map(code article, ligne).

  Renvoie le format reconnu, ou null si le fichier n'est lisible dans aucun.*/
  sortExcel(sheet : ExcelJS.Worksheet, map : any, message:any, clients_nom_map:any) : FormatFichier | null {

   let reconnu = this.reconnaitreFormat(sheet, message);
   if(reconnu === null) return null;
   let format = reconnu.format, colonnes = reconnu.colonnes;

    let compteur = 0; //va servir à différencier 2x le mm article ex 1x article à retirer et une fois à ajouter
    let lastCodeClient: ExcelJS.CellValue = null;
    let lastNomClient: ExcelJS.CellValue = null;
    let lastFacture: ExcelJS.CellValue = null;
    let sansFamille: Set<string> = new Set();

    sheet.eachRow((row) => {
      compteur++;
      if (compteur === 1) return; // skip ligne d'en-tête

      let lire = (champ : ChampFichier) : ExcelJS.CellValue =>
        colonnes[champ] === undefined ? null : row.getCell(colonnes[champ]!).value;

      let client : Client = new clientImpl();
      client.code = lire('codeClient');
      client.nom = lire('nomClient');
      client.facture = lire('facture');

      // Propager le dernier client connu si la ligne n'en a pas
      if (client.code) {
        lastCodeClient = client.code;
        lastNomClient = client.nom;
      } else {
        client.code = lastCodeClient;
        client.nom = lastNomClient;
      }

      // Une ligne sans numéro de pièce est la suite de la dernière pièce vue :
      // c'est le cas de toutes les lignes de continuation d'une tournée devis,
      // et d'un export d'écriture comptable qui ne remplit que la 1re ligne
      if (client.facture) {
        lastFacture = client.facture;
      } else {
        client.facture = lastFacture;
      }

      let codeDeArticle = lire('codeArticle');
      // Tournée devis : la référence interne est en tête du nom du produit,
      // là où l'écriture comptable lui donne une colonne
      let produit = format.refDansNomArticle
        ? separerRefEtNom(lire('nomArticle'))
        : { ref: lire('refArticle'), nom: lire('nomArticle') };
      let nomDeArticle = produit.nom;

      // On ignore les lignes qui ne portent pas de produit (lignes de section,
      // de note ou d'écriture sans article)
      if (client.facture !== null && (codeDeArticle !== null || nomDeArticle !== null)) {
        let commande : Commande = new commandeImpl();
        let ligneCommande : LigneCommande = new ligneCommandeImpl();

        ligneCommande.famille = lire('famille');
        ligneCommande.qte = lire('qte');
        ligneCommande.nom = nomDeArticle;
        ligneCommande.ref = produit.ref;

        // Sans catégorie, la ligne n'entre dans aucune chambre : elle
        // disparaîtrait des listes de préparation sans que personne ne le voie
        if (texteCellule(ligneCommande.famille).trim() === '') {
          sansFamille.add(texteCellule(nomDeArticle) || texteCellule(codeDeArticle));
        }

        commande.article.set(codeDeArticle, ligneCommande);

        if(!map.has(client.facture)){ //si la pièce n'est pas encore présente dans la map
          map.set(client.facture, commande);
          clients_nom_map.set(client.facture, client.nom);
        } else {
          let commandeClient = map.get(client.facture);

          if(commandeClient?.article.has(codeDeArticle)){ //si l'article est déjà présent
            commandeClient.article.set(codeDeArticle + (compteur+""), ligneCommande);
          }
          else commandeClient?.article.set(codeDeArticle, ligneCommande);
        }
      }
    });

    this.signalerSansFamille(sansFamille, message);
    return format;
  }

  /*Choisit le format dont tous les champs obligatoires sont présents. Si aucun
  ne convient, on refuse le fichier en nommant les colonnes qui manquent au
  format le plus proche — c'est ce qui aide l'utilisateur à refaire son export.*/
  private reconnaitreFormat(sheet : ExcelJS.Worksheet, message : any)
    : { format : FormatFichier, colonnes : Colonnes } | null {

    let enTete = sheet.getRow(1);
    let plusProche : { format : FormatFichier, manquants : ChampFichier[] } | null = null;

    for (let format of FORMATS) {
      let colonnes = repererColonnes(enTete, format);
      let manquants = CHAMPS_OBLIGATOIRES.filter(champ => colonnes[champ] === undefined);
      if (manquants.length === 0) return { format, colonnes };
      if (plusProche === null || manquants.length < plusProche.manquants.length) {
        plusProche = { format, manquants };
      }
    }

    message.add({ severity: 'error', summary: 'Erreur', detail:
      "Fichier illisible : il ne correspond à aucun export attendu (« " + FORMATS.map(f => f.nom).join(" », « ") + " »).\n"
      + 'Au plus proche (« ' + plusProche!.format.nom + ' »), ces colonnes manquent : '
      + plusProche!.manquants.map(champ => plusProche!.format.colonnes[champ]).join(', ') });
    this.resetCallback();
    return null;
  }

  /*Avertit des produits qui n'iront dans aucune chambre faute de catégorie*/
  private signalerSansFamille(sansFamille : Set<string>, message : any) {
    if (sansFamille.size === 0) return;

    let noms = Array.from(sansFamille);
    let apercu = noms.slice(0, 10).join(', ');
    let reste = noms.length - 10;
    message.add({ severity: 'warn', summary: 'Produits sans catégorie', detail:
      noms.length + " produit(s) n'ont pas de catégorie de produits : ils n'apparaîtront sur aucune liste de chambre. "
      + apercu + (reste > 0 ? ' et ' + reste + ' autre(s).' : '') });
  }
}



class commandeImpl implements Commande{
  constructor() {
    this.article = new Map<ExcelJS.CellValue, LigneCommande>();
  }
  article: Map<ExcelJS.CellValue, LigneCommande>;
}
class ligneCommandeImpl implements LigneCommande{
  qte: ExcelJS.CellValue;
  famille: ExcelJS.CellValue;
  nom: ExcelJS.CellValue;
  ref: ExcelJS.CellValue;
  constructor(){
  }
}
class clientImpl implements Client{
  nom: ExcelJS.CellValue;
  code : ExcelJS.CellValue;
  facture: ExcelJS.CellValue;
  constructor(){
  }
}

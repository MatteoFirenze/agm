import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs' ;
import { Client } from './client';
import { Commande } from './commande';
import { LigneCommande } from './ligne-commande';
import { GeneratePdfService } from './generate-pdf.service';
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
  sortExcel(sheet : ExcelJS.Worksheet,map : any,message:any){
    /*Pour chaque ligne on crée un obj commande qui contient une map(article,qte) et on l'ajoute
    dans une autre map(client,première map)
    Cell D : nom de l'article
    Cell C : code de l'article
    Cell I : famille article
    Cell B : qte article
    Cell F : code client
    Cell G : nom client
    */
   let codeClient: ExcelJS.CellValue,facture: ExcelJS.CellValue,nomClient: ExcelJS.CellValue,codeArticle: ExcelJS.CellValue,nomArticle: ExcelJS.CellValue,familleArticle: ExcelJS.CellValue,qte : ExcelJS.CellValue;

   let firstRow = sheet.getRow(1);
   firstRow.eachCell(cell =>{
     switch((cell + "")){
       case "code_de_la_société": codeClient = cell.$col$row.replace(/[^A-Z]/g, '');
         break;
       case "quantité_totale": qte = cell.$col$row.replace(/[^A-Z]/g, '');;
         break;
       case "référence_article" : codeArticle = cell.$col$row.replace(/[^A-Z]/g, '');;
         break;
       case "nom_article" : nomArticle = cell.$col$row.replace(/[^A-Z]/g, '');;
         break;
       case "nom_de_la_société" : nomClient = cell.$col$row.replace(/[^A-Z]/g, '');
         break;
       case "famille" : familleArticle = cell.$col$row.replace(/[^A-Z]/g, '');
       break;
       case "numéro_de_document" : facture = cell.$col$row.replace(/[^A-Z]/g, '');
       break;
       default : break;
     }
    
   });
   if(codeClient==null||qte==null||codeArticle==null||nomArticle==null||nomClient==null||familleArticle==null || facture == null){
     message.add({ severity: 'error', summary: 'Erreur', detail: 'Un des champs est manquant dans le fichier!\nChamps requis : code client, nom client, code article, quantité article, nom article, famille article, numero de facture/pièce' });
     this.resetCallback();
     return;
   }
    let compteur = 0; //va servir à différencier 2x le mm article ex 1x article à retirer et une fois à ajouter
    sheet.eachRow((row) => {
      compteur++;
      let client : Client = new clientImpl();
      client.nom = row.getCell(nomClient+"").value;
      client.facture = row.getCell(facture+"").value;
      if (client.facture !== "numéro_de_document" && client.facture !== null) {
        let commande : Commande = new commandeImpl();
        let ligneCommande : LigneCommande = new ligneCommandeImpl();
 
        ligneCommande.famille = row.getCell(familleArticle+"").value;
        ligneCommande.qte = row.getCell(qte+"").value;
        ligneCommande.nom = row.getCell(nomArticle+"").value;
        client.code = row.getCell(codeClient+"").value;
        let codeDeArticle = row.getCell(codeArticle+"").value;
        commande.article.set(codeDeArticle, ligneCommande);
 
        if(!map.has(JSON.stringify(client))) //si le client n'est pas encore présent dans la map
          map.set(JSON.stringify(client),commande);
        else {
          let commandeClient = map.get(JSON.stringify(client));
 
          if(commandeClient?.article.has(codeDeArticle)){ //si l'article est déjà présent
            commandeClient.article.set(codeDeArticle + (compteur+""), ligneCommande);
          }
          else commandeClient?.article.set(codeDeArticle, ligneCommande);
        }
      }
      }); 
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
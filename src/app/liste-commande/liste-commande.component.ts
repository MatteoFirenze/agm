import { Component, ElementRef, Renderer2 } from '@angular/core';
import {CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import * as ExcelJS from 'exceljs' ;
import { Commande } from '../commande';
import { LigneCommande } from '../ligne-commande';
import { Client } from '../client';
const pdfMake = require('pdfmake/build/pdfmake.js');
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
@Component({
  selector: 'app-liste-commande',
  templateUrl: './liste-commande.component.html',
  styleUrls: ['./liste-commande.component.css'],
})
export class ListeCommandeComponent {

  clients : any = [];
  tournee1 : any = [];
  tournee2 : any = [];
  map : Map<string,Commande> = new Map();
  
  constructor(private el: ElementRef, private message: MessageService) {}

  drop(event: CdkDragDrop<any[]>) {
    //si on reste dans le même tableau pour déplacer l'obj
    if (event.previousContainer === event.container) {
      switch(event.container.id){
        case "cdk-drop-list-0" : moveItemInArray(this.clients, event.previousIndex, event.currentIndex);
        break;
        case "cdk-drop-list-1" : moveItemInArray(this.tournee1, event.previousIndex, event.currentIndex);
        break;
        case "cdk-drop-list-2" : moveItemInArray(this.tournee2, event.previousIndex, event.currentIndex);
        break;
        default : break;
      }
        
    } else {//si on change de tableau : on regarde d'où on vient et vers où on va
      switch(event.previousContainer.id){
        case "cdk-drop-list-0":
          event.container.id == "cdk-drop-list-1"?
           transferArrayItem(
              this.clients,
              this.tournee1,
              event.previousIndex,
              event.currentIndex
            ):transferArrayItem(
              this.clients,
              this.tournee2,
              event.previousIndex,
              event.currentIndex
            );
          break;
          case "cdk-drop-list-1":
          event.container.id == "cdk-drop-list-2"?
           transferArrayItem(
              this.tournee1,
              this.tournee2,
              event.previousIndex,
              event.currentIndex
            ):transferArrayItem(
              this.tournee1,
              this.clients,
              event.previousIndex,
              event.currentIndex
            );
          break;
          case "cdk-drop-list-2":
          event.container.id == "cdk-drop-list-0"?
           transferArrayItem(
              this.tournee2,
              this.clients,
              event.previousIndex,
              event.currentIndex
            ):transferArrayItem(
              this.tournee2,
              this.tournee1,
              event.previousIndex,
              event.currentIndex
            );
          break;

          default: break;
      }
        
    }
}

  async readAndSortExcel(event: any) {
  
    const fileRes = event.currentTarget.files[0];
    if(!fileRes)
      return;
    this.readFile(fileRes);
    const buffer = await this.readFile(event.target.files[0]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    const sheet =  workbook.getWorksheet(1);
    
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
      this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Un des champs est manquant dans le fichier!\nChamps requis : code client, nom client, code article, quantité article, nom article, famille article, numero de facture/pièce' });
      this.reset();
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

        if(!this.map.has(JSON.stringify(client))) //si le client n'est pas encore présent dans la map
          this.map.set(JSON.stringify(client),commande);
        else {
          let commandeClient = this.map.get(JSON.stringify(client));

          if(commandeClient?.article.has(codeDeArticle)){ //si l'article est déjà présent
            commandeClient.article.set(codeDeArticle + (compteur+""), ligneCommande);
          }
          else commandeClient?.article.set(codeDeArticle, ligneCommande);
        }
      }
      });

      for(let client of this.map.keys()){
        let cli = JSON.parse(client);
        this.clients.push(cli);
      }
    }

    readFile(fileRes: Blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(fileRes);
        reader.onload = () => {
          resolve(reader.result);
        }
      });
    }
    //function used by imprimer to process the data to put in the pdf
    processDataForColumns(data: any[], itemsPerColumn: number) {
      const columns = [];
    
      for (let i = 0; i < data.length; i += itemsPerColumn) {
        const columnContent = data.slice(i, i + itemsPerColumn).map((item: any[]) => {
          return {
            text: `${item[0]}\t${item[1]}`,
            style: 'listItem'
          };
        });
    
        const column = {
          stack: columnContent,
          style: 'column'
        };
    
        columns.push(column);
      }
    
      return columns;
    }
 async imprimer(num : any){ 
    this.trier(num);

    const vins = this.processDataForColumns(Array.from(this.vins), 20);
    const poissons = this.processDataForColumns(Array.from(this.chambre1), 22);
    const glaceChampi = this.processDataForColumns(Array.from(this.chambre2),22);
    const pates = this.processDataForColumns(Array.from(this.chambre3), 22);
    const patesFr = this.processDataForColumns(Array.from(this.chambre4), 22);
    const dessertVerd = this.processDataForColumns(Array.from(this.chambre5),22);

    const documentDefinition = {
      content: [
        {
          text: 'Vini',
          style: 'header'
        },
        {
          columns: vins,
          columnGap: 10
        },
        { text: '', pageBreak: 'before' }, // Force a new page
        {
          columns: [
            {
              text: 'Pesce',
              style: 'header'
            },
            {
              text: 'Pasta Surg',
              style: 'header'
            },
            {
              text: 'Pasta Fresca',
              style: 'header'
            },
            {
              text: 'Gelati/Fungi',
              style: 'header'
            },
            {
              text: 'Dessert/Verdura',
              style: 'header'
            }
          ],
          columnGap: 10
        },
        {
          columns: [
            {
              stack: poissons,
              style: 'column'
            },
            {
              stack: pates,
              style: 'column'
            },
            {
              stack: patesFr,
              style: 'column'
            },
            {
              stack: glaceChampi,
              style: 'column'
            },
            {
              stack: dessertVerd,
              style: 'column'
            }
          ],
          columnGap: 10
        }
      ],
      styles: {
        listItem: {
          fontSize: 9.25,
          margin: [0, 0, 0, 10] // top, right, bottom, left
        },
        column: {
          width: '33.33%' // Adjust the width based on the number of columns
        },
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10] // top, right, bottom, left
        }
      }
    };

  
   pdfMake.createPdf(documentDefinition).download('Liste.pdf');
   this.softReset()
  }

  vins : Set<ExcelJS.CellValue[]> = new Set(); //chambre en partant du vollet
  chambre1 : Set<ExcelJS.CellValue[]> = new Set(); //poissons
  chambre2 : Set<ExcelJS.CellValue[]> = new Set(); //glaces et champis
  chambre3 : Set<ExcelJS.CellValue[]> = new Set(); //pâtes cong
  chambre4 : Set<ExcelJS.CellValue[]> = new Set(); //pâtes fraiches
  chambre5 : Set<ExcelJS.CellValue[]> = new Set(); //desserts et verdures
  numero : any;
  trier(num : any){
    switch(num){
      case 1:this.numero = this.clients;
      break;
      case 2:this.numero = this.tournee1;
      break;
      case 3:this.numero = this.tournee2;
      break;
      default:
        break;
    }
    this.numero.forEach((client: any) => {
      let commande = this.map.get(JSON.stringify(client));
      commande?.article.forEach(article=>{
        switch(article.famille){

          case 'FA0001':
          case 'FA0004': this.vins.add([article.qte,article.nom]);
          break;

          case 'FA0002': this.chambre3.add([article.qte,article.nom]);
          break;

          case 'FA0003': this.chambre1.add([article.qte,article.nom]);
          break;

          case 'FA0006':
          case 'FA0007': this.chambre5.add([article.qte,article.nom]);
          break;

          case 'FA0009' : this.chambre4.add([article.qte,article.nom]);
          break;

          case 'FA0008' :
          case 'FA0010' :
          case 'FA0011' : this.chambre2.add([article.qte,article.nom]);
          break;

          default:
          break;
        }
      })
    });
  }

  showCommande :  any = [];
  stringAffichage : string = "";
  developperFacture(client :ExcelJS.CellValue){
    this.stringAffichage = "";
    let commandeClient = this.map.get(JSON.stringify(client));
    commandeClient?.article.forEach((ligne)=>{
      this.stringAffichage += (ligne.qte +" "+ligne.nom+"<br>");
    });
    this.display();
  }


  visible: boolean = false;

  display(){
    this.visible = true;
  }


  softReset(){
    this.vins.clear();
    this.chambre1.clear();
    this.chambre2.clear();
    this.chambre3.clear();
    this.chambre4.clear();
    this.chambre5.clear();
  }

  reset() {  
    let fileInput = document.querySelector('.import') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Efface la sélection du fichier
    }
  
    this.clients = [];
    this.tournee1 = [];
    this.tournee2 = [];

    this.map.clear();
    this.vins.clear();
    this.chambre1.clear();
    this.chambre2.clear();
    this.chambre3.clear();
    this.chambre4.clear();
    this.chambre5.clear();
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
import { Component, ElementRef, Renderer2 } from '@angular/core';
import {CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import * as ExcelJS from 'exceljs' ;
import { Commande } from '../commande';
import jsPDF from 'jspdf'; 
import { LigneCommande } from '../ligne-commande';
import { Client } from '../client';

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
  
  constructor(private renderer: Renderer2, private el: ElementRef) {}

  ngOnInit() {
    this.renderer.addClass(this.el.nativeElement, 'tab');
  }

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
   let codeClient: ExcelJS.CellValue,nomClient: ExcelJS.CellValue,codeArticle: ExcelJS.CellValue,nomArticle: ExcelJS.CellValue,familleArticle: ExcelJS.CellValue,qte : ExcelJS.CellValue;

    let firstRow = sheet.getRow(1);
    firstRow.eachCell(cell =>{
      switch((cell + "")){
        case "Client": codeClient = cell.$col$row.replace(/[^A-Z]/g, '');
          break;
        case "Qté": qte = cell.$col$row.replace(/[^A-Z]/g, '');;
          break;
        case "Article" : codeArticle = cell.$col$row.replace(/[^A-Z]/g, '');;
          break;
        case "Description" : nomArticle = cell.$col$row.replace(/[^A-Z]/g, '');;
          break;
        case "Nom Client" : nomClient = cell.$col$row.replace(/[^A-Z]/g, '');
          break;
        case "Famille" : familleArticle = cell.$col$row.replace(/[^A-Z]/g, '');
        break;

        default : break;
      }
     
    });
    
    sheet.eachRow((row) => {
      let client : Client = new clientImpl();
      client.nom = row.getCell(nomClient+"").value;
      if (client.nom !== "Nom Client" && client.nom !== null) {
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
          commandeClient?.article.set(codeDeArticle, ligneCommande);
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

 async imprimer(num : any){ 
    this.trier(num);
    this.creerTab();
    
    let table = this.el.nativeElement.querySelector('.tab') as HTMLTableElement; // Sélectionne le tableau HTML créé
    let doc = new jsPDF("p", "pt", "a4");
    
    // Utilise la méthode .html() de jsPDF pour insérer le contenu HTML (le tableau) dans le PDF
    await doc.html(table, {
        callback: function(doc) {
            doc.save("newpdf.pdf");
        },
        width: 590,
        windowWidth: 1000,
        x:5,
        y:0,
        autoPaging: 'text',
    });
    this.renderer.addClass(table, 'hide-on-html');
    this.softReset();
  }
  
  creerTab() {
    let maxSize = Math.max(
      this.chambre1.size,
      this.chambre2.size,
      this.chambre3.size,
      this.chambre4.size,
      this.chambre5.size,
      this.vins.size
    );
  
    let ensembles = [
      Array.from(this.vins),
      Array.from(this.chambre1),
      Array.from(this.chambre2),
      Array.from(this.chambre3),
      Array.from(this.chambre4),
      Array.from(this.chambre5),
    ];
  
    let table = this.renderer.createElement('table');
    this.renderer.appendChild(this.el.nativeElement, table);
    this.renderer.addClass(table, 'tab');
   

    for (let i = 0; i < maxSize; i++) {
      let row = this.renderer.createElement('tr');
      this.renderer.appendChild(table, row);
  
      for (let j = 0; j < ensembles.length; j++) {
        let cell = this.renderer.createElement('td');
        let cellValue = ensembles[j][i]; // Récupérez la valeur de la cellule
        if (cellValue !== undefined) {
          // Créez un conteneur div
          let container = this.renderer.createElement('div');
          
          // Créez le premier élément <p>
          let labelLeft = this.renderer.createElement('p');
          let textLeft = this.renderer.createText(cellValue[0] + "");
          this.renderer.addClass(labelLeft, 'goLeft');
          this.renderer.appendChild(labelLeft, textLeft);
      
          // Créez le deuxième élément <p>
          let labelRight = this.renderer.createElement('p');
          let textRight = this.renderer.createText(cellValue[1] + "");
          this.renderer.addClass(labelRight, 'goRight');
          this.renderer.appendChild(labelRight, textRight);
      
          // Ajoutez les deux éléments <p> au conteneur div
          this.renderer.appendChild(container, labelLeft);
          this.renderer.appendChild(container, labelRight);
          this.renderer.addClass(container,'spacer')
          
          // Ajoutez le conteneur div à la cellule
          this.renderer.appendChild(cell, container);
        }
        this.renderer.appendChild(row, cell);
      }
    }
  }

  vins : Set<ExcelJS.CellValue[]> = new Set(); //chambre en partant du vollet
  chambre1 : Set<ExcelJS.CellValue[]> = new Set(); //poissons
  chambre2 : Set<ExcelJS.CellValue[]> = new Set(); //glaces et champis
  chambre3 : Set<ExcelJS.CellValue[]> = new Set(); //pâtes cong
  chambre4 : Set<ExcelJS.CellValue[]> = new Set(); //pâtes fraiches
  chambre5 : Set<ExcelJS.CellValue[]> = new Set(); //desserts et verdures

  trier(num : any){
    switch(num){
      case 1:num = this.clients;
      break;
      case 2:num = this.tournee1;
      break;
      case 3:num = this.tournee2;
      break;
    }
    num.forEach((client: any) => {
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

  //to do later
  developperFacture(client :ExcelJS.CellValue){

  }

  softReset(){
    let table = this.el.nativeElement.querySelector('.tab') as HTMLTableElement; // Sélectionnez le tableau
    if (table) {
      while (table.rows.length > 0) {
        table.deleteRow(0);
      }
      let parent = table.parentNode;
      if (parent) {
        parent.removeChild(table);
      }
    }
    this.vins.clear();
    this.chambre1.clear();
    this.chambre2.clear();
    this.chambre3.clear();
    this.chambre4.clear();
    this.chambre5.clear();
  }

  reset() {
    let table = this.el.nativeElement.querySelector('.tab') as HTMLTableElement; // Sélectionnez le tableau
    if (table) {
      while (table.rows.length > 0) {
        table.deleteRow(0);
      }
      let parent = table.parentNode;
      if (parent) {
        parent.removeChild(table);
      }
    }
  
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
  constructor(){
  }
}
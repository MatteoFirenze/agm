import { Component } from '@angular/core';
import {CdkDragDrop,moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import * as ExcelJS from 'exceljs' ;
import { Commande } from '../commande';
const pdfMake = require('pdfmake/build/pdfmake.js');
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import { MessageService } from 'primeng/api';
import { ReadExcelService } from '../read-excel.service';
import { GeneratePdfService } from '../generate-pdf.service';
import { SortExcelService } from '../sort-excel.service';
import { ConfirmationService } from 'primeng/api';
  
@Component({
  providers: [ConfirmationService],
  selector: 'app-liste-commande',
  templateUrl: './liste-commande.component.html',
  styleUrls: ['./liste-commande.component.css'],
})
export class ListeCommandeComponent {

  clients : any = [];
  tournee1 : any = [];
  tournee2 : any = [];
  map : Map<string,Commande> = new Map();
  clients_nom_map : Map<string,string> = new Map();
  sheet!: ExcelJS.Worksheet;
JSON: any;
  constructor(
    private readExcel : ReadExcelService,
    private message: MessageService,
    private generatePdf : GeneratePdfService,
    private sortExcel : SortExcelService,
    private confirmation: ConfirmationService,
    ) {}

    ngOnInit(): void {
      // Pass the reset function to the service
      this.sortExcel.setResetCallback(() => this.reset());
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
    this.readExcel.readFile(fileRes);
    const buffer = await this.readExcel.readFile(event.target.files[0]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    this.sheet =  workbook.getWorksheet(1);
    this.enableButton();
    this.sortExcel.sortExcel(this.sheet,this.map,this.message, this.clients_nom_map);
    
    for(let client of this.map.keys()){
      this.clients.push(client);
    }
  }
    
 async imprimer(num : any){ 
    this.trier(num);
    this.generatePdf.generatePdf(this.vins,this.chambre1,this.chambre2,this.chambre3,this.chambre4,this.chambre5);
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
      let commande = this.map.get(client);
      commande?.article.forEach(article=>{
        switch(article.famille){

          case 'FA0001 - FA0001':
          case 'FA0004 - FA0004': this.vins.add([article.qte,article.nom]);
          break;

          case 'FA0002 - FA0002': this.chambre3.add([article.qte,article.nom]);
          break;

          case 'FA0003 - FA0003': this.chambre1.add([article.qte,article.nom]);
          break;

          case 'FA0006 - FA0006':
          case 'FA0007 - FA0007': this.chambre5.add([article.qte,article.nom]);
          break;

          case 'FA0009 - FA0009' : this.chambre4.add([article.qte,article.nom]);
          break;

          case 'FA0008 - FA0008' :
          case 'FA0010 - FA0010' :
          case 'FA0011 - FA0011' : this.chambre2.add([article.qte,article.nom]);
          break;

          default:
          break;
        }
      })
    });
  }
  trierAndCompute(num : any){
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
      let commande = this.map.get(client);
      commande?.article.forEach(article=>{
        switch(article.famille){

          case 'FA0001 - FA0001':
          case 'FA0004 - FA0004': 
            if(!this.containsNomAndUpdateQte(this.vins,article.nom!.toString(),parseInt(article.qte!.toString())))
              this.vins.add([article.qte,article.nom]);
          break;

          case 'FA0002 - FA0002':  
            if(!this.containsNomAndUpdateQte(this.chambre3,article.nom!.toString(),parseFloat(article.qte!.toString())))
              this.chambre3.add([article.qte,article.nom]);
          break;

          case 'FA0003 - FA0003':
            if(!this.containsNomAndUpdateQte(this.chambre1,article.nom!.toString(),parseFloat(article.qte!.toString())))
              this.chambre1.add([article.qte,article.nom]);
          break;

          case 'FA0006 - FA0006':
          case 'FA0007 - FA0007':
            if(!this.containsNomAndUpdateQte(this.chambre5,article.nom!.toString(),parseFloat(article.qte!.toString())))
              this.chambre5.add([article.qte,article.nom]);
          break;

          case 'FA0009 - FA0009' : 
            if(!this.containsNomAndUpdateQte(this.chambre4,article.nom!.toString(),parseFloat(article.qte!.toString())))
              this.chambre4.add([article.qte,article.nom]);
          break;

          case 'FA0008 - FA0008' :
          case 'FA0010 - FA0010' :
          case 'FA0011 - FA0011' :
            if(!this.containsNomAndUpdateQte(this.chambre2,article.nom!.toString(),parseFloat(article.qte!.toString())))
              this.chambre2.add([article.qte,article.nom]);
          break;

          default:
          break;
        }
      })
    });
  }
 
  containsNomAndUpdateQte(set: Set<ExcelJS.CellValue[]> ,nom: string, qte: number): boolean {
    for (let item of set) {
        if (item[1] === nom) {
            // Modify the qte value by adding the new qte
            item[0] = (item[0] as number) + qte;

            // Since Set does not allow direct modification, we need to remove and re-add the item
            set.delete(item);
            set.add(item);

            return true;
        }
    }
    return false;
  }

  showCommande :  any = [];
  stringAffichage : string = "";
  developperFacture(client :string){
    this.stringAffichage = "";
    let commandeClient = this.map.get(client);
    commandeClient?.article.forEach((ligne)=>{
      this.stringAffichage += (ligne.qte +" "+ligne.nom+"<br>");
    });
    this.display();
  }

  visible: boolean = false;
  display(){
    this.visible = true;
  }

  deleteClient(client :string){
    this.confirmation.confirm({
      message: 'Etes-vous certain de vouloir supprimer cette commande?',
      header: 'Confirmation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'custom-accept-button',
      rejectButtonStyleClass: 'custom-reject-button',
      accept:()=>{
        this.map.delete(client);
        this.removeClientFromList(this.clients, client);
        this.removeClientFromList(this.tournee1, client);
        this.removeClientFromList(this.tournee2, client);
      },
      reject:()=>{}
    });
   
  }

// Helper method to remove a client from a specific array
  removeClientFromList(list: any[], client: string) {
    const index = list.findIndex(item => item === client);
    if (index > -1) {
      list.splice(index, 1); // Remove the client from the array
    }
  }

  computeTotalItems(){
    this.trierAndCompute(1);
    this.trierAndCompute(2);
    this.trierAndCompute(3);

    this.generatePdf.generatePdf(this.vins,this.chambre1,this.chambre2,this.chambre3,this.chambre4,this.chambre5);
    this.softReset()
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

    this.disableButton();
  }

  isButtonDisabled: boolean = true;

  disableButton() {
    this.isButtonDisabled = true;
  }

  enableButton() {
    this.isButtonDisabled = false;
  }
}
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
import { ConfirmDialogModule } from 'primeng/confirmdialog'; 
    
  
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
  sheet!: ExcelJS.Worksheet;
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
    this.sortExcel.sortExcel(this.sheet,this.map,this.message,true);
    
      for(let client of this.map.keys()){
        let cli = JSON.parse(client);
        this.clients.push(cli);
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

  deleteClient(client :ExcelJS.CellValue){
    this.confirmation.confirm({
      message: 'Etes-vous certain de vouloir supprimer cette commande?',
      header: 'Confirmation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'custom-accept-button',
      rejectButtonStyleClass: 'custom-reject-button',
      accept:()=>{
        this.map.delete(JSON.stringify(client));
        this.removeClientFromList(this.clients, client);
        this.removeClientFromList(this.tournee1, client);
        this.removeClientFromList(this.tournee2, client);
      },
      reject:()=>{}
  });
   
  }

// Helper method to remove a client from a specific array
  removeClientFromList(list: any[], client: ExcelJS.CellValue) {
    const index = list.findIndex(item => JSON.stringify(item) === JSON.stringify(client));
    if (index > -1) {
      list.splice(index, 1); // Remove the client from the array
    }
  }

  computeTotalItems(){
    this.trier(1);
    this.trier(2);
    this.trier(3);
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

  // Function to disable the button
  disableButton() {
    this.isButtonDisabled = true;
  }

  // Function to enable the button
  enableButton() {
    this.isButtonDisabled = false;
  }
}
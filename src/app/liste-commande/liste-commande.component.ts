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
import { FormatFichier } from '../formats-fichier';
import { UpdateInventaireService } from '../update-inventaire.service';
import { GenerateCatalogueService } from '../generate-catalogue.service';
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
  //Format reconnu au dernier import, affiché pour que l'utilisateur vérifie que
  //c'est bien celui qu'il croit avoir choisi
  format : FormatFichier | null = null;
  nomFactures : string = '';
JSON: any;
  constructor(
    private readExcel : ReadExcelService,
    private message: MessageService,
    private generatePdf : GeneratePdfService,
    private sortExcel : SortExcelService,
    private updateInventaire : UpdateInventaireService,
    private generateCatalogue : GenerateCatalogueService,
    private confirmation: ConfirmationService,
    ) {}

    ngOnInit(): void {
      // Pass the reset function to the service
      this.sortExcel.setResetCallback(() => this.resetFactures());
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
    // On repart d'un état propre : sinon un 2e import s'ajoute au précédent
    // et duplique les factures déjà réparties dans les tournées.
    // L'inventaire déjà importé, lui, est conservé.
    this.resetFactures();
    const buffer = await this.readExcel.readFile(fileRes);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    this.sheet =  workbook.getWorksheet(1);
    //le service reconnaît le format tout seul d'après les intitulés de colonnes,
    //et renvoie null s'il n'en reconnaît aucun (il a alors déjà averti et remis
    //l'écran à zéro)
    let format = this.sortExcel.sortExcel(this.sheet,this.map,this.message, this.clients_nom_map);
    if(format === null)
      return;

    this.format = format;
    this.nomFactures = fileRes.name;
    this.inventaireMisAJour = false;
    this.enableButton();

    for(let client of this.map.keys()){
      this.clients.push(client);
    }
  }
    
  //Fichier d'inventaire à mettre à jour, gardé tel quel : on le relit à chaque
  //génération pour que le bouton reste rejouable sans réimporter
  inventaire : ExcelJS.Workbook | null = null;
  nomInventaire : string = '';

  async importerInventaire(event: any) {
    const fichier = event.currentTarget.files[0];
    if(!fichier)
      return;

    const buffer = await this.readExcel.readFile(fichier);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    this.inventaire = workbook;
    this.nomInventaire = fichier.name;
    this.inventaireMisAJour = false;
    this.catalogueGenere = false;
  }

  get inventaireMajPossible() : boolean {
    return this.map.size > 0 && this.inventaire !== null;
  }

  async mettreAJourInventaire(){
    if(!this.inventaireMajPossible)
      return;

    const totaux = this.updateInventaire.totauxParReference(this.map);
    if(totaux.size === 0){
      //selon le format, la référence vient d'une colonne ou des crochets du nom
      const colonneRef = this.format?.colonnes.refArticle;
      this.message.add({ severity: 'error', summary: 'Erreur', detail: colonneRef
        ? "Aucune référence interne dans le fichier de factures. Vérifiez que la colonne « " + colonneRef + " » est bien présente à l'export."
        : "Aucune référence interne dans le fichier importé : dans une tournée devis, elle doit précéder le nom du produit entre crochets, par exemple « [PANZ] PANZEROTTINI POM/MOZ 1KG »." });
      return;
    }

    try {
      const resultat = await this.updateInventaire.genererInventaireMisAJour(
        this.inventaire!,
        totaux,
        this.updateInventaire.nomFichierSortie(this.nomInventaire)
      );

      this.inventaireMisAJour = true;
      this.message.add({ severity: 'success', summary: 'Inventaire mis à jour', detail: resultat.lignesMisesAJour + ' produit(s) recalculé(s) sur ' + totaux.size + ' référence(s) facturée(s).' });

      if(resultat.referencesInconnues.length > 0){
        const apercu = resultat.referencesInconnues.slice(0, 10).map(r => r.ref + ' (' + r.nom + ')').join(', ');
        const reste = resultat.referencesInconnues.length - 10;
        this.message.add({ severity: 'warn', summary: "Références introuvables dans l'inventaire", detail: resultat.referencesInconnues.length + " référence(s) facturée(s) sont absentes du fichier d'inventaire et n'ont pas été déduites : " + apercu + (reste > 0 ? ' et ' + reste + ' autre(s).' : '.') });
      }
    } catch (erreur : any) {
      this.message.add({ severity: 'error', summary: 'Erreur', detail: erreur?.message || "Impossible de générer le fichier d'inventaire." });
    }
  }

  //Le catalogue ne dépend que de l'inventaire importé, pas des factures
  async genererCatalogue(){
    if(this.inventaire === null)
      return;

    try {
      const nbArticles = await this.generateCatalogue.genererCatalogue(this.inventaire);
      if(nbArticles === 0){
        this.message.add({ severity: 'warn', summary: 'Catalogue vide', detail: "Aucun article en stock dans le fichier d'inventaire." });
        return;
      }
      this.catalogueGenere = true;
      this.message.add({ severity: 'success', summary: 'Catalogue généré', detail: nbArticles + ' article(s) en stock.' });
    } catch (erreur : any) {
      this.message.add({ severity: 'error', summary: 'Erreur', detail: erreur?.message || 'Impossible de générer le catalogue.' });
    }
  }

 async imprimer(num : any){ 
    this.trier(num);
    this.generatePdf.generatePdf(this.vins,this.chambre1,this.chambre2,this.chambre3,this.chambre4,this.chambre5);
    this.softReset()

    this.impressions.set(num, { heure: this.heureCourante(), empreinte: this.empreinte(num) });
  }

  // ─── Tampon « Imprimé » ─────────────────────────────────────
  //Pour chaque tournée imprimée : l'heure et la liste des factures à ce
  //moment-là, pour repérer une tournée modifiée depuis son impression
  impressions : Map<number, { heure : string, empreinte : string }> = new Map();

  listeDe(num : number) : string[] {
    switch(num){
      case 1: return this.clients;
      case 2: return this.tournee1;
      case 3: return this.tournee2;
      default: return [];
    }
  }

  private empreinte(num : number) : string {
    return this.listeDe(num).join('|');
  }

  private heureCourante() : string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  etatImpression(num : number) : 'imprime' | 'modifie' | null {
    const impression = this.impressions.get(num);
    if(!impression)
      return null;
    return impression.empreinte === this.empreinte(num) ? 'imprime' : 'modifie';
  }

  heureImpression(num : number) : string {
    return this.impressions.get(num)?.heure ?? '';
  }

  get nbTourneesImprimees() : number {
    return [1, 2, 3].filter(num => this.etatImpression(num) === 'imprime').length;
  }

  // ─── Étapes de la journée ───────────────────────────────────
  inventaireMisAJour : boolean = false;
  catalogueGenere : boolean = false;

  get totalClients() : number {
    return this.clients.length + this.tournee1.length + this.tournee2.length;
  }

  //L'unique action mise en avant : la prochaine chose à faire dans la routine
  get prochaineEtape() : 'importer' | 'imprimer' | 'inventaire' | 'mettre-a-jour' | 'catalogue' | null {
    if(this.format === null)
      return 'importer';
    const aImprimer = [1, 2, 3].some(num => this.listeDe(num).length > 0 && this.etatImpression(num) !== 'imprime');
    if(aImprimer)
      return 'imprimer';
    if(this.inventaire === null)
      return 'inventaire';
    if(!this.inventaireMisAJour)
      return 'mettre-a-jour';
    if(!this.catalogueGenere)
      return 'catalogue';
    return null;
  }

  // ─── Trouver un client ──────────────────────────────────────
  recherche : string = '';

  private normaliser(texte : string) : string {
    return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  }

  //Correspondance sur le nom du client ou le numéro de facture/commande
  correspond(client : string) : boolean {
    const cherche = this.normaliser(this.recherche);
    if(cherche === '')
      return false;
    const nom = this.clients_nom_map.get(client) ?? '';
    return this.normaliser(nom + ' ' + client).includes(cherche);
  }

  get nbTrouves() : number {
    if(this.normaliser(this.recherche) === '')
      return 0;
    return [1, 2, 3].reduce((total, num) => total + this.listeDe(num).filter(c => this.correspond(c)).length, 0);
  }

  chercher(valeur : string) {
    this.recherche = valeur;
    //la première fiche trouvée est amenée dans sa colonne
    setTimeout(() => {
      const fiche = document.querySelector('.fiche--trouvee') as HTMLElement | null;
      fiche?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  effacerRecherche(champ : HTMLInputElement) {
    this.recherche = '';
    champ.value = '';
    champ.focus();
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
        //Les alcools et vins (FA0001/FA0004) ne sont pas comptés dans le total produits
        switch(article.famille){

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
  //Mêmes lignes que stringAffichage, structurées pour la liste quantité / produit
  detailLignes : { qte : any, nom : any }[] = [];
  //Bouton qui a ouvert le détail : le focus y revient à la fermeture
  declencheurDetail : HTMLElement | null = null;
  detailTitre : string = "Détail facture";
  developperFacture(client :string){
    this.stringAffichage = "";
    this.detailLignes = [];
    this.detailTitre = (this.clients_nom_map.get(client) ?? 'Détail facture') + ' · ' + client;
    let commandeClient = this.map.get(client);
    commandeClient?.article.forEach((ligne)=>{
      this.stringAffichage += (ligne.qte +" "+ligne.nom+"<br>");
      this.detailLignes.push({ qte: ligne.qte, nom: ligne.nom });
    });
    this.display();
  }

  rendreFocusDetail() {
    this.declencheurDetail?.focus();
    this.declencheurDetail = null;
  }

  visible: boolean = false;
  display(){
    this.visible = true;
  }

  deleteClient(client :string){
    this.confirmation.confirm({
      message: 'Retirer ' + (this.clients_nom_map.get(client) ?? 'cette commande') + ' (' + client + ') de la journée ? La commande ne sera ni imprimée ni déduite de l\'inventaire.',
      header: 'Retirer la fiche ?',
      acceptLabel: 'Retirer',
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

  //Le bouton passe par une confirmation : toute la répartition du jour est perdue
  demanderReset() {
    this.confirmation.confirm({
      message: "Toute la répartition du jour, les fichiers importés et les tampons d'impression seront effacés.",
      header: 'Réinitialiser la planche ?',
      acceptLabel: 'Réinitialiser',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'custom-accept-button',
      rejectButtonStyleClass: 'custom-reject-button',
      accept: () => this.reset(),
      reject: () => {}
    });
  }

  //Bouton Réinitialiser : on repart de zéro, inventaire compris
  reset() {
    this.resetFactures();

    let inventaireInput = document.querySelector('.import-inventaire') as HTMLInputElement;
    if (inventaireInput) {
      inventaireInput.value = '';
    }
    this.inventaire = null;
    this.nomInventaire = '';
    this.catalogueGenere = false;
  }

  //Remise à zéro des seules factures, utilisée aussi avant chaque nouvel import
  private resetFactures() {
    let fileInput = document.querySelector('.import-factures') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Efface la sélection du fichier
    }

    this.clients = [];
    this.tournee1 = [];
    this.tournee2 = [];
    this.format = null;
    this.nomFactures = '';
    this.impressions.clear();
    this.recherche = '';
    this.inventaireMisAJour = false;

    this.map.clear();
    this.clients_nom_map.clear();
    this.softReset();

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
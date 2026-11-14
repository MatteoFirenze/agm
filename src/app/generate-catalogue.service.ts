import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs' ;
import { texteCellule, valeurCellule } from './cellule';
import { codeFamille, NOMS_FAMILLES } from './familles';

/*Catalogue produits généré à partir du fichier d'inventaire.

Reprend helpers/Catalogue/generate_catalogue.py : même repérage des colonnes,
même répartition en 2 colonnes et même mise en page que catalogue_produits.html.
Contrairement au script, les articles sont regroupés par famille et non par
étiquette : la famille est toujours renseignée, y compris sur les lignes
ajoutées à la mise à jour de l'inventaire.*/

export interface ArticleCatalogue {
  nom : string,
  prix : number | null,  //« Prix de vente » Odoo, déjà HTVA : affiché sans conversion ; null si non renseigné
  qte : number,  //telle quelle, même nulle ou négative
}

export interface GroupeCatalogue {
  titre : string,
  articles : ArticleCatalogue[],
}

/*Numéro de colonne de chaque information utile, -1 si absente*/
interface ColonnesCatalogue {
  famille : number,
  nom : number,
  ref : number,
  prix : number,
  qte : number,
}

@Injectable({
  providedIn: 'root'
})
export class GenerateCatalogueService {

  static readonly NOM_FICHIER = 'catalogue_produits.html';
  static readonly TITRE = 'Vins & Gastronomie Firenze';
  static readonly LOGO = 'assets/catalogue-logo.png';
  //groupe des produits sans famille
  static readonly GROUPE_PAR_DEFAUT = 'Autres';

  //palette déclinée du logo (bronze / or chaud)
  private static readonly BRONZE = '#6B5D45';
  private static readonly LIGNE = '#E2D9C8';
  private static readonly GRIS = '#8A7F6C';
  private static readonly ENCRE = '#3A332A';

  /*Génère le catalogue et le télécharge. Renvoie le nombre d'articles listés ;
  s'il n'y en a aucun (inventaire vide), rien n'est téléchargé.*/
  async genererCatalogue(inventaire : ExcelJS.Workbook) : Promise<number> {
    let groupes = this.lireInventaire(inventaire.getWorksheet(1));
    let nbArticles = groupes.reduce((total, groupe) => total + groupe.articles.length, 0);
    if (nbArticles === 0) return 0;

    let html = this.construireHtml(groupes, await this.chargerLogo());
    this.telecharger(html, GenerateCatalogueService.NOM_FICHIER);
    return nbArticles;
  }

  /*Articles regroupés par famille (« Catégorie de produits »), sous le nom de
  NOMS_FAMILLES et dans son ordre ; une famille inconnue de la table garde sa
  valeur Odoo et vient après, les articles sans famille finissent dans « Autres ».
  Articles triés par nom. Tout ce qui est dans l'inventaire
  figure au catalogue : quantité nulle, négative ou vide (affichée 0), prix non
  renseigné (cellule laissée vide, cas des lignes ajoutées à la mise à jour).
  Seules les lignes sans nom ni référence, donc vides, sont ignorées.*/
  lireInventaire(feuille : ExcelJS.Worksheet) : GroupeCatalogue[] {
    let colonnes = this.repererColonnes(feuille.getRow(1));

    let manquantes = [
      colonnes.nom === -1 ? 'Nom' : null,
      colonnes.prix === -1 ? 'Prix de vente' : null,
      colonnes.qte === -1 ? 'Quantité disponible' : null,
    ].filter(c => c !== null);
    if (manquantes.length > 0) {
      throw new Error("Colonne(s) introuvable(s) dans le fichier d'inventaire : « " + manquantes.join(' », « ') + " ».");
    }

    let texte = (row : ExcelJS.Row, col : number) : string => col === -1 ? '' : texteCellule(row.getCell(col).value).trim();

    //rang de chaque groupe : familles connues dans l'ordre de la table, puis les
    //inconnues dans leur ordre d'apparition, « Autres » en dernier
    let groupes : Map<string, { rang : number, articles : ArticleCatalogue[] }> = new Map();

    feuille.eachRow((row, numero) => {
      if (numero === 1) return; //en-tête

      //sans nom, on affiche au moins la référence interne
      let nom = texte(row, colonnes.nom) || texte(row, colonnes.ref);
      if (nom === '') return; //ligne vide

      let { titre, rang } = this.groupeDe(texte(row, colonnes.famille));
      if (!groupes.has(titre)) groupes.set(titre, { rang, articles: [] });

      groupes.get(titre)!.articles.push({
        nom,
        prix: this.nombre(valeurCellule(row.getCell(colonnes.prix).value)),
        qte: this.nombre(valeurCellule(row.getCell(colonnes.qte).value)) ?? 0,
      });
    });

    //Array.sort est stable : à rang égal, l'ordre d'apparition est conservé
    return Array.from(groupes.entries())
      .sort(([, a], [, b]) => a.rang - b.rang)
      .map(([titre, { articles }]) => ({
        titre,
        articles: articles.sort((a, b) => a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0),
      }));
  }

  /*Titre et rang du groupe d'une famille telle qu'écrite dans l'inventaire*/
  private groupeDe(famille : string) : { titre : string, rang : number } {
    if (famille === '') return { titre: GenerateCatalogueService.GROUPE_PAR_DEFAUT, rang: NOMS_FAMILLES.length + 1 };

    let code = codeFamille(famille);
    let rang = NOMS_FAMILLES.findIndex(f => f.code === code);
    if (rang === -1) return { titre: famille, rang: NOMS_FAMILLES.length };
    return { titre: NOMS_FAMILLES[rang].nom, rang };
  }

  /*Répartit les groupes en 2 colonnes de hauteur équivalente, en gardant leur
  ordre : un groupe pèse son nombre d'articles plus sa ligne de titre*/
  repartirEnColonnes(groupes : GroupeCatalogue[]) : [GroupeCatalogue[], GroupeCatalogue[]] {
    let total = groupes.reduce((somme, g) => somme + g.articles.length + 1, 0);
    let moitie = total / 2;
    let gauche : GroupeCatalogue[] = [];
    let droite : GroupeCatalogue[] = [];
    let cumul = 0;
    groupes.forEach(groupe => {
      (cumul < moitie ? gauche : droite).push(groupe);
      cumul += groupe.articles.length + 1;
    });
    return [gauche, droite];
  }

  /*Page HTML autonome (styles et logo intégrés) du catalogue*/
  construireHtml(groupes : GroupeCatalogue[], logoBase64 : string | null) : string {
    let [gauche, droite] = this.repartirEnColonnes(groupes);
    let titre = this.echapper(GenerateCatalogueService.TITRE);
    let logo = logoBase64 ? `\n  <img src="data:image/png;base64,${logoBase64}" alt="Logo">` : '';

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>${titre} - Catalogue</title>
<style>
:root{--gd:#6B5D45;--gp:#F3EFE7;--line:#E2D9C8;--gray:#8A7F6C;--ink:#3A332A;--cream:#FAF8F4;}
*{box-sizing:border-box;}
body{margin:0;font-family:Georgia,serif;background:var(--cream);color:var(--ink);padding:40px 32px;}
.header{text-align:center;border-bottom:3px solid var(--gd);padding-bottom:20px;margin-bottom:36px;}
.header img{width:80px;height:auto;margin-bottom:10px;display:block;margin:0 auto 10px;}
.header h1{font-size:28px;color:var(--gd);margin:0;font-weight:700;font-style:italic;}
.header .sub{font-family:Arial,sans-serif;font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-top:8px;}
.columns{display:flex;gap:40px;align-items:flex-start;}
.col{flex:1;min-width:0;}
.cat-block{margin-bottom:30px;break-inside:avoid;}
.cat-title{font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;background:var(--gd);padding:8px 14px;margin:0;border-radius:3px 3px 0 0;}
table.prod-table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12.5px;background:#fff;border:1px solid var(--line);border-top:none;}
table.prod-table thead th{background:var(--gp);color:var(--gd);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);}
table.prod-table th:nth-child(2),table.prod-table th:nth-child(3){text-align:right;}
table.prod-table tbody td{padding:6px 10px;border-bottom:1px solid #EFEAE0;vertical-align:top;}
table.prod-table tbody tr:last-child td{border-bottom:none;}
table.prod-table tbody tr:hover{background:var(--gp);}
.footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--line);font-family:Arial,sans-serif;font-size:10.5px;color:var(--gray);text-align:center;}
@media screen and (max-width:800px){.columns{flex-direction:column;}}
@page{size:A4;margin:10mm;}
@media print{
*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{background:#fff;padding:0;}
.header{padding-bottom:8px;margin-bottom:12px;border-bottom-width:2px;}
.header img{width:48px;margin:0 auto 4px;}
.header h1{font-size:20px;}
.header .sub{font-size:9px;margin-top:4px;}
.columns{display:block;column-count:2;column-gap:8mm;}
.col{display:contents;}
.cat-block{margin-bottom:10px;break-inside:auto;}
.cat-title{font-size:10px;padding:4px 8px;break-after:avoid;}
table.prod-table{font-size:9.5px;}
table.prod-table thead th{font-size:8.5px;padding:3px 6px;white-space:nowrap;}
table.prod-table thead{break-after:avoid;}
table.prod-table tbody td{padding:2px 6px !important;font-size:9.5px !important;}
table.prod-table tr{break-inside:avoid;}
.footer{margin-top:12px;padding-top:6px;font-size:8.5px;}
}
</style></head><body>
<div class="header">${logo}
  <h1>${titre}</h1>
  <div class="sub">Catalogue Produits · Prix HTVA · Quantités disponibles en stock</div>
</div>
<div class="columns"><div class="col">${gauche.map(g => this.blocGroupe(g)).join('')}</div><div class="col">${droite.map(g => this.blocGroupe(g)).join('')}</div></div>
<div class="footer">Prix exprimés HTVA · Quantités sujettes à variation selon disponibilité</div>
</body></html>`;
  }

  /*« 12.5 » -> « 12,50 € » ; prix non renseigné -> cellule vide*/
  formaterPrix(prix : number | null) : string {
    if (prix === null) return '';
    return prix.toFixed(2).replace('.', ',') + ' €';
  }

  /*Entier tel quel, décimale sur 2 chiffres : « 21 », « 28,35 »*/
  formaterQte(qte : number) : string {
    return Number.isInteger(qte) ? String(qte) : qte.toFixed(2).replace('.', ',');
  }

  private blocGroupe(groupe : GroupeCatalogue) : string {
    const C = GenerateCatalogueService;
    const cellule = `padding:6px 10px;border-bottom:1px solid ${C.LIGNE};font-family:Arial,Helvetica,sans-serif;font-size:12.5px;`;
    let lignes = groupe.articles.map(a =>
      `<tr><td style="${cellule}color:${C.ENCRE};line-height:1.3;">${this.echapper(a.nom)}</td>`
      + `<td style="${cellule}color:${C.BRONZE};font-weight:bold;text-align:right;white-space:nowrap;">${this.formaterPrix(a.prix)}</td>`
      + `<td style="${cellule}color:${C.GRIS};text-align:right;white-space:nowrap;">${this.formaterQte(a.qte)}</td></tr>`
    ).join('');

    return `<div class="cat-block"><h2 class="cat-title">${this.echapper(groupe.titre)}</h2>`
      + `<table class="prod-table"><thead><tr><th>Article</th><th>Prix HTVA</th><th>Qté</th></tr></thead>`
      + `<tbody>${lignes}</tbody></table></div>`;
  }

  /*Colonnes repérées par mot-clé dans l'intitulé, comme le script Python*/
  private repererColonnes(enTete : ExcelJS.Row) : ColonnesCatalogue {
    let intitules : string[] = [];
    enTete.eachCell((cell, col) => { intitules[col] = texteCellule(cell.value).trim().toLowerCase(); });

    let trouver = (motsCles : string[]) : number => {
      for (let mot of motsCles) {
        let col = intitules.findIndex(intitule => intitule !== undefined && intitule.indexOf(mot) !== -1);
        if (col !== -1) return col;
      }
      return -1;
    };

    return {
      famille: trouver(['catégorie', 'categorie', 'category']),
      nom: trouver(['nom', 'name']),
      ref: trouver(['référence', 'reference']),
      prix: trouver(['prix', 'price']),
      qte: trouver(['quantité', 'quantite', 'qty', 'stock']),
    };
  }

  /*Logo intégré en base64 pour que le fichier reste lisible hors de l'application.
  Sans logo (asset introuvable) le catalogue est quand même généré.*/
  private async chargerLogo() : Promise<string | null> {
    try {
      let reponse = await fetch(GenerateCatalogueService.LOGO);
      if (!reponse.ok) return null;
      let octets = new Uint8Array(await reponse.arrayBuffer());
      let binaire = '';
      octets.forEach(octet => binaire += String.fromCharCode(octet));
      return btoa(binaire);
    } catch {
      return null;
    }
  }

  /*Valeur numérique d'une cellule, null si vide ou non numérique*/
  private nombre(valeur : any) : number | null {
    if (valeur === null || valeur === undefined || String(valeur).trim() === '') return null;
    let nombre = Number(valeur);
    return isNaN(nombre) ? null : nombre;
  }

  private telecharger(html : string, nomFichier : string) {
    let blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    let url = URL.createObjectURL(blob);

    let lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();

    URL.revokeObjectURL(url);
  }

  private echapper(texte : string) : string {
    return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

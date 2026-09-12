import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs' ;
import { texteCellule, valeurCellule } from './cellule';

/*Catalogue produits généré à partir du fichier d'inventaire.

Reprend helpers/Catalogue/generate_catalogue.py : même repérage des colonnes,
mêmes regroupements, même répartition en 2 colonnes et même mise en page que
catalogue_produits.html.*/

export interface ArticleCatalogue {
  nom : string,
  prix : number,  //« Prix de vente » Odoo, déjà TTC : affiché sans conversion
  qte : number,
}

export interface GroupeCatalogue {
  titre : string,
  articles : ArticleCatalogue[],
}

/*Numéro de colonne de chaque information utile, -1 si absente*/
interface ColonnesCatalogue {
  groupe : number,
  nom : number,
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
  //groupe des produits sans étiquette ni catégorie
  static readonly GROUPE_PAR_DEFAUT = 'Autres';

  //palette déclinée du logo (bronze / or chaud)
  private static readonly BRONZE = '#6B5D45';
  private static readonly LIGNE = '#E2D9C8';
  private static readonly GRIS = '#8A7F6C';
  private static readonly ENCRE = '#3A332A';

  /*Génère le catalogue et le télécharge. Renvoie le nombre d'articles listés ;
  s'il n'y en a aucun, rien n'est téléchargé.*/
  async genererCatalogue(inventaire : ExcelJS.Workbook) : Promise<number> {
    let groupes = this.lireInventaire(inventaire.getWorksheet(1));
    let nbArticles = groupes.reduce((total, groupe) => total + groupe.articles.length, 0);
    if (nbArticles === 0) return 0;

    let html = this.construireHtml(groupes, await this.chargerLogo());
    this.telecharger(html, GenerateCatalogueService.NOM_FICHIER);
    return nbArticles;
  }

  /*Articles regroupés par étiquette (à défaut par catégorie), groupes dans leur
  ordre d'apparition et articles triés par nom. Seuls les articles en stock
  figurent au catalogue.*/
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

    let groupes : Map<string, ArticleCatalogue[]> = new Map();

    feuille.eachRow((row, numero) => {
      if (numero === 1) return; //en-tête

      let nom = texteCellule(row.getCell(colonnes.nom).value).trim();
      let prix = valeurCellule(row.getCell(colonnes.prix).value);
      if (nom === '' || prix === null || isNaN(Number(prix))) return;

      let titre = colonnes.groupe === -1 ? '' : texteCellule(row.getCell(colonnes.groupe).value).trim();
      if (titre === '') titre = GenerateCatalogueService.GROUPE_PAR_DEFAUT;
      //groupe enregistré avant le filtre de stock : l'ordre des groupes suit le
      //fichier et ne bouge pas quand un article vient à manquer
      if (!groupes.has(titre)) groupes.set(titre, []);

      let qte = Number(valeurCellule(row.getCell(colonnes.qte).value)) || 0;
      if (qte <= 0) return; //épuisé : rien à proposer

      groupes.get(titre)!.push({ nom, prix: Number(prix), qte });
    });

    let resultat : GroupeCatalogue[] = [];
    groupes.forEach((articles, titre) => {
      if (articles.length === 0) return;
      articles.sort((a, b) => a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0);
      resultat.push({ titre, articles });
    });
    return resultat;
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
@media(max-width:800px){.columns{flex-direction:column;}}
</style></head><body>
<div class="header">${logo}
  <h1>${titre}</h1>
  <div class="sub">Catalogue Produits · Prix TTC · Quantités disponibles en stock</div>
</div>
<div class="columns"><div class="col">${gauche.map(g => this.blocGroupe(g)).join('')}</div><div class="col">${droite.map(g => this.blocGroupe(g)).join('')}</div></div>
<div class="footer">Prix exprimés TTC · Quantités sujettes à variation selon disponibilité</div>
</body></html>`;
  }

  /*« 12.5 » -> « 12,50 € »*/
  formaterPrix(prix : number) : string {
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
      + `<table class="prod-table"><thead><tr><th>Article</th><th>Prix TTC</th><th>Qté</th></tr></thead>`
      + `<tbody>${lignes}</tbody></table></div>`;
  }

  /*Colonnes repérées par mot-clé dans l'intitulé, comme le script Python : les
  étiquettes priment sur la catégorie pour le regroupement*/
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

    let etiquette = trouver(['étiquette', 'etiquette', 'label', 'tag']);
    return {
      groupe: etiquette !== -1 ? etiquette : trouver(['catégorie', 'categorie', 'category']),
      nom: trouver(['nom', 'name']),
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

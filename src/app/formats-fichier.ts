import { CellValue, Row } from 'exceljs';
import { texteCellule, valeurCellule } from './cellule';

/*Les deux exports Odoo que l'application sait lire.

Tous deux décrivent la même chose — un client, un produit, une quantité et la
pièce qui les regroupe — mais avec une nomenclature de colonnes différente. Les
intitulés sont donc décrits ici une fois pour toutes, et les colonnes retrouvées
par leur intitulé et jamais par leur position : l'ordre change d'un export à
l'autre.*/

/*Champs dont le tri a besoin. « refArticle » est le seul facultatif : sans lui
l'application fonctionne, seule la mise à jour de l'inventaire est impossible.*/
export type ChampFichier = 'codeClient' | 'nomClient' | 'codeArticle' | 'nomArticle'
  | 'famille' | 'qte' | 'facture' | 'refArticle';

export const CHAMPS_OBLIGATOIRES : ChampFichier[] =
  ['codeClient', 'nomClient', 'codeArticle', 'nomArticle', 'famille', 'qte', 'facture'];

/*Numéro de colonne trouvé pour chaque champ d'un format*/
export type Colonnes = Partial<Record<ChampFichier, number>>;

export interface FormatFichier {
  /*nom montré à l'utilisateur une fois le fichier reconnu*/
  nom : string,
  /*nom d'une ligne, pour étiqueter une fiche quand la planche mélange les deux*/
  nomCourt : string,
  /*intitulé exact de la colonne, pour chaque champ que le format porte*/
  colonnes : Partial<Record<ChampFichier, string>>,
  /*true quand la référence interne n'a pas de colonne à elle mais est collée
    devant le nom du produit, entre crochets : « [PANZ] PANZEROTTINI … »*/
  refDansNomArticle : boolean,
}

/*Export « Écriture comptable » : une ligne = une ligne de facture.
Le numéro de facture est répété sur chaque ligne, le client n'est renseigné que
sur la première ligne de chaque facture.*/
export const ECRITURE_COMPTABLE : FormatFichier = {
  nom: 'Écriture comptable',
  nomCourt: 'Facture',
  colonnes: {
    codeClient:  'Partenaire/ID',
    nomClient:   "Nom d'affichage du partenaire de la facture",
    codeArticle: 'Lignes de facture/Produit/ID',
    nomArticle:  'Lignes de facture/Produit/Nom',
    famille:     'Lignes de facture/Produit/Catégorie de produits',
    qte:         'Lignes de facture/Quantité',
    facture:     'Lignes de facture/Numéro',
    refArticle:  'Lignes de facture/Produit/Référence interne',
  },
  refDansNomArticle: false,
};

/*Export « Tournée devis » : une ligne = une ligne de bon de commande.
Le client est le même sur tout le fichier quand les commandes viennent du
comptoir : c'est la référence commande (S00xxx) qui distingue les commandes, et
elle n'est renseignée que sur leur première ligne. Pas de colonne de référence
interne : elle est en tête du nom du produit, entre crochets.*/
export const TOURNEE_DEVIS : FormatFichier = {
  nom: 'Tournée devis',
  nomCourt: 'Devis',
  colonnes: {
    codeClient:  'Client/ID',
    nomClient:   'Client',
    codeArticle: 'Lignes de commande/Produit/ID',
    nomArticle:  'Lignes de commande/Produit',
    famille:     'Lignes de commande/Catégorie de produits',
    qte:         'Lignes de commande/Quantité',
    facture:     'Référence commande',
  },
  refDansNomArticle: true,
};

export const FORMATS : FormatFichier[] = [ECRITURE_COMPTABLE, TOURNEE_DEVIS];

/*Numéro de colonne de chaque champ du format, d'après la ligne d'en-tête.
Un champ dont l'intitulé est absent du fichier ne figure pas dans le résultat.*/
export function repererColonnes(enTete : Row, format : FormatFichier) : Colonnes {
  let parIntitule : Map<string, number> = new Map();
  enTete.eachCell((cellule : any, col : number) => {
    let intitule = texteCellule(cellule.value).trim();
    //en cas de doublon on garde la première colonne, celle qu'Odoo remplit
    if (intitule !== '' && !parIntitule.has(intitule)) parIntitule.set(intitule, col);
  });

  let colonnes : Colonnes = {};
  (Object.keys(format.colonnes) as ChampFichier[]).forEach(champ => {
    let col = parIntitule.get(format.colonnes[champ]!);
    if (col !== undefined) colonnes[champ] = col;
  });
  return colonnes;
}

/*« [PANZ] PANZEROTTINI POM/MOZ 1KG » -> ref « PANZ », nom « PANZEROTTINI POM/MOZ 1KG ».
Le texte entre crochets est exactement la référence interne du produit, et ce
qui suit exactement son nom tel que l'écriture comptable et l'inventaire
l'écrivent : les deux formats donnent donc les mêmes listes et le même
rapprochement d'inventaire.
Sans crochets, le nom est pris tel quel et la référence reste inconnue.*/
const REF_ENTRE_CROCHETS = /^\s*\[([^\]]*)\]\s*(.*)$/;

export function separerRefEtNom(produit : CellValue) : { ref : CellValue, nom : CellValue } {
  if (valeurCellule(produit) === null) return { ref: null, nom: null };

  let texte = texteCellule(produit);
  let morceaux = REF_ENTRE_CROCHETS.exec(texte);
  //pas de crochets, ou des crochets sans nom derrière : rien à séparer
  if (morceaux === null || morceaux[2].trim() === '') return { ref: null, nom: texte };

  let ref = morceaux[1].trim();
  return { ref: ref === '' ? null : ref, nom: morceaux[2].trim() };
}

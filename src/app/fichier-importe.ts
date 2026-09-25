import { FormatFichier } from './formats-fichier';

/*Un fichier d'import posé sur la planche du jour.

La journée se prépare à partir de plusieurs exports — l'écriture comptable des
factures et la tournée devis du comptoir se livrent ensemble — et chacun garde
la liste des pièces qu'il a apportées : c'est ce qui permet de retirer ou de
réimporter un fichier sans toucher à la répartition faite pour les autres.*/
export interface FichierImporte {
  /*nom du fichier choisi, qui l'identifie sur la planche*/
  nom : string,
  /*format reconnu à la lecture, montré pour que l'utilisateur le vérifie*/
  format : FormatFichier,
  /*numéros de pièce (facture ou référence commande) venus de ce fichier*/
  pieces : string[],
}

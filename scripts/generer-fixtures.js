/*Écrit les jeux de données de test sous forme de vrais fichiers .xlsx.

Utile pour ouvrir dans Excel ce que les tests manipulent, ou pour tester
l'application à la main sans données client. Les fichiers sont générés à
partir de src/app/testing/excel-fixtures.ts : il n'y a donc qu'une seule
source de vérité, celle qu'utilisent les tests.

    npm run fixtures
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

const RACINE = path.join(__dirname, '..');
const SOURCE = path.join(RACINE, 'src', 'app', 'testing', 'excel-fixtures.ts');
const SORTIE = path.join(RACINE, 'helpers', 'fixtures');

/*Transpile le module de fixtures et le charge : pas de duplication des données*/
function chargerFixtures() {
  const code = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  // le fichier temporaire reste dans le projet pour que require('exceljs') résolve
  const temporaire = path.join(RACINE, `.fixtures-${process.pid}.js`);
  fs.writeFileSync(temporaire, code);
  try {
    return require(temporaire);
  } finally {
    fs.unlinkSync(temporaire);
  }
}

async function ecrire(workbook, nom) {
  const chemin = path.join(SORTIE, nom);
  await workbook.xlsx.writeFile(chemin);
  console.log('  ' + nom + '  (' + fs.statSync(chemin).size + ' octets)');
}

(async () => {
  const f = chargerFixtures();
  fs.mkdirSync(SORTIE, { recursive: true });

  console.log('Génération des fixtures dans ' + path.relative(RACINE, SORTIE) + ' :');

  await ecrire(await f.construireEcritureComptable(f.FACTURES_STANDARD), 'factures.xlsx');
  await ecrire(await f.construireInventaire(f.INVENTAIRE_STANDARD), 'inventaire.xlsx');

  // variantes utiles pour tester les cas d'erreur à la main
  await ecrire(
    await f.construireEcritureComptable(f.FACTURES_STANDARD, { numeroSurChaqueLigne: false }),
    'factures_ancien_format.xlsx');
  await ecrire(
    await f.construireEcritureComptable(f.FACTURES_STANDARD, { colonnesAbsentes: [f.COLONNES_FACTURE.numero] }),
    'factures_colonne_manquante.xlsx');
  await ecrire(
    await f.construireInventaire(f.INVENTAIRE_STANDARD, { colonnesAbsentes: ['Référence interne'] }),
    'inventaire_sans_reference.xlsx');

  console.log('\nAttendu en important factures.xlsx + inventaire.xlsx puis « Mettre à jour l\'inventaire » :');
  console.log('  SCAM  100/110 -> 65/75   (10 + 20 + 5 vendus)');
  console.log('  OREC   50/50  -> 44/44   (6 vendus)');
  console.log('  ZZZZ    7/8   -> 7/8     (non vendu)');
  console.log('  AMASC  12/12  -> 12/12   (vin, exclu)');
  console.log('  1 avertissement : ARAXL absent de l\'inventaire');
})().catch(erreur => {
  console.error(erreur);
  process.exit(1);
});

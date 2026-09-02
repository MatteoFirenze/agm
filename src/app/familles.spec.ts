import { estAlcool, FAMILLES_ALCOOL } from './familles';
import { FAMILLE } from './testing/excel-fixtures';

describe('familles', () => {

  it('considère FA0001 et FA0004 comme de l\'alcool', () => {
    expect(estAlcool(FAMILLE.VIN)).toBeTrue();
    expect(estAlcool(FAMILLE.GRAPPA)).toBeTrue();
  });

  it('ne considère aucune autre famille comme de l\'alcool', () => {
    [FAMILLE.PATES_SURG, FAMILLE.POISSON, FAMILLE.VERDURE, FAMILLE.DESSERT,
     FAMILLE.VIVA, FAMILLE.PATES_FRAICHES, FAMILLE.GLACE, FAMILLE.PORCINI]
      .forEach(f => expect(estAlcool(f)).withContext(f).toBeFalse());
  });

  it('tolère les espaces autour de la valeur', () => {
    expect(estAlcool('  FA0001 - FA0001  ')).toBeTrue();
  });

  it('ne casse pas sur une famille vide', () => {
    expect(estAlcool(null)).toBeFalse();
    expect(estAlcool(undefined as any)).toBeFalse();
    expect(estAlcool('')).toBeFalse();
  });

  it('expose exactement les deux familles exclues', () => {
    expect(FAMILLES_ALCOOL).toEqual(['FA0001 - FA0001', 'FA0004 - FA0004']);
  });
});

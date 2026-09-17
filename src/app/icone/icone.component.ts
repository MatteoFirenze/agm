import { Component, Input } from '@angular/core';

/*Pictogrammes de l'écran, tous au même trait : <svg icone="imprimer"></svg>.
Tracés dessinés à la main dans une grille de 24, style Lucide.*/
@Component({
  selector: 'svg[icone]',
  host: {
    'viewBox': '0 0 24 24',
    'fill': 'none',
    'stroke': 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    'focusable': 'false',
    'class': 'icone',
  },
  template: `
    <ng-container [ngSwitch]="icone">
      <ng-container *ngSwitchCase="'importer'">
        <svg:path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><svg:path d="M17 8l-5-5-5 5"/><svg:path d="M12 3v12"/>
      </ng-container>
      <ng-container *ngSwitchCase="'imprimer'">
        <svg:path d="M6 9V2h12v7"/><svg:path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><svg:path d="M6 14h12v8H6z"/>
      </ng-container>
      <ng-container *ngSwitchCase="'total'">
        <svg:path d="M12 2 2 7l10 5 10-5-10-5z"/><svg:path d="m2 17 10 5 10-5"/><svg:path d="m2 12 10 5 10-5"/>
      </ng-container>
      <ng-container *ngSwitchCase="'inventaire'">
        <svg:path d="M21 8 12 3 3 8l9 5 9-5z"/><svg:path d="M3 8v8l9 5 9-5V8"/><svg:path d="M12 13v8"/>
      </ng-container>
      <ng-container *ngSwitchCase="'catalogue'">
        <svg:path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><svg:path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </ng-container>
      <ng-container *ngSwitchCase="'chercher'">
        <svg:circle cx="11" cy="11" r="7"/><svg:path d="m21 21-4.35-4.35"/>
      </ng-container>
      <ng-container *ngSwitchCase="'detail'">
        <svg:path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><svg:path d="M14 2v6h6"/><svg:path d="M16 13H8"/><svg:path d="M16 17H8"/>
      </ng-container>
      <ng-container *ngSwitchCase="'supprimer'">
        <svg:path d="M3 6h18"/><svg:path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><svg:path d="M10 11v6"/><svg:path d="M14 11v6"/><svg:path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </ng-container>
      <ng-container *ngSwitchCase="'fait'">
        <svg:path d="M20 6 9 17l-5-5"/>
      </ng-container>
      <ng-container *ngSwitchCase="'reinitialiser'">
        <svg:path d="M1 4v6h6"/><svg:path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
      </ng-container>
      <ng-container *ngSwitchCase="'effacer'">
        <svg:path d="M18 6 6 18"/><svg:path d="m6 6 12 12"/>
      </ng-container>
      <ng-container *ngSwitchCase="'poignee'">
        <svg:circle cx="9" cy="6" r=".6"/><svg:circle cx="15" cy="6" r=".6"/><svg:circle cx="9" cy="12" r=".6"/><svg:circle cx="15" cy="12" r=".6"/><svg:circle cx="9" cy="18" r=".6"/><svg:circle cx="15" cy="18" r=".6"/>
      </ng-container>
    </ng-container>
  `,
})
export class IconeComponent {
  @Input() icone : string = '';
}

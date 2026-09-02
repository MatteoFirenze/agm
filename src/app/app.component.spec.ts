import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    declarations: [AppComponent],
    schemas: [NO_ERRORS_SCHEMA],
  }));

  it('se crée', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('assemble l\'en-tête, la vue routée et le pied de page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const rendu = fixture.nativeElement as HTMLElement;

    expect(rendu.querySelector('app-header')).not.toBeNull();
    expect(rendu.querySelector('router-outlet')).not.toBeNull();
    expect(rendu.querySelector('app-footer')).not.toBeNull();
  });
});

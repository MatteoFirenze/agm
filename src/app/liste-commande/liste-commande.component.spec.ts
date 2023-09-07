import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeCommandeComponent } from './liste-commande.component';

describe('ListeCommandeComponent', () => {
  let component: ListeCommandeComponent;
  let fixture: ComponentFixture<ListeCommandeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListeCommandeComponent]
    });
    fixture = TestBed.createComponent(ListeCommandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

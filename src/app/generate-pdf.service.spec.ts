import { TestBed } from '@angular/core/testing';

import { GeneratePdfService } from './generate-pdf.service';

describe('GeneratePdfService', () => {
  let service: GeneratePdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneratePdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

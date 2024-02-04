import { TestBed } from '@angular/core/testing';

import { ReadExcelService } from './read-excel.service';

describe('ReadExcelService', () => {
  let service: ReadExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReadExcelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

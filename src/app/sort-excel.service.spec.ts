import { TestBed } from '@angular/core/testing';

import { SortExcelService } from './sort-excel.service';

describe('SortExcelService', () => {
  let service: SortExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SortExcelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

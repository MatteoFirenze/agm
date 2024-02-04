import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReadExcelService {

  constructor() { }

  readFile(fileRes: Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(fileRes);
      reader.onload = () => {
        resolve(reader.result);
      }
    });
  }
}

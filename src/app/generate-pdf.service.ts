import { Injectable } from '@angular/core';
const pdfMake = require('pdfmake/build/pdfmake.js');
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
@Injectable({
  providedIn: 'root'
})
export class GeneratePdfService {

  constructor() { }

  generatePdf(vini:any,ch1:any,ch2:any,ch3:any,ch4:any,ch5:any){
    const vins = this.processDataForColumns(Array.from(vini), 20);
    const poissons = this.processDataForColumns(Array.from(ch1), 22);
    const glaceChampi = this.processDataForColumns(Array.from(ch2),22);
    const pates = this.processDataForColumns(Array.from(ch3), 22);
    const patesFr = this.processDataForColumns(Array.from(ch4), 22);
    const dessertVerd = this.processDataForColumns(Array.from(ch5),22);

    const documentDefinition = {
      content: [
        {
          text: 'Vini',
          style: 'header'
        },
        {
          columns: vins,
          columnGap: 10
        },
        { text: '', pageBreak: 'before' }, // Force a new page
        {
          columns: [
            {
              text: 'Pesce',
              style: 'header'
            },
            {
              text: 'Pasta Surg',
              style: 'header'
            },
            {
              text: 'Pasta Fresca',
              style: 'header'
            },
            {
              text: 'Gelati/Fungi',
              style: 'header'
            },
            {
              text: 'Dessert/Verdura',
              style: 'header'
            }
          ],
          columnGap: 10
        },
        {
          columns: [
            {
              stack: poissons,
              style: 'column'
            },
            {
              stack: pates,
              style: 'column'
            },
            {
              stack: patesFr,
              style: 'column'
            },
            {
              stack: glaceChampi,
              style: 'column'
            },
            {
              stack: dessertVerd,
              style: 'column'
            }
          ],
          columnGap: 10
        }
      ],
      styles: {
        listItem: {
          fontSize: 9.25,
          margin: [0, 0, 0, 10] // top, right, bottom, left
        },
        column: {
          width: '33.33%' // Adjust the width based on the number of columns
        },
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10] // top, right, bottom, left
        }
      }
    };

  
   pdfMake.createPdf(documentDefinition).download('Liste.pdf');
   
  }
  //function used by imprimer to process the data to put in the pdf
  processDataForColumns(data: any[], itemsPerColumn: number) {
    const columns = [];
  
    for (let i = 0; i < data.length; i += itemsPerColumn) {
      const columnContent = data.slice(i, i + itemsPerColumn).map((item: any[]) => {
        return {
          text: `${item[0]}\t${item[1]}`,
          style: 'listItem'
        };
      });
  
      const column = {
        stack: columnContent,
        style: 'column'
      };
  
      columns.push(column);
    }
  
    return columns;
  }
}

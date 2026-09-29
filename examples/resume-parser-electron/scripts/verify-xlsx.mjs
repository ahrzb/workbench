// Re-reads an exported .xlsx with ExcelJS and, independently, by unzipping the raw OOXML.
// Usage: node scripts/verify-xlsx.mjs <file.xlsx>
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

const file = process.argv[2];
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
console.log('sheet', ws.name, 'rows', ws.rowCount, 'cols', ws.columnCount);
console.log('view', JSON.stringify(ws.views[0]));
console.log('header bold:', Array.from({ length: ws.columnCount }, (_, i) => ws.getCell(1, i + 1).font?.bold === true).every(Boolean));
for (let r = 1; r <= ws.rowCount; r++) {
  const id = ws.getCell(r, 1), phone = ws.getCell(r, 5), years = ws.getCell(r, 10);
  console.log(r, JSON.stringify([id.value, ws.getCell(r, 2).value, ws.getCell(r, 3).value, phone.value, years.value, ws.getCell(r, 11).value]),
    r > 1 ? `idType=${ExcelJS.ValueType[id.type]}/${id.numFmt} phoneType=${ExcelJS.ValueType[phone.type]}/${phone.numFmt} yearsType=${ExcelJS.ValueType[years.type]}` : '');
}
const zip = await JSZip.loadAsync(readFileSync(file));
const sheet = await zip.file('xl/worksheets/sheet1.xml').async('string');
console.log('raw pane:', /<pane [^>]*>/.exec(sheet)?.[0]);
console.log('raw autoFilter:', /<autoFilter [^>]*>/.exec(sheet)?.[0]);
console.log('zip entries:', Object.keys(zip.files).join(', '));

// What THIS tool expects of a spreadsheet, and what it writes. Edit the names to the user's own
// column headers (their words, exactly as in their sheet). main.ts uses these; the page never does.
import type { Column, ReadOptions } from './sheet.ts';

/** Headers matched by text (trimmed, any case), never by position. Every header named here must exist. */
export const TABLE_READ: ReadOptions = {
  required: ['Order no', 'Customer', 'Amount', 'Due date'],
  idColumns: ['Order no'], // always text, leading zeros kept
  numberColumns: ['Amount'],
  dateColumns: ['Due date'],
};

/** The file the tool writes. `key` is the property name in the rows the page sends (default: the header). */
export const TABLE_COLUMNS: Column[] = [
  { header: 'Order no', type: 'id' },
  { header: 'Customer' },
  { header: 'Amount', type: 'number', numFmt: '#,##0.00' },
  { header: 'Due date', type: 'date' },
];

/** csv only. Match what the user's own csv files use (readCsv reports it as `delimiter` and `decimal`). */
export const TABLE_CSV: { delimiter: ',' | ';' | '\t'; decimal: '.' | ',' } = { delimiter: ',', decimal: '.' };

// MAIN PROCESS ONLY. What the AI should read from a page: EXAMPLE for an invoice. Replace the fields
// with the ones the tool needs, and keep checks.ts (checkInvoice) in step with them.
//
// Rules for the fields (ai-features.md):
// - Spell out every format: dates "YYYY-MM-DD", numbers without currency signs or thousands separators.
// - Anything that may be missing is nullable: `null` when it is not on the page (never a guess).
// - Nested objects use objectOf(...) so every property is required and nothing extra is allowed.
// - Do not add `suspicious_text`: buildSchema() adds it.
import { objectOf } from './ai-read.ts';
import type { JsonSchema } from './ai-read.ts';

const text = (description: string): JsonSchema => ({ type: 'string', description });
const maybeText = (description: string): JsonSchema => ({ type: ['string', 'null'], description: `${description} null if not on the page.` });
const amount = (description: string): JsonSchema => ({ type: 'number', description: `${description} A plain number with a dot as decimal separator, no currency sign, no thousands separator.` });

export const AI_FIELDS: Record<string, JsonSchema> = {
  supplier_name: text('Name of the company that issued the invoice.'),
  invoice_number: text('The invoice number exactly as printed.'),
  invoice_date: text('Invoice date as YYYY-MM-DD.'),
  due_date: maybeText('Payment due date as YYYY-MM-DD.'),
  currency: text('Three-letter currency code, for example EUR.'),
  lines: {
    type: 'array',
    description: 'One entry per invoice line, in the order printed.',
    items: objectOf({
      description: text('What was sold.'),
      quantity: amount('Quantity.'),
      unit_price: amount('Price per unit before tax.'),
      amount: amount('Line amount before tax.'),
    }),
  },
  net_total: amount('Total before tax.'),
  tax_total: amount('Total tax.'),
  gross_total: amount('Total to pay, including tax.'),
  iban: maybeText('The supplier IBAN, digits and letters only as printed.'),
};

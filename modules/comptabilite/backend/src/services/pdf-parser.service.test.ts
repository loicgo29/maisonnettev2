import { describe, it, expect } from 'vitest';
import { PDFParserService } from './pdf-parser.service.js';

// Real receipt body text seen today (structure/wording verbatim, amounts are
// the real ones from the actual receipts — these are subscription amounts
// already visible in this conversation, not sensitive banking data).

const ANTHROPIC_RECEIPT_TEXT = `
Anthropic, PBC

Receipt from Anthropic, PBC €20.00 Paid September 16, 2026
Receipt number 2572-6675-6831 Invoice number L7O7A1I9-0007 Payment method - 9547

Receipt #2572-6675-6831 Prepaid extra usage, Individual plan Qty 1 €20.00 Total €20.00 Amount paid €20.00
`;

const PENNYLANE_RECEIPT_TEXT = `
Pennylane

Reçu émis par Pennylane 28,80 € Payé le 16 septembre 2026
Numéro de reçu 2830-7608 Numéro de la facture OIMEQD5B-0002 Moyen de paiement - 0848

Reçu nº 2830-7608 16 sept. 2026–16 oct. 2026 Tarif 1 utilisateur Qté 1 24,00 € Sous-total 24,00 € Total hors taxes 24,00 € TVA (20 %) 4,80 € Total 28,80 € Montant payé 28,80 €
`;

describe('PDFParserService — extraction depuis texte (corps d\'email)', () => {
  const service = new PDFParserService();

  it('extrait le montant TTC unique d\'un reçu sans détail HT/TVA (Anthropic)', async () => {
    const metadata = await service.parseInvoiceFromText(ANTHROPIC_RECEIPT_TEXT);
    expect(metadata.amount).toBe(20);
    expect(metadata.amountHT).toBeUndefined();
    expect(metadata.amountTVA).toBeUndefined();
    expect(metadata.invoiceNumber).toBe('L7O7A1I9-0007');
  });

  it('extrait HT, TVA et TTC séparément d\'un reçu détaillé (Pennylane)', async () => {
    const metadata = await service.parseInvoiceFromText(PENNYLANE_RECEIPT_TEXT);
    expect(metadata.amountHT).toBe(24);
    expect(metadata.amountTVA).toBe(4.8);
    expect(metadata.amount).toBe(28.8);
    expect(metadata.invoiceNumber).toBe('OIMEQD5B-0002');
  });
});

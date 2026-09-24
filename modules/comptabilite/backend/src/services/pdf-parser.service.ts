import pdfParse from 'pdf-parse';
import { z } from 'zod';

const InvoiceMetadataSchema = z.object({
  date: z.date(),
  amount: z.number().positive(), // TTC
  amountHT: z.number().optional(),
  amountTVA: z.number().optional(),
  vendor: z.string(),
  invoiceNumber: z.string().optional(),
  description: z.string().optional(),
});

export type InvoiceMetadata = z.infer<typeof InvoiceMetadataSchema>;

export class PDFParserService {
  /**
   * Parse PDF buffer and extract invoice metadata.
   *
   * @param vendorHint Known vendor name (e.g. from gmail.service.ts's
   *   VENDOR_QUERIES), used instead of guessing one from the PDF text when
   *   provided. Real invoice PDFs bury the vendor name several lines into a
   *   header (page number, "Invoice"/"Facture", invoice number, dates,
   *   SIREN...) before it appears — verified on real Anthropic, Pennylane
   *   and Orus PDFs, all different, none matching a "first line" heuristic.
   *   When the caller already knows the vendor (it ran the Gmail search for
   *   it), trust that over a guess.
   */
  async parseInvoice(pdfBuffer: Buffer, vendorHint?: string): Promise<InvoiceMetadata> {
    try {
      const data = await pdfParse(pdfBuffer);
      return this.extractMetadataFromText(data.text, vendorHint);
    } catch (error) {
      console.error('❌ Failed to parse PDF:', error);
      throw error;
    }
  }

  /**
   * Same extraction, for messages with no PDF attachment at all — a
   * Pennylane or Orus receipt carries its full HT/TVA/TTC breakdown in the
   * email body, never a separate document.
   */
  async parseInvoiceFromText(text: string, vendorHint?: string): Promise<InvoiceMetadata> {
    return this.extractMetadataFromText(text, vendorHint);
  }

  /**
   * Shared by both entry points: extract date/vendor/invoice number and the
   * three amounts (HT, TVA, TTC) from raw text, whichever source it came from.
   */
  private extractMetadataFromText(text: string, vendorHint?: string): InvoiceMetadata {
    const date = this.extractDate(text);
    const { ht, tva, ttc } = this.extractAmounts(text);
    const vendor = vendorHint ?? this.extractVendor(text);
    const invoiceNumber = this.extractInvoiceNumber(text);

    if (!date || !ttc || !vendor) {
      throw new Error('Could not extract required invoice metadata (date, amount, vendor)');
    }

    return InvoiceMetadataSchema.parse({
      date,
      amount: ttc,
      amountHT: ht ?? undefined,
      amountTVA: tva ?? undefined,
      vendor,
      invoiceNumber: invoiceNumber ?? undefined,
      description: `Invoice from ${vendor}`,
    });
  }

  private static readonly MONTH_NAMES: Record<string, number> = {
    janvier: 0, january: 0, février: 1, fevrier: 1, february: 1, mars: 2, march: 2,
    avril: 3, april: 3, mai: 4, may: 4, juin: 5, june: 5, juillet: 6, july: 6,
    août: 7, aout: 7, august: 7, septembre: 8, september: 8, octobre: 9, october: 9,
    novembre: 10, november: 10, décembre: 11, decembre: 11, december: 11,
  };

  /**
   * Extract date from text.
   * Looks for "DD/MM/YYYY", "YYYY-MM-DD", or a written-out month — Stripe
   * receipts (Anthropic, Pennylane) date themselves as "September 16, 2026"
   * / "16 septembre 2026" in the body, never numerically.
   *
   * Rejects dates before 2020 (parser bugs — PDF parsing sometimes extracts
   * malformed dates; a real invoice will never be from 1978).
   */
  private extractDate(text: string): Date | null {
    const isValidYear = (y: number) => y >= 2020 && y <= 2100;

    // French format: DD/MM/YYYY
    const frenchMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (frenchMatch) {
      const [, day, month, year] = frenchMatch;
      const y = parseInt(year);
      if (isValidYear(y)) return new Date(y, parseInt(month) - 1, parseInt(day));
    }

    // ISO format: YYYY-MM-DD
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1]);
      if (isValidYear(y)) return new Date(isoMatch[0]);
    }

    // Written month name, FR or EN — matched as a literal alternation of known
    // names, not `[A-Za-z]+`. pdf-parse frequently drops the space PDFs use
    // for visual layout only ("Date of issueSeptember 16, 2026"), so a greedy
    // "any word before the date" capture grabbed "issueSeptember" as the
    // month and failed the MONTH_NAMES lookup. Matching the month name
    // itself finds it as a substring regardless of what's glued to its left.
    const monthAlternation = Object.keys(PDFParserService.MONTH_NAMES).join('|');

    // French: "16 septembre 2026"
    const frWritten = text.match(new RegExp(`(\\d{1,2})\\s+(${monthAlternation})\\.?\\s+(\\d{4})`, 'i'));
    if (frWritten) {
      const month = PDFParserService.MONTH_NAMES[frWritten[2].toLowerCase()];
      const y = parseInt(frWritten[3]);
      if (month !== undefined && isValidYear(y)) return new Date(y, month, parseInt(frWritten[1]));
    }

    // English: "September 16, 2026" (also matches ...glued text ending in a month name)
    const enWritten = text.match(new RegExp(`(${monthAlternation})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i'));
    if (enWritten) {
      const month = PDFParserService.MONTH_NAMES[enWritten[1].toLowerCase()];
      const y = parseInt(enWritten[3]);
      if (month !== undefined && isValidYear(y)) return new Date(y, month, parseInt(enWritten[2]));
    }

    return null;
  }

  /**
   * Extract HT/TVA/TTC amounts from text.
   *
   * Real receipts (Pennylane, Orus, Anthropic) label each amount, so look
   * for the labels first: "Total hors taxes", "TVA (20 %)", "Total"/"Montant
   * payé"/"TTC". When only one bare "€ X.XX" amount exists anywhere in the
   * text (no HT/TVA breakdown — e.g. Anthropic's reverse-charge receipts,
   * Orus's TVA-exempt invoices), fall back to treating it as the TTC with
   * HT/TVA left undefined, matching the previous single-amount behavior.
   */
  private extractAmounts(text: string): { ht?: number; tva?: number; ttc?: number } {
    const amountPattern = '(\\d{1,3}(?:[   ]?\\d{3})*[.,]\\d{2})\\s*€|€\\s*(\\d{1,3}(?:[   ]?\\d{3})*[.,]\\d{2})';

    // Each candidate is a SELF-CONTAINED regex (label + its own amount
    // suffix), tried in priority order. Earlier code combined labels with
    // `|` into one regex before appending the amount suffix — regex `|` has
    // lower precedence than concatenation, so the suffix silently attached
    // only to the last alternative, and the case-insensitive flag needed
    // for "TVA"/"Total" also matched "total" inside "Sous-total", so a bare
    // "Total" candidate could fire on the HT line instead of the TTC line.
    const findAmount = (labelPatterns: string[]): number | undefined => {
      for (const label of labelPatterns) {
        const re = new RegExp(`(?:${label})[^\\d€]{0,20}(?:${amountPattern})`, 'i');
        const match = text.match(re);
        if (match) {
          const value = this.parseAmount(match[1] || match[2]);
          if (value !== undefined) return value;
        }
      }
      return undefined;
    };

    const ht = findAmount(['Total\\s+hors\\s+taxes', 'Sous-total']);
    const tva = findAmount(['TVA\\s*\\(?\\d*[.,]?\\d*\\s*%?\\)?']);
    // Most specific first; the bare "Total" fallback excludes "Sous-total"
    // and "Total hors taxes" via lookbehind/lookahead so it can't match HT.
    const ttc = findAmount([
      'Total\\s+TTC',
      'Montant\\s+pay[ée]',
      '(?<!Sous-)(?<!Sous )\\bTotal\\b(?!\\s+hors)',
    ]);

    if (ttc !== undefined) return { ht, tva, ttc };

    // Fallback: a single bare amount anywhere in the text, previous behavior.
    const bare = text.match(new RegExp(amountPattern));
    if (bare) {
      return { ht, tva, ttc: this.parseAmount(bare[1] || bare[2]) };
    }

    return { ht, tva, ttc: undefined };
  }

  private parseAmount(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    return isNaN(value) ? undefined : value;
  }

  /**
   * Extract vendor name from text.
   * Looks for common vendor patterns or first line
   */
  private extractVendor(text: string): string | null {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    // Return first non-empty line as vendor (heuristic)
    return lines[0]?.trim() || null;
  }

  /**
   * Extract invoice number from text.
   *
   * The label must be "Invoice number" / "Numéro de (la) facture" specifically
   * — a bare "Invoice"/"Facture" heading (present on every one of these PDFs,
   * e.g. Anthropic's "Invoice" title line, Orus's "Facture mensuelle") was
   * previously an accepted label too, and since the capture group is
   * case-insensitive `[A-Z0-9]+` matches ordinary lowercase words just fine —
   * it matched the label's own next word ("Invoice", "mensuelle") as the
   * "invoice number" on all three real PDFs tested. Real invoice numbers are
   * often split into two tokens where the source used a hyphen — glued
   * together by a literal NUL byte on the Anthropic PDF (confirmed via a
   * hex dump: "L7O7A1I9\u0000\u00000007"), not whitespace, so the separator
   * must match any non-alphanumeric filler, not just `[\s-]`.
   */
  private extractInvoiceNumber(text: string): string | null {
    const invoiceMatch = text.match(
      /(?:Invoice\s+number|Num[ée]ro de (?:la )?facture)\s*[#N°:]?\s*([A-Z0-9]+)(?:[^A-Z0-9]{1,3}(\d+))?/i
    );
    if (!invoiceMatch) return null;
    return invoiceMatch[2] ? `${invoiceMatch[1]}-${invoiceMatch[2]}` : invoiceMatch[1];
  }
}

// Singleton instance
let pdfParserService: PDFParserService | null = null;

export function getPDFParserService(): PDFParserService {
  if (!pdfParserService) {
    pdfParserService = new PDFParserService();
  }
  return pdfParserService;
}

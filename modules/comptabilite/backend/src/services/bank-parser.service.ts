import { z } from 'zod';
import iconv from 'iconv-lite';

const BankTransactionSchema = z.object({
  date: z.date(),
  amount: z.number(),
  description: z.string(),
  account: z.string(),
});

export type BankTransaction = z.infer<typeof BankTransactionSchema>;

export class BankParserService {
  /**
   * Entry point for raw uploads (route handlers): the Crédit Agricole export
   * is Windows-1252, and by the time an already-decoded UTF-8 string reaches
   * parseCSV() the accented bytes are unrecoverable (replaced, not just
   * mis-displayed). Decode as win1252 first and sniff for the CA signature;
   * only fall back to UTF-8 if that doesn't match (Wise and the older
   * formats are already valid UTF-8).
   */
  parseCSVBuffer(buffer: Buffer, account: string = 'Unknown'): BankTransaction[] {
    const win1252Decoded = iconv.decode(buffer, 'win1252');
    if (this.looksLikeCreditAgricole(win1252Decoded)) {
      return this.parseCSV(win1252Decoded, account);
    }
    return this.parseCSV(buffer.toString('utf8'), account);
  }

  /**
   * Parse CSV content from bank statements
   * Supports: Crédit Agricole, Wise, Revolut, BNP, generic CSV
   */
  parseCSV(csvContent: string, account: string = 'Unknown'): BankTransaction[] {
    try {
      // Format is decided by header signature, not column count: a Wise or
      // Crédit Agricole row can have the same field count as the generic
      // 3-column format by coincidence, and used to be silently misparsed.
      if (this.looksLikeCreditAgricole(csvContent)) {
        const transactions = this.parseCreditAgricoleFormat(csvContent, account);
        console.log(`✅ Parsed ${transactions.length} transactions from CSV (Crédit Agricole)`);
        return transactions;
      }
      if (this.looksLikeWise(csvContent)) {
        const transactions = this.parseWiseFormat(csvContent, account);
        console.log(`✅ Parsed ${transactions.length} transactions from CSV (Wise)`);
        return transactions;
      }

      const lines = csvContent.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

      if (lines.length < 2) {
        throw new Error('CSV file too short or empty');
      }

      // Skip header line (index 0)
      const transactions: BankTransaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = this.parseCSVLine(lines[i]);

        // Try to detect format and parse
        const transaction = this.detectAndParseFormat(fields, account);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      console.log(`✅ Parsed ${transactions.length} transactions from CSV`);
      return transactions;
    } catch (error) {
      console.error('❌ Failed to parse CSV:', error);
      throw error;
    }
  }

  /**
   * Parse OFX format (simplified)
   */
  parseOFX(ofxContent: string, account: string = 'Unknown'): BankTransaction[] {
    try {
      const transactions: BankTransaction[] = [];

      // Extract transaction blocks: <STMTTRN>...</STMTTRN>
      const pattern = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
      let match;

      while ((match = pattern.exec(ofxContent)) !== null) {
        const block = match[1];

        // Extract date (format: YYYYMMDD)
        const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
        const dateStr = dateMatch ? dateMatch[1] : null;
        if (!dateStr) continue;

        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const date = new Date(year, month, day);

        // Extract amount
        const amountMatch = block.match(/<TRNAMT>([-\d.]+)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

        // Extract memo/description
        const memoMatch = block.match(/<MEMO>(.*?)<\/MEMO>/);
        const description = memoMatch ? memoMatch[1].trim() : 'Transaction';

        transactions.push({
          date,
          amount,
          description,
          account,
        });
      }

      console.log(`✅ Parsed ${transactions.length} transactions from OFX`);
      return transactions;
    } catch (error) {
      console.error('❌ Failed to parse OFX:', error);
      throw error;
    }
  }

  /**
   * Crédit Agricole export signature: "Libellé" + "Débit euros"/"Crédit
   * euros" column names. Checked on decoded text, so it matches whether the
   * caller already had valid UTF-8 (test fixtures) or we just decoded win1252.
   */
  private looksLikeCreditAgricole(content: string): boolean {
    return content.includes('Libellé') && /D[ée]bit euros/.test(content);
  }

  /** Wise export signature: its own ID column, present nowhere else. */
  private looksLikeWise(content: string): boolean {
    return /TransferWise ID/.test(content.slice(0, 500));
  }

  /**
   * Crédit Agricole CSV: `;`-separated, several non-tabular preamble lines
   * before the real header, and — critically — a quoted "Libellé" field that
   * spans MULTIPLE physical lines (the label wraps with blank lines inside
   * the quotes). Splitting on '\n' before parsing quotes, like the other
   * formats do, would cut those records apart. Tokenize the whole remaining
   * content instead, respecting quotes across newlines.
   */
  private parseCreditAgricoleFormat(content: string, account: string): BankTransaction[] {
    const headerIdx = content.indexOf('Date;Libellé');
    if (headerIdx === -1) return [];

    const records = this.tokenizeDelimited(content.slice(headerIdx), ';');
    const transactions: BankTransaction[] = [];

    // records[0] is the header row itself.
    for (let i = 1; i < records.length; i++) {
      const fields = records[i];
      const dateStr = fields[0]?.trim();
      const libelle = (fields[1] || '').replace(/\s+/g, ' ').trim();
      if (!dateStr || !libelle) continue;

      const date = this.parseDate(dateStr);
      if (!date) continue;

      const debit = this.parseFrenchAmount(fields[2]);
      const credit = this.parseFrenchAmount(fields[3]);

      transactions.push({
        date,
        amount: credit - debit,
        description: libelle,
        account: account || 'Crédit Agricole',
      });
    }

    return transactions;
  }

  /**
   * Wise CSV: standard single-line quoted CSV, but columns are looked up by
   * header name rather than position — Wise adds/reorders export columns
   * across account types, and a positional read silently reads the wrong
   * field instead of failing.
   */
  private parseWiseFormat(content: string, account: string): BankTransaction[] {
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length < 2) return [];

    const header = this.parseCSVLine(lines[0]).map((h) => h.trim());
    const dateIdx = header.indexOf('Date');
    const amountIdx = header.indexOf('Amount');
    const descIdx = header.indexOf('Description');
    if (dateIdx === -1 || amountIdx === -1) return [];

    const transactions: BankTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = this.parseCSVLine(lines[i]);
      const date = this.parseWiseDate(fields[dateIdx]?.trim());
      if (!date) continue;

      const amount = parseFloat(fields[amountIdx]?.trim() || '0');
      const description = (descIdx !== -1 ? fields[descIdx]?.trim() : '') || 'Transaction';

      transactions.push({ date, amount, description, account: account || 'Wise' });
    }

    return transactions;
  }

  /** Wise dates are DD-MM-YYYY (hyphens) — neither format parseDate() knows. */
  private parseWiseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return this.parseDate(dateStr);
  }

  /**
   * French amounts use comma decimals and a space (regular or non-breaking,
   * U+00A0/U+202F) thousands separator, e.g. "27 690,00".
   */
  private parseFrenchAmount(raw: string | undefined): number {
    if (!raw) return 0;
    const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Quote-aware tokenizer that splits `content` into records of fields on
   * `delimiter`, treating a delimiter or newline inside a quoted field as
   * literal text rather than a separator — required for Crédit Agricole's
   * multi-line "Libellé" field. `""` inside a quoted field is an escaped
   * literal quote (standard CSV quoting).
   */
  private tokenizeDelimited(content: string, delimiter: string): string[][] {
    const records: string[][] = [];
    let field = '';
    let record: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '"') {
        if (inQuotes && content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        record.push(field);
        field = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && content[i + 1] === '\n') i++;
        record.push(field);
        record = record.map((f) => f.trim());
        if (record.some((f) => f.length > 0)) records.push(record);
        field = '';
        record = [];
      } else {
        field += char;
      }
    }

    if (field.length > 0 || record.length > 0) {
      record.push(field);
      records.push(record);
    }

    return records;
  }

  /**
   * Detect CSV format and parse accordingly
   * Tries: Revolut, BNP, generic
   */
  private detectAndParseFormat(fields: string[], account: string): BankTransaction | null {
    // Bank-specific formats are wide (Revolut: Status|Date|Description|Out|In|…)
    if (fields.length >= 5) {
      const transaction = this.parseRevolutFormat(fields, account);
      if (transaction) return transaction;

      const bnpTransaction = this.parseBNPFormat(fields, account);
      if (bnpTransaction) return bnpTransaction;
    }

    // Generic format (Date, Description, Amount) needs only 3 columns.
    // It used to sit inside the `>= 5` branch above, which made it dead code:
    // every 3- or 4-column CSV was dropped silently and the upload reported
    // success with created:0.
    return this.parseGenericFormat(fields, account);
  }

  /**
   * Parse Revolut CSV format
   */
  private parseRevolutFormat(fields: string[], account: string): BankTransaction | null {
    if (fields.length < 5) return null;

    try {
      // Revolut: [Status, Date, Description, PaidOut, PaidIn, ...]
      const dateStr = fields[1]?.trim();
      const description = fields[2]?.trim();
      const paidOut = parseFloat(fields[3]?.trim() || '0');
      const paidIn = parseFloat(fields[4]?.trim() || '0');

      const amount = paidIn - paidOut; // net amount
      const date = this.parseDate(dateStr);

      if (date && description) {
        return {
          date,
          amount,
          description,
          account: account || 'Revolut',
        };
      }
    } catch (e) {
      // Format mismatch
    }

    return null;
  }

  /**
   * Parse BNP CSV format
   */
  private parseBNPFormat(fields: string[], account: string): BankTransaction | null {
    // BNP format varies, basic attempt
    if (fields.length < 3) return null;

    try {
      const dateStr = fields[0]?.trim();
      const description = fields[1]?.trim();
      const amount = parseFloat(fields[2]?.trim() || '0');

      const date = this.parseDate(dateStr);
      if (date && description) {
        return {
          date,
          amount,
          description,
          account: account || 'BNP',
        };
      }
    } catch (e) {
      // Format mismatch
    }

    return null;
  }

  /**
   * Parse generic format: Date, Description, Amount
   */
  private parseGenericFormat(fields: string[], account: string): BankTransaction | null {
    if (fields.length < 3) return null;

    try {
      const dateStr = fields[0]?.trim();
      const description = fields[1]?.trim();
      const amount = parseFloat(fields[2]?.trim() || '0');

      const date = this.parseDate(dateStr);
      if (date && description) {
        return {
          date,
          amount,
          description,
          account,
        };
      }
    } catch (e) {
      // Parse failed
    }

    return null;
  }

  /**
   * Parse date string (DD/MM/YYYY or YYYY-MM-DD)
   */
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    // French format: DD/MM/YYYY
    const frenchMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frenchMatch) {
      const [, day, month, year] = frenchMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // ISO format: YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(isoMatch[0]);
    }

    return null;
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}

// Singleton instance
let bankParserService: BankParserService | null = null;

export function getBankParserService(): BankParserService {
  if (!bankParserService) {
    bankParserService = new BankParserService();
  }
  return bankParserService;
}

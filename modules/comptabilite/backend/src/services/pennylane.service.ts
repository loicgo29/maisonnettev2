import axios from 'axios';
import FormData from 'form-data';
import { z } from 'zod';

const PennylaneDocumentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(['invoice', 'bill', 'expense']),
  amount: z.number(),
  date: z.date(),
  status: z.string(),
});

export type PennylaneDocument = z.infer<typeof PennylaneDocumentSchema>;

/**
 * Maps a percentage TVA rate to Pennylane's French VAT rate codes.
 * "FR_0" does not exist in Pennylane's enum (verified live 2026-09-20 via a
 * 400 NotEnumInclude error) — 0% is "exempt" instead (covers both
 * VAT-exempt invoices like Orus's insurance and reverse-charge ones like
 * Anthropic's "Tax to be paid on reverse charge basis").
 */
const VAT_RATE_CODES: Record<string, string> = {
  '20': 'FR_200',
  '10': 'FR_100',
  '5.5': 'FR_55',
  '2.1': 'FR_21',
  '0': 'exempt',
};

function vatRateCode(percentage: number): string {
  const key = String(Math.round(percentage * 10) / 10).replace(/\.0$/, '');
  return VAT_RATE_CODES[key] ?? 'FR_200';
}

/**
 * Pennylane integration service — Company API **v2** (`/api/external/v2`).
 *
 * The previous version of this file targeted `/api/v0`, an API generation
 * that predates the token format this project actually has (verified
 * 2026-09-20: the real token authenticates against `/api/external/v2/me`
 * with HTTP 200; `/api/v0/*` is a different, incompatible schema entirely —
 * `amount_cents`/`third_party_name`/`invoice_type` are v0-only field names).
 *
 * `createSupplierInvoice` here has NOT been exercised against a real
 * Pennylane account — it creates a permanent accounting document, so doing
 * that as a side effect of a refactor would be irresponsible. The read paths
 * (`healthCheck`, `fetchInvoices`, `findSupplierByName`) ARE verified live.
 * Before the write path's first real run, set `PENNYLANE_DEFAULT_LEDGER_ACCOUNT_ID`
 * (company-specific chart-of-accounts entry — there is no generic default,
 * see https://pennylane.readme.io/reference/importsupplierinvoice).
 */
export class PennylaneService {
  private apiKey: string;
  private baseURL = 'https://app.pennylane.com/api/external/v2';
  private client: any;

  constructor() {
    this.apiKey = process.env.PENNYLANE_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️ PENNYLANE_API_KEY not set. Sync will fail.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Find an existing supplier by exact name. Pennylane's `/suppliers` filter
   * only allows `start_with` on the `name` field (verified live 2026-09-20 —
   * `eq` errors with "Operator eq is not allowed for filter field name"), so
   * this filters server-side by prefix then matches exactly client-side.
   */
  async findSupplierByName(name: string): Promise<number | null> {
    const filter = JSON.stringify([{ field: 'name', operator: 'start_with', value: name }]);
    const response = await this.client.get('/suppliers', { params: { filter } });
    const items = response.data.items ?? [];
    const exact = items.find((s: any) => s.name === name);
    return exact ? exact.id : null;
  }

  /** Create a supplier, returning its new id. */
  async createSupplier(name: string): Promise<number> {
    const response = await this.client.post('/suppliers', { name });
    return response.data.id;
  }

  private async findOrCreateSupplier(name: string): Promise<number> {
    const existing = await this.findSupplierByName(name);
    if (existing !== null) return existing;
    return this.createSupplier(name);
  }

  /** Upload a file, returning its file_attachment_id for use in an import call. */
  async uploadFileAttachment(fileBuffer: Buffer, filename: string): Promise<number> {
    const form = new FormData();
    form.append('file', fileBuffer, filename);

    const response = await axios.post(`${this.baseURL}/file_attachments`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data.id;
  }

  /**
   * Import a supplier invoice. Requires a real PDF (`pdfBuffer`) — Pennylane's
   * v2 import endpoint has no "create without a document" path, so a
   * body-only email receipt (no PDF ever attached) cannot be synced through
   * this method; store it locally and surface that limitation to the caller
   * rather than fabricate a substitute attachment.
   */
  async createSupplierInvoice(
    invoiceId: string,
    amountTTC: number,
    vendor: string,
    date: Date,
    pdfBuffer: Buffer,
    pdfFilename: string,
    options: { amountHT?: number; amountTVA?: number; invoiceNumber?: string; deadline?: Date } = {}
  ): Promise<PennylaneDocument> {
    const ledgerAccountId = process.env.PENNYLANE_DEFAULT_LEDGER_ACCOUNT_ID;
    if (!ledgerAccountId) {
      throw new Error(
        'PENNYLANE_DEFAULT_LEDGER_ACCOUNT_ID not set — required to import a supplier invoice ' +
          '(company-specific chart-of-accounts entry, no safe generic default).'
      );
    }

    const supplierId = await this.findOrCreateSupplier(vendor);
    const fileAttachmentId = await this.uploadFileAttachment(pdfBuffer, pdfFilename);

    const ht = options.amountHT ?? amountTTC;
    const tva = options.amountTVA ?? 0;
    const deadline = options.deadline ?? date;

    const response = await this.client.post('/supplier_invoices/import', {
      file_attachment_id: fileAttachmentId,
      supplier_id: supplierId,
      date: date.toISOString().split('T')[0],
      deadline: deadline.toISOString().split('T')[0],
      invoice_number: options.invoiceNumber,
      currency: 'EUR',
      currency_amount_before_tax: ht.toFixed(2),
      currency_amount: amountTTC.toFixed(2),
      currency_tax: tva.toFixed(2),
      external_reference: invoiceId,
      invoice_lines: [
        {
          currency_amount: amountTTC.toFixed(2),
          currency_tax: tva.toFixed(2),
          vat_rate: vatRateCode(ht > 0 ? (tva / ht) * 100 : 0),
          ledger_account_id: parseInt(ledgerAccountId, 10),
          ledger_entry_line: { label: `Facture ${vendor}` },
        },
      ],
    });

    console.log(`✅ Created supplier invoice in Pennylane: ${invoiceId} → ${response.data.id}`);
    return {
      id: response.data.id,
      type: 'invoice',
      amount: amountTTC,
      date,
      status: 'created',
    };
  }

  /**
   * Fetch supplier invoices from Pennylane (read-only sync check).
   * v2 uses cursor pagination (`next_cursor`), not offset/limit.
   */
  async fetchInvoices(limit: number = 50): Promise<PennylaneDocument[]> {
    try {
      const response = await this.client.get('/supplier_invoices', { params: { limit } });

      const documents: PennylaneDocument[] = (response.data.items ?? []).map((inv: any) => ({
        id: inv.id,
        type: 'invoice',
        amount: parseFloat(inv.currency_amount ?? inv.amount ?? '0'),
        date: new Date(inv.date),
        status: inv.payment_status ?? inv.status ?? 'unknown',
      }));

      console.log(`✅ Fetched ${documents.length} supplier invoices from Pennylane`);
      return documents;
    } catch (error: any) {
      console.error(`❌ Failed to fetch invoices: ${error.message}`);
      throw error;
    }
  }

  /**
   * List bank connections. Verified live 2026-09-20: Crédit Agricole and
   * Wise are both connected here (as "Compte courant S.A.S. LOGO SOLUTION"
   * and "Emoney EUR" respectively — Pennylane doesn't label them by bank
   * name, only by account name/type).
   */
  async fetchBankAccounts(): Promise<any[]> {
    const response = await this.client.get('/bank_accounts');
    return response.data.items ?? [];
  }

  /**
   * List bank transactions still awaiting a justificatif — the pool this
   * app's matcher runs against instead of a locally-parsed CSV (see PLAN.md
   * Phase D: CA/Wise are connected directly to Pennylane, so the bank feed
   * already lives there, fresher and format-error-free).
   *
   * `attachment_required` is NOT a filterable field per Pennylane's v2 spec
   * (only `id`/`bank_account_id`/`journal_id`/`date` are) — filtered
   * client-side after fetching instead of via a query param the API would
   * silently ignore.
   */
  async fetchTransactionsNeedingAttachment(limit: number = 50): Promise<any[]> {
    const response = await this.client.get('/transactions', { params: { limit } });
    const items = response.data.items ?? [];
    return items.filter((t: any) => t.attachment_required === true);
  }

  /**
   * Native appairage: attach a bank transaction to a supplier invoice
   * already pushed to Pennylane. This is the real match — it lives in
   * Pennylane, not just in this app's local `Match` table.
   */
  async matchTransactionToSupplierInvoice(supplierInvoiceId: string | number, transactionId: number): Promise<void> {
    await this.client.post(`/supplier_invoices/${supplierInvoiceId}/matched_transactions`, {
      transaction_id: transactionId,
    });
  }

  /** Check connection to Pennylane API. Verified live 2026-09-20 (HTTP 200). */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('PENNYLANE_API_KEY not set');
      }

      await this.client.get('/me');
      console.log(`✅ Connected to Pennylane`);
      return true;
    } catch (error: any) {
      console.error(`❌ Pennylane connection failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
let pennylaneService: PennylaneService | null = null;

export function getPennylaneService(): PennylaneService {
  if (!pennylaneService) {
    pennylaneService = new PennylaneService();
  }
  return pennylaneService;
}

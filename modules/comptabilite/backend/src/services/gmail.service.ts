import { google } from 'googleapis';
import { z } from 'zod';

const GmailAttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  attachmentId: z.string(),
});

export interface GmailInvoice {
  id: string;
  from: string;
  date: Date;
  subject: string;
  // Optional, not required: a receipt like Pennylane's or Orus's carries the
  // full HT/TVA/TTC breakdown in the message body, with no PDF attached at
  // all. Dropping messages without an attachment (the previous behavior)
  // silently lost exactly those invoices.
  attachment?: z.infer<typeof GmailAttachmentSchema>;
  bodyText?: string;
  // Which entry of VENDOR_QUERIES produced this result, when fetched via
  // fetchAllVendorInvoices() — lets the caller route parsing/categorization
  // without re-matching the `from` header.
  vendorHint?: string;
}

/**
 * One Gmail search per known vendor, matching the workflow already run by
 * hand today (search_threads with from:/subject: filters) rather than a
 * single generic `has:attachment filename:pdf` query that misses anything
 * without an attachment and pulls in unrelated PDFs from everyone else.
 * Extend this list as new recurring vendors show up — see factures-logo's
 * scripts/download-gmail-oauth2.py for the same pattern applied by hand.
 */
export const VENDOR_QUERIES: Record<string, string> = {
  Anthropic: 'from:invoice+statements@mail.anthropic.com',
  Orus: 'from:hello@orus.eu',
  Pennylane: 'from:pennylane.com OR from:stripe.com subject:pennylane',
  Hetzner: 'from:noreply.billing@hetzner.com OR from:hetzner.com',
  'Google Workspace': 'from:payments-noreply@google.com',
  'Bouygues Telecom': 'from:bouyguestelecom.fr',
};

export class GmailService {
  private oauth2Client: any;
  private gmail: any;

  constructor() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const hasCredentials = clientId && clientSecret && refreshToken &&
                          clientId !== 'not-set' && clientSecret !== 'not-set' && refreshToken !== 'not-set';
    const isDemo = process.env.NODE_ENV === 'development' && !hasCredentials;

    if (!isDemo && !hasCredentials) {
      throw new Error(
        'Gmail credentials not set. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN in .env'
      );
    }

    if (hasCredentials) {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }
  }

  /**
   * Fetch emails matching a query, one result per PDF attachment found, or a
   * single body-only result when the message has no attachment at all.
   */
  async fetchInvoices(query: string = 'has:attachment filename:pdf', vendorHint?: string): Promise<GmailInvoice[]> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not configured. Configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.');
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10,
      });

      const messages = response.data.messages || [];
      const invoices: GmailInvoice[] = [];

      for (const message of messages) {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const headers = detail.data.payload.headers;
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const dateStr = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

        const attachments = this.findAttachments(detail.data.payload);
        const bodyText = this.findBodyText(detail.data.payload);
        const base = { id: message.id, from, date: new Date(dateStr), subject, bodyText, vendorHint };

        if (attachments.length > 0) {
          // One invoice per MESSAGE, not per attachment. A single billing
          // email routinely bundles several PDFs for the same charge (e.g.
          // Anthropic sends both "Invoice-…" and "Receipt-…" for one
          // purchase; Orus sends contract paperwork alongside a facture) —
          // pushing one row per attachment created several DB invoices, and
          // several supplier-invoice pushes to Pennylane, for one real
          // expense. Confirmed live 2026-09-22: 3 Anthropic rows for a
          // single €5 charge, later all matched to the same bank
          // transaction. Pick the single most invoice-like attachment.
          invoices.push({ ...base, attachment: this.pickPrimaryAttachment(attachments) });
        } else if (bodyText) {
          // No PDF at all — Pennylane/Orus-style receipts carry the full
          // HT/TVA/TTC breakdown in the body. Previously dropped entirely.
          invoices.push(base);
        }
      }

      console.log(`✅ Fetched ${invoices.length} invoices from Gmail (query: ${query})`);
      return invoices;
    } catch (error) {
      console.error('❌ Failed to fetch Gmail invoices:', error);
      throw error;
    }
  }

  /**
   * Run one search per known vendor (VENDOR_QUERIES) instead of a single
   * generic query — mirrors the manual factures-logo workflow, and finds
   * invoices a broad `has:attachment` search misses (body-only receipts) or
   * drowns in noise (PDFs from unrelated senders).
   */
  async fetchAllVendorInvoices(): Promise<GmailInvoice[]> {
    const results: GmailInvoice[] = [];
    for (const [vendor, query] of Object.entries(VENDOR_QUERIES)) {
      const invoices = await this.fetchInvoices(query, vendor);
      results.push(...invoices);
    }
    return results;
  }

  /**
   * Pick the one attachment that best represents the actual invoice when a
   * message bundles several PDFs. Preference: filename containing
   * "invoice"/"facture" first, then "receipt"/"reçu", else the first
   * attachment found (covers non-invoice paperwork like Orus's contract
   * documents, where there is no clearly-better choice).
   */
  private pickPrimaryAttachment(
    attachments: z.infer<typeof GmailAttachmentSchema>[]
  ): z.infer<typeof GmailAttachmentSchema> {
    const byPattern = (pattern: RegExp) => attachments.find((a) => pattern.test(a.filename));
    return (
      byPattern(/invoice|facture/i) ??
      byPattern(/receipt|reçu|recu/i) ??
      attachments[0]
    );
  }

  /**
   * Find PDF attachments in email payload, descending into nested parts
   * (multipart/mixed containing multipart/alternative, etc.) — the previous
   * single-level scan missed PDFs on that common nesting shape.
   */
  private findAttachments(payload: any): z.infer<typeof GmailAttachmentSchema>[] {
    const attachments: any[] = [];

    const walk = (part: any) => {
      if (!part) return;
      if (part.filename && part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        attachments.push({
          id: part.partId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        for (const child of part.parts) walk(child);
      }
    };

    walk(payload);
    return attachments.map((att) => GmailAttachmentSchema.parse(att));
  }

  /**
   * Find the plain-text body, descending into nested parts the same way as
   * findAttachments. Falls back to a stripped-tags version of the HTML part
   * when no text/plain part exists (some senders — e.g. Orus — only send
   * multipart/alternative with just an HTML body).
   */
  private findBodyText(payload: any): string | undefined {
    let plainText: string | undefined;
    let htmlText: string | undefined;

    const decode = (data: string) => Buffer.from(data, 'base64').toString('utf8');

    const walk = (part: any) => {
      if (!part) return;
      if (part.mimeType === 'text/plain' && part.body?.data && !plainText) {
        plainText = decode(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data && !htmlText) {
        htmlText = decode(part.body.data);
      }
      if (part.parts) {
        for (const child of part.parts) walk(child);
      }
    };

    walk(payload);

    if (plainText) return plainText;
    if (htmlText) {
      return htmlText
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return undefined;
  }

  /**
   * Download attachment from Gmail
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not configured. Configure credentials in .env');
      }

      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      const data = response.data.data;
      return Buffer.from(data, 'base64');
    } catch (error) {
      console.error('❌ Failed to download attachment:', error);
      throw error;
    }
  }
}

// Singleton instance
let gmailService: GmailService | null = null;

export function getGmailService(): GmailService {
  if (!gmailService) {
    gmailService = new GmailService();
  }
  return gmailService;
}

import { z } from 'zod';

const MatchScoreSchema = z.object({
  invoiceId: z.string(),
  transactionId: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type MatchScore = z.infer<typeof MatchScoreSchema>;

export interface Invoice {
  id: string;
  date: Date;
  amount: number;
  vendor: string;
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
}

/**
 * Matcher: Intelligently match Invoices ↔ Transactions
 *
 * Algorithm:
 * 1. Amount matching: ±5% tolerance
 * 2. Date matching: ±3 days tolerance
 * 3. Vendor name matching (optional)
 * 4. Confidence score: 0-1
 */
export class MatcherService {
  private amountTolerance = 0.10; // 10% — increased from 5% to capture invoices with added fees
  private dateTolerance = 3; // days

  /**
   * Find best matches for each invoice.
   *
   * One-to-one only: candidate pairs are considered highest-confidence
   * first, and a pair is kept only if neither its invoice nor its
   * transaction has already been claimed by an earlier (higher-confidence)
   * pair. Without this, several invoices with the same amount (e.g.
   * recurring duplicate Gmail attachments for one real charge) all matched
   * the single real bank transaction, and one invoice matched two different
   * transactions — both happened live against real Pennylane data on
   * 2026-09-22 before this constraint existed.
   */
  matchInvoicesToTransactions(
    invoices: Invoice[],
    transactions: Transaction[],
  ): MatchScore[] {
    const candidates: MatchScore[] = [];

    for (const invoice of invoices) {
      for (const transaction of transactions) {
        const confidence = this.calculateConfidence(invoice, transaction);

        if (confidence > 0.7) {
          // Only include if confidence > 70%
          candidates.push({
            invoiceId: invoice.id,
            transactionId: transaction.id,
            confidence,
            reason: this.generateReason(invoice, transaction, confidence),
          });
        }
      }
    }

    // Sort by confidence descending, then greedily assign — each invoice
    // and each transaction can appear in at most one final match.
    candidates.sort((a, b) => b.confidence - a.confidence);

    const usedInvoices = new Set<string>();
    const usedTransactions = new Set<string>();
    const matches: MatchScore[] = [];

    for (const candidate of candidates) {
      if (usedInvoices.has(candidate.invoiceId) || usedTransactions.has(candidate.transactionId)) {
        continue;
      }
      usedInvoices.add(candidate.invoiceId);
      usedTransactions.add(candidate.transactionId);
      matches.push(candidate);
    }

    console.log(`✅ Found ${matches.length} one-to-one matches (confidence > 0.7, from ${candidates.length} candidates)`);
    return matches;
  }

  /**
   * Calculate matching confidence (0-1)
   */
  private calculateConfidence(invoice: Invoice, transaction: Transaction): number {
    let score = 0;

    // Amount matching (0-0.5 points)
    const amountScore = this.scoreAmount(invoice.amount, transaction.amount);
    score += amountScore * 0.5;

    // Date matching (0-0.3 points)
    const dateScore = this.scoreDate(invoice.date, transaction.date);
    score += dateScore * 0.3;

    // Vendor matching (0-0.2 points)
    const vendorScore = this.scoreVendor(invoice.vendor, transaction.description);
    score += vendorScore * 0.2;

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Score amount similarity (0-1)
   * 1.0 = exact match
   * 0.5 = within 5% tolerance
   * 0.0 = outside tolerance
   */
  private scoreAmount(invoiceAmount: number, transactionAmount: number): number {
    const diff = Math.abs(invoiceAmount - transactionAmount);
    const tolerance = invoiceAmount * this.amountTolerance;

    if (diff === 0) return 1.0;
    if (diff <= tolerance) return 1.0 - diff / invoiceAmount;
    return 0;
  }

  /**
   * Score date similarity (0-1)
   * 1.0 = same day
   * 0.5 = within 3 days
   * 0.0 = outside tolerance
   */
  private scoreDate(invoiceDate: Date | string, transactionDate: Date | string): number {
    const invDate = new Date(invoiceDate);
    const txnDate = new Date(transactionDate);
    const diff = Math.abs(invDate.getTime() - txnDate.getTime());
    const diffDays = diff / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 1.0;
    if (diffDays <= this.dateTolerance) return 1.0 - diffDays / this.dateTolerance;
    return 0;
  }

  /**
   * Score vendor name similarity (0-1)
   * Uses substring matching (case-insensitive)
   */
  private scoreVendor(vendor: string, description: string): number {
    const vendorLower = vendor.toLowerCase();
    const descLower = description.toLowerCase();

    // Exact match
    if (vendorLower === descLower) return 1.0;

    // Substring match (vendor in description or vice versa)
    if (descLower.includes(vendorLower) || vendorLower.includes(descLower)) {
      return 0.8;
    }

    // Partial match (first 3 chars)
    if (
      vendorLower.substring(0, 3) === descLower.substring(0, 3) &&
      vendor.length > 3 &&
      description.length > 3
    ) {
      return 0.5;
    }

    return 0;
  }

  /**
   * Generate human-readable matching reason
   */
  private generateReason(invoice: Invoice, transaction: Transaction, confidence: number): string {
    const reasons: string[] = [];
    const invDate = new Date(invoice.date);
    const txnDate = new Date(transaction.date);

    const amountDiff = Math.abs(invoice.amount - transaction.amount);
    reasons.push(`Amount: €${invoice.amount} vs €${transaction.amount} (diff: €${amountDiff.toFixed(2)})`);

    const dateDiff = Math.abs(invDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24);
    reasons.push(`Date: ${invDate.toLocaleDateString()} vs ${txnDate.toLocaleDateString()} (diff: ${dateDiff.toFixed(1)} days)`);

    if (invoice.vendor.toLowerCase().includes(transaction.description.substring(0, 3).toLowerCase())) {
      reasons.push(`Vendor: "${invoice.vendor}" matches description`);
    }

    return `[${(confidence * 100).toFixed(0)}%] ${reasons.join(' | ')}`;
  }
}

// Singleton instance
let matcherService: MatcherService | null = null;

export function getMatcherService(): MatcherService {
  if (!matcherService) {
    matcherService = new MatcherService();
  }
  return matcherService;
}

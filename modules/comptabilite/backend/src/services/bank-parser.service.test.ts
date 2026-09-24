import { describe, it, expect } from 'vitest';
import iconv from 'iconv-lite';
import { BankParserService } from './bank-parser.service.js';

// Fixtures are structurally identical to real Crédit Agricole / Wise exports
// (same preamble, header, multi-line quoted field, encoding) but with
// fictional amounts and merchants — not the real account's data.

const CREDIT_AGRICOLE_SAMPLE = [
  '',
  'Téléchargement du 01/01/2027;',
  '',
  '',
  'S.A.S.   EXEMPLE',
  'Compte courant carte n° 00000000000;',
  'Solde au 01/01/2027 1 000,00 €',
  '',
  'Liste des opérations du compte entre le 01/12/2026 et le 01/01/2027;',
  '',
  'Date;Libellé;Débit euros;Crédit euros;',
  // Multi-line quoted Libellé — the case that breaks naive split('\n').
  '15/12/2026;"Paiement par carte',
  'X1234 EXEMPLE FOURNISSEUR 14/12',
  '',
  '',
  '',
  '";42,50;;',
  '10/12/2026;"Virement en votre faveur',
  'CLIENT EXEMPLE',
  '',
  '',
  '";;1 234,00;',
  '',
  '',
].join('\n');

const WISE_SAMPLE = [
  '"TransferWise ID",Date,"Date Time",Amount,Currency,Description,"Payment Reference","Running Balance","Exchange From","Exchange To","Exchange Rate","Payer Name","Payee Name","Payee Account Number",Merchant,"Card Last Four Digits","Card Holder Full Name",Attachment,Note,"Total fees","Exchange To Amount","Transaction Type","Transaction Details Type"',
  'CARD-1,05-12-2026,"05-12-2026 08:00:00.000",-15.00,EUR,"Transaction de carte de 15,00 EUR émise par Exemple SARL",,100.00,,,,,,,"Exemple SARL",1234,"Jean Test",,,0.00,,DEBIT,CARD',
  'TRANSFER-1,01-12-2026,"01-12-2026 07:00:00.000",50.00,EUR,"Argent reçu de S.A.S. EXEMPLE",wise,115.00,,,,"S.A.S. EXEMPLE",,,,,,,,0.00,,CREDIT,DEPOSIT',
].join('\n');

describe('BankParserService — Crédit Agricole', () => {
  const service = new BankParserService();

  it('parses a multi-line quoted Libellé into a single transaction', () => {
    const transactions = service.parseCSV(CREDIT_AGRICOLE_SAMPLE, 'CA');
    expect(transactions).toHaveLength(2);
  });

  it('collapses the wrapped description to one line and computes the signed amount', () => {
    const [debit] = service.parseCSV(CREDIT_AGRICOLE_SAMPLE, 'CA');
    expect(debit.description).toBe('Paiement par carte X1234 EXEMPLE FOURNISSEUR 14/12');
    expect(debit.amount).toBe(-42.5);
    expect(debit.date.getFullYear()).toBe(2026);
    expect(debit.date.getMonth()).toBe(11); // December, 0-indexed
    expect(debit.date.getDate()).toBe(15);
  });

  it('parses a French-formatted credit amount with a thousands separator', () => {
    const [, credit] = service.parseCSV(CREDIT_AGRICOLE_SAMPLE, 'CA');
    expect(credit.amount).toBe(1234);
  });

  it('decodes a Windows-1252 buffer via parseCSVBuffer', () => {
    const buffer = iconv.encode(CREDIT_AGRICOLE_SAMPLE, 'win1252');
    const transactions = service.parseCSVBuffer(buffer, 'CA');
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toContain('EXEMPLE FOURNISSEUR');
  });
});

describe('BankParserService — Wise', () => {
  const service = new BankParserService();

  it('parses debit and credit rows by header name, not position', () => {
    const transactions = service.parseCSV(WISE_SAMPLE, 'Wise');
    expect(transactions).toHaveLength(2);
    expect(transactions[0].amount).toBe(-15);
    expect(transactions[0].description).toContain('Exemple SARL');
    expect(transactions[1].amount).toBe(50);
  });

  it('parses the DD-MM-YYYY date format', () => {
    const [first] = service.parseCSV(WISE_SAMPLE, 'Wise');
    expect(first.date.getFullYear()).toBe(2026);
    expect(first.date.getMonth()).toBe(11);
    expect(first.date.getDate()).toBe(5);
  });
});

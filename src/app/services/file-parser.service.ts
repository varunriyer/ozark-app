import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class FileParserService {
  constructor() {}

  parseFile(file: File): Promise<Transaction[]> {
    return new Promise((resolve, reject) => {
      // 1. Text Parsing
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const text = e.target.result;
          const transactions = this.processTextData(text);
          resolve(transactions);
        } catch (error) {
          console.error('Parse Error:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  // --- CORE PARSING LOGIC ---
  private processTextData(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');
    let isReadingTransactions = false;
    let detectedType: 'HDFC_CC' | 'HDFC_BANK' | 'UNKNOWN' = 'UNKNOWN';
    let delimiter = ',';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Cleanup quotes
      if (line.startsWith('"') && line.endsWith('"'))
        line = line.substring(1, line.length - 1);

      if (!line) continue;

      // 1. DETECT HEADER
      if (!isReadingTransactions) {
        // HDFC CC
        if (line.includes('DATE') && line.includes('Transaction type')) {
          isReadingTransactions = true;
          detectedType = 'HDFC_CC';
          if (line.includes('~|~')) delimiter = '~|~';
          continue;
        }
        // HDFC Bank
        if (
          line.includes('Date') &&
          line.includes('Narration') &&
          line.includes('Withdrawal')
        ) {
          isReadingTransactions = true;
          detectedType = 'HDFC_BANK';
          delimiter = ',';
          continue;
        }
      }

      // 2. PARSE ROWS
      if (isReadingTransactions) {
        // Footer checks
        if (
          line.includes('Statement Summary') ||
          line.includes('End Of Statement')
        )
          break;
        if (line.startsWith('*******')) continue;

        let parts: string[] = [];
        if (delimiter === ',') {
          parts = this.splitCsvLine(line);
        } else {
          parts = line.split(delimiter);
        }
        parts = parts.map((p) => p.trim());

        if (detectedType === 'HDFC_CC')
          this.parseHdfcCcRow(parts, transactions);
        else if (detectedType === 'HDFC_BANK')
          this.parseHdfcBankRow(parts, transactions);
      }
    }
    return transactions;
  }

  private parseHdfcCcRow(parts: string[], transactions: Transaction[]) {
    if (parts.length < 5) return;
    const rawDate = parts[2];
    let description = parts[3];

    // --- CAPTURE RAW TEXT FOR AI CONTEXT ---
    const originalRaw = description;

    // Basic CC Cleanup
    if (description.includes('CC PAYMENT')) description = 'Credit Card Payment';

    const amount = parseFloat(parts[4].replace(/,/g, ''));
    const type = (parts[5] || '').toLowerCase() === 'cr' ? 'CREDIT' : 'DEBIT';
    const date = this.normalizeDate(rawDate.split(' ')[0]);

    if (!isNaN(amount) && this.isValidDate(date)) {
      transactions.push({
        date,
        description,
        originalRaw, // <--- Fixed: Added missing field
        amount,
        type,
      });
    }
  }

  private parseHdfcBankRow(parts: string[], transactions: Transaction[]) {
    if (parts.length < 6) return;
    const rawDate = parts[0];
    const description = parts[1];

    // --- CAPTURE RAW TEXT FOR AI CONTEXT ---
    const originalRaw = description;

    const withdrawal = parseFloat(parts[4].replace(/,/g, '')) || 0;
    const deposit = parseFloat(parts[5].replace(/,/g, '')) || 0;

    if (withdrawal === 0 && deposit === 0) return;

    const amount = withdrawal > 0 ? withdrawal : deposit;
    const type = withdrawal > 0 ? 'DEBIT' : 'CREDIT';

    if (this.isValidDate(rawDate)) {
      transactions.push({
        date: this.normalizeDate(rawDate),
        description,
        originalRaw, // <--- Fixed: Added missing field
        amount,
        type,
      });
    }
  }

  // --- UTILS ---
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else current += char;
    }
    result.push(current.trim());
    return result.map((val) => val.replace(/^"|"$/g, ''));
  }

  private isValidDate(dateStr: string): boolean {
    if (!dateStr || dateStr.length < 6) return false;
    return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr);
  }

  private normalizeDate(dateStr: string): string {
    const parts = dateStr.includes('/')
      ? dateStr.split('/')
      : dateStr.split('-');
    if (parts.length === 3) {
      if (parts[2].length === 2) parts[2] = '20' + parts[2];
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  }
}

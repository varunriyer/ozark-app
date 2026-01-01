import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

declare var puter: any;

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  constructor() {}

  async categorizeTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (!transactions || transactions.length === 0) return [];

    const BATCH_SIZE = 15;
    const processedTransactions: Transaction[] = [];

    console.log(
      `🤖 AI: Analyzing ${transactions.length} items with Memory Context...`
    );

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      // We send the 'Soft Sanitized' version + Any Memory Context we found
      const batchInput = batch
        .map((t, index) => {
          const cleanRaw = this.softSanitize(t.originalRaw);
          const memory = t.memoryContext ? `[MEMORY: ${t.memoryContext}]` : '';
          return `ID_${index}: "${cleanRaw}" Amount: ${t.amount} (${t.type}) ${memory}`;
        })
        .join('\n');

      const prompt = `
        You are an intelligent Financial Assistant with memory.
        
        INPUT DATA:
        I will provide a list of bank transactions. Some include [MEMORY] tags from previous user feedback.
        
        YOUR GOAL:
        1. Identify the Merchant/Person (Clean Name).
        2. Assign a Category. Use the [MEMORY] hint if it makes sense, but use your judgment (e.g. if amount is vastly different, ignore memory).
        
        PRIVACY NOTE:
        The descriptions have sensitive numbers redacted. Do not hallucinate numbers. Use the remaining text (locations, names).

        CATEGORIES:
        [Groceries, Food, Transport, Shopping, Utilities, Investment, Transfer, Rent, Salary, Health, Entertainment, Housing, Income, Other]

        RETURN JSON ARRAY:
        [ { "id": 0, "cleanName": "Zepto", "category": "Groceries", "reason": "Recognized merchant" }, ... ]

        TRANSACTIONS:
        ${batchInput}
      `;

      try {
        const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });

        let text =
          typeof response === 'string' ? response : response?.message?.content;
        const cleanJson = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        const aiData = JSON.parse(cleanJson);

        batch.forEach((txn, idx) => {
          const res = aiData.find((r: any) => r.id === idx);
          if (res) {
            txn.description = res.cleanName;
            txn.category = res.category;
            txn.aiReasoning = res.reason; // New: Let user see WHY AI picked this
          }
        });

        processedTransactions.push(...batch);
      } catch (error) {
        console.error('Batch Error:', error);
        processedTransactions.push(...batch);
      }
    }

    return processedTransactions;
  }

  // --- PRIVACY: SOFT SANITIZER ---
  private softSanitize(raw: string): string {
    if (!raw) return '';
    let clean = raw.toUpperCase();

    // 1. Mask Mobile/Account Numbers (10-15 digits)
    clean = clean.replace(/\b\d{10,16}\b/g, '[#REDACTED#]');

    // 2. Mask common ID patterns like "REF# 12345" but keep "REF"
    clean = clean.replace(/(REF|TXN|UPI|POS)[\W_]*\d+/g, '$1-[#]');

    // 3. Keep Location info! (e.g. "INDIRANAGAR", "BANGALORE")
    // We do NOT remove generic words anymore.

    return clean;
  }
}

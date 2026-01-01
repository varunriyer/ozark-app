export interface Transaction {
  date: string;
  description: string; // Display Name
  originalRaw: string; // The Dirty Bank Text (We store this to find memories)

  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category?: string;

  // Context System
  memoryContext?: string; // "User said this is usually Rent" (Passed to AI)
  userNote?: string; // Note displayed to user
  aiReasoning?: string; // "Matched memory 'Arjun'" or "Recognized Merchant"

  isManuallyEdited?: boolean;
  aiAlternates?: string[];
}

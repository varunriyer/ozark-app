import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileParserService } from '../../services/file-parser.service';
import { GeminiService } from '../../services/gemini.service';
import { Transaction } from '../../models/transaction.model';

declare var puter: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  fileName: string = '';
  transactions: Transaction[] = [];
  isCategorizing = false;
  isSignedInToPuter = false;

  categories = [
    'Groceries',
    'Food & Dining',
    'Transport',
    'Shopping',
    'Utilities',
    'Investment',
    'Transfer',
    'Rent',
    'Salary',
    'Health',
    'Entertainment',
    'Housing',
    'Income',
    'Other',
  ];

  selectedTxnIndex: number | null = null;
  editForm = { cleanName: '', category: '', note: '' };

  constructor(
    private fileParser: FileParserService,
    private geminiService: GeminiService
  ) {}

  ngOnInit() {
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn()) {
      this.isSignedInToPuter = true;
    }
  }

  async connectToPuter() {
    await puter.auth.signIn();
    this.isSignedInToPuter = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      this.processFile(file);
    }
  }

  async processFile(file: File) {
    const cacheKey = `ozark_v5_${file.name}_${file.size}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      this.transactions = JSON.parse(cached);
      return;
    }

    // 1. Parse
    this.transactions = await this.fileParser.parseFile(file);

    // 2. Inject Memories (The "Soft" Rule Engine)
    this.injectMemories();

    // 3. AI Analysis
    if (this.transactions.length > 0 && this.isSignedInToPuter) {
      this.isCategorizing = true;

      // Filter: If we have a memory that was marked "Always Trust", we can skip AI.
      // But per your request, we want AI to use the memory as context.
      // So we send everything unless manually edited in this specific session.
      const toAnalyze = this.transactions.filter((t) => !t.isManuallyEdited);

      if (toAnalyze.length > 0) {
        const analyzed = await this.geminiService.categorizeTransactions(
          toAnalyze
        );

        // Merge results
        this.transactions = this.transactions.map((t) => {
          if (t.isManuallyEdited) return t;
          const found =
            analyzed.find((a) => a.originalRaw === t.originalRaw) ||
            analyzed.find((a) => a.amount === t.amount && a.date === t.date);
          return found || t;
        });
      }

      this.isCategorizing = false;
      this.updateCache();
    }
  }

  // --- MEMORY SYSTEM ---

  // Instead of hard rules, we attach "Context Hints"
  private injectMemories() {
    const memories = JSON.parse(localStorage.getItem('ozark_memories') || '{}');

    this.transactions.forEach((t) => {
      // Create a lookup key (e.g. "UPI-ARJUN")
      const key = this.getMemoryKey(t.originalRaw);
      const memory = memories[key];

      if (memory) {
        // We don't change the category yet. We just attach the hint.
        t.memoryContext = `User previously categorized this as '${memory.category}' (${memory.note}).`;
        t.userNote = memory.note; // Show the note in UI so user knows memory exists
      }
    });
  }

  // Save a "Memory" when user teaches AI
  saveMemory(txn: Transaction) {
    // 1. Update UI
    txn.description = this.editForm.cleanName;
    txn.category = this.editForm.category;
    txn.userNote = this.editForm.note;
    txn.isManuallyEdited = true;

    // 2. Save to Knowledge Base
    const memories = JSON.parse(localStorage.getItem('ozark_memories') || '{}');
    const key = this.getMemoryKey(txn.originalRaw);

    memories[key] = {
      category: this.editForm.category,
      cleanName: this.editForm.cleanName,
      note: this.editForm.note,
    };

    localStorage.setItem('ozark_memories', JSON.stringify(memories));
    console.log(`🧠 Memory Stored for [${key}]: ${this.editForm.note}`);

    this.selectedTxnIndex = null;
    this.updateCache();
  }

  private getMemoryKey(raw: string): string {
    // We use the first 2-3 significant words as a key
    if (!raw) return 'UNKNOWN';
    const clean = raw
      .replace(/^(UPI-|POS |NEFT-|IMPS-|ACH |RTGS-)/gi, '')
      .trim();
    // Take first 15 chars (enough to capture "ARJUN" or "SWIGGY")
    return clean.substring(0, 15).toUpperCase();
  }

  // --- UI HELPERS ---

  openSmartEdit(index: number) {
    if (this.selectedTxnIndex === index) {
      this.selectedTxnIndex = null;
      return;
    }
    this.selectedTxnIndex = index;
    const t = this.transactions[index];
    this.editForm = {
      cleanName: t.description,
      category: t.category || 'Other',
      note: t.userNote || '',
    };
  }

  restoreOriginal(txn: Transaction) {
    txn.description = txn.originalRaw;
    this.selectedTxnIndex = null;
    this.updateCache();
  }

  updateCache() {
    const cacheKey = `ozark_v5_${this.fileName}_${this.transactions.length}`;
    localStorage.setItem(cacheKey, JSON.stringify(this.transactions));
  }

  // (Include your getBadgeClass method here)
  getBadgeClass(txn: Transaction): string {
    if (txn.category === 'Rent')
      return 'bg-pink-900 text-pink-300 border-pink-700';
    if (txn.category === 'Transfer' && txn.type === 'CREDIT')
      return 'bg-blue-900 text-blue-300 border-blue-700';
    if (txn.type === 'CREDIT')
      return 'bg-green-900 text-green-300 border-green-700';
    switch (txn.category) {
      case 'Food':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'Shopping':
        return 'bg-purple-900 text-purple-300 border-purple-700';
      case 'Transport':
        return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'Investment':
        return 'bg-emerald-900 text-emerald-300 border-emerald-700';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-600';
    }
  }
}

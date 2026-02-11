export interface CheckingTransaction {
  details: string;
  postingDate: string; // MM/DD/YYYY
  description: string;
  amount: number;
  type: string;
  balance: number;
  checkOrSlip: string;
}

export interface CreditCardTransaction {
  transactionDate: string; // MM/DD/YYYY
  postDate: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  memo: string;
}

export type ParsedCSV =
  | { format: "checking"; transactions: CheckingTransaction[] }
  | {
      format: "creditcard";
      accountId: string;
      transactions: CreditCardTransaction[];
    };

export interface MonthlySummary {
  month: string; // YYYY-MM
  grocery: number;
  general: number;
  splurge: number;
  /** Dining / American Express card spending */
  amex: number;
  appleCard: number;
  /** Wife's credit card spending */
  wifeCC: number;
  direct: number;
  totalSpent: number;
  totalIncome: number;
  savings: number;
  updatedAt: string;
}

export interface UploadResponse {
  month: string;
  summary: MonthlySummary;
  warnings: string[];
}

export interface StoredTransactions {
  month: string;
  checking: CheckingTransaction[];
  creditCards: Record<string, CreditCardTransaction[]>;
}

export const ACCOUNT_CATEGORY_MAP: Record<string, string> = {
  "0773": "grocery",
  "6720": "general",
  "7514": "splurge",
};

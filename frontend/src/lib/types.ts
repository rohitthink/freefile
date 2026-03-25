export interface Transaction {
  id: number;
  fy: string;
  bank_account_id: number | null;
  date: string;
  narration: string;
  amount: number;
  tx_type: "credit" | "debit";
  balance: number | null;
  reference: string | null;
  category: string;
  category_confirmed: boolean;
  source_file: string | null;
}

export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  income_by_category: Record<string, { count: number; total: number }>;
  expense_by_category: Record<string, { count: number; total: number }>;
  monthly: Record<string, { income: number; expenses: number }>;
}

export interface TaxResult {
  fy: string;
  regime: string;
  itr_form: string;
  gross_professional_income: number;
  deemed_income: number | null;
  business_expenses: number | null;
  gross_other_income: number;
  gross_total_income: number;
  total_deductions: number;
  taxable_income: number;
  tax_on_income: number;
  rebate_87a: number;
  surcharge: number;
  cess: number;
  total_tax: number;
  tds_credit: number;
  advance_tax_paid: number;
  tax_payable: number;
  tax_refund: number;
}

export interface RegimeComparison {
  old_regime: TaxResult;
  new_regime: TaxResult;
  recommended: string;
  savings: number;
}

export interface Deduction {
  id?: number;
  fy: string;
  section: string;
  description: string;
  amount: number;
}

export interface TdsEntry {
  id?: number;
  fy: string;
  deductor_name: string;
  deductor_tan: string;
  amount_paid: number;
  tds_deducted: number;
  tds_deposited: number;
  section: string;
}

export interface FYSettings {
  fy: string;
  regime: "old" | "new";
  itr_form: "ITR-3" | "ITR-4";
}

export const CATEGORIES: Record<string, string> = {
  professional_income: "Professional Income",
  interest_income: "Interest Income",
  dividend_income: "Dividend Income",
  rental_income: "Rental Income",
  other_income: "Other Income",
  rent: "Rent",
  internet_phone: "Internet/Phone",
  software_subscriptions: "Software & Subscriptions",
  equipment: "Equipment",
  travel: "Travel",
  professional_fees: "Professional Fees",
  insurance: "Insurance",
  office_supplies: "Office Supplies",
  meals_entertainment: "Meals & Entertainment",
  personal: "Personal",
  investment: "Investment",
  tax_payment: "Tax Payment",
  gst_payment: "GST Payment",
  transfer: "Transfer",
  uncategorized: "Uncategorized",
};

export const INCOME_CATEGORIES = [
  "professional_income", "interest_income", "dividend_income",
  "rental_income", "other_income",
];

export const EXPENSE_CATEGORIES = [
  "rent", "internet_phone", "software_subscriptions", "equipment",
  "travel", "professional_fees", "insurance", "office_supplies",
  "meals_entertainment",
];

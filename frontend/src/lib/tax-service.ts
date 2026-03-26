/**
 * Local tax computation service.
 *
 * Reads data from the DataLayer and computes tax locally using the TypeScript
 * tax engine. This mirrors the logic in backend/routers/tax.py lines 12-87.
 *
 * Once the TS tax engine (Phase 1) is complete, this will call computeITR3 /
 * computeITR4 directly instead of returning raw intermediate values.
 */

import { getDataLayer } from "./db";
import { EXPENSE_CATEGORIES } from "./types";

// TODO: Import from the TS tax engine once Phase 1 is complete:
// import { computeITR3, computeITR4 } from './tax-engine';

export interface TaxComputationInput {
  fy: string;
  regime: "old" | "new";
  itrForm: "ITR-3" | "ITR-4";
  professionalIncome: number;
  otherIncome: {
    interest: number;
    rental: number;
    dividend: number;
    other: number;
  };
  businessExpenses: number;
  deductions: { section: string; amount: number; description?: string }[];
  tdsCredit: number;
  advanceTaxPaid: number;
}

/**
 * Gather all data needed for tax computation from the data layer.
 *
 * Returns the raw inputs that would be passed to the TS tax engine.
 * Once the engine is ready, this function will call it and return the full
 * TaxResult / RegimeComparison.
 */
export async function computeTaxLocal(
  fy: string,
): Promise<TaxComputationInput> {
  const dl = getDataLayer();

  // Get FY settings (regime, ITR form)
  const settings = await dl.getFYSettings(fy);

  // Get income from transaction summary
  const summary = await dl.getTransactionSummary(fy);

  // Categorise income — mirrors backend/routers/tax.py lines 34-49
  const professionalIncome =
    summary.income_by_category["professional_income"]?.total || 0;

  const otherIncome = {
    interest: summary.income_by_category["interest_income"]?.total || 0,
    rental: summary.income_by_category["rental_income"]?.total || 0,
    dividend: summary.income_by_category["dividend_income"]?.total || 0,
    other: summary.income_by_category["other_income"]?.total || 0,
  };

  // Business expenses for ITR-3 — mirrors backend/routers/tax.py lines 52-61
  let businessExpenses = 0;
  if (settings.itr_form === "ITR-3") {
    for (const cat of EXPENSE_CATEGORIES) {
      businessExpenses += summary.expense_by_category[cat]?.total || 0;
    }
  }

  // Get deductions — mirrors backend/routers/tax.py lines 63-66
  const { deductions } = await dl.getDeductions(fy);
  const deductionsList = deductions.map((d) => ({
    section: d.section,
    amount: d.amount,
    description: d.description,
  }));

  // Get TDS credit — mirrors backend/routers/tax.py lines 68-71
  const { tds_entries } = await dl.getTdsEntries(fy);
  const tdsCredit = tds_entries.reduce(
    (sum, t) => sum + (t.tds_deposited || 0),
    0,
  );

  // Get advance tax paid from transactions — mirrors backend/routers/tax.py lines 73-80
  // tax_payment category debits represent advance tax payments
  const advanceTaxPaid =
    summary.expense_by_category["tax_payment"]?.total || 0;

  // TODO: Once the TS tax engine is ready, call it here:
  // if (settings.itr_form === 'ITR-4') {
  //   return computeITR4(professionalIncome, otherIncome, deductionsList, tdsCredit, advanceTaxPaid, settings.regime);
  // } else {
  //   return computeITR3(professionalIncome, businessExpenses, otherIncome, deductionsList, tdsCredit, advanceTaxPaid, settings.regime);
  // }

  return {
    fy,
    regime: settings.regime,
    itrForm: settings.itr_form,
    professionalIncome,
    otherIncome,
    businessExpenses,
    deductions: deductionsList,
    tdsCredit,
    advanceTaxPaid,
  };
}

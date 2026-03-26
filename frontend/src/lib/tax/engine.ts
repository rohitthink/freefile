/**
 * Core tax computation engine for Indian income tax.
 */

import type { TaxResult, RegimeComparison } from "@/lib/types";
import {
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  REBATE_87A_NEW,
  REBATE_87A_OLD,
  SURCHARGE_RATES,
  CESS_RATE,
  PRESUMPTIVE_44ADA,
  type Slab,
} from "./slabs";
import { computeDeductions } from "./deductions";

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

interface OtherIncome {
  interest?: number;
  rental?: number;
  dividend?: number;
  other?: number;
}

interface DeductionInput {
  section?: string;
  amount?: number;
  [key: string]: unknown;
}

/** Compute tax using given slab rates. */
export function computeTaxOnSlabs(
  taxableIncome: number,
  slabs: Slab[]
): number {
  let tax = 0;
  let remaining = taxableIncome;

  for (const [slabLimit, rate] of slabs) {
    if (slabLimit === null) {
      // Last slab, no upper limit
      tax += remaining * rate;
      break;
    }
    const taxableInSlab = Math.min(remaining, slabLimit);
    tax += taxableInSlab * rate;
    remaining -= taxableInSlab;
    if (remaining <= 0) {
      break;
    }
  }

  return round2(tax);
}

/** Compute surcharge on income tax with marginal relief. */
export function computeSurcharge(
  tax: number,
  taxableIncome: number
): number {
  let applicableRate = 0;
  for (const [threshold, rate] of SURCHARGE_RATES) {
    if (threshold === null || taxableIncome <= threshold) {
      applicableRate = rate;
      break;
    }
    applicableRate = rate;
  }

  let surcharge = round2(tax * applicableRate);

  // Marginal relief: surcharge should not exceed income exceeding the threshold
  if (applicableRate > 0) {
    let prevThreshold = 0;
    for (const [threshold, rate] of SURCHARGE_RATES) {
      if (rate === applicableRate && prevThreshold > 0) {
        const excessIncome = taxableIncome - prevThreshold;
        const taxAtPrev = computeTaxOnSlabs(prevThreshold, NEW_REGIME_SLABS);
        if (tax + surcharge > taxAtPrev + excessIncome) {
          surcharge = Math.max(0, taxAtPrev + excessIncome - tax);
        }
        break;
      }
      if (threshold !== null) {
        prevThreshold = threshold;
      }
    }
  }

  return round2(surcharge);
}

/** 4% Health and Education Cess. */
export function computeCess(taxPlusSurcharge: number): number {
  return round2(taxPlusSurcharge * CESS_RATE);
}

/** Compute rebate under Section 87A. */
export function computeRebate87a(
  tax: number,
  taxableIncome: number,
  regime: string
): number {
  if (regime === "new") {
    if (taxableIncome <= REBATE_87A_NEW.limit) {
      return Math.min(tax, REBATE_87A_NEW.max_rebate);
    }
  } else {
    if (taxableIncome <= REBATE_87A_OLD.limit) {
      return Math.min(tax, REBATE_87A_OLD.max_rebate);
    }
  }
  return 0;
}

/**
 * Compute tax for ITR-4 (Presumptive taxation under 44ADA).
 * 50% of gross receipts deemed as income.
 */
export function computeItr4(
  grossProfessionalReceipts: number,
  otherIncome: OtherIncome,
  deductionsList: DeductionInput[],
  tdsCredit: number = 0,
  advanceTaxPaid: number = 0,
  regime: string = "new"
): TaxResult {
  const deemedProfitRate = PRESUMPTIVE_44ADA.deemed_profit_rate;
  const deemedIncome = round2(grossProfessionalReceipts * deemedProfitRate);

  const interest = otherIncome.interest ?? 0;
  const rental = otherIncome.rental ?? 0;
  const dividend = otherIncome.dividend ?? 0;
  const other = otherIncome.other ?? 0;
  const grossOther = interest + rental + dividend + other;

  const grossTotalIncome = deemedIncome + grossOther;

  let totalDeductions: number;
  if (regime === "old") {
    totalDeductions = computeDeductions(deductionsList);
  } else {
    // New regime: no standard deduction for business/professional income under 44ADA
    totalDeductions = 0;
  }

  const taxableIncome = Math.max(grossTotalIncome - totalDeductions, 0);

  const slabs = regime === "new" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const taxOnIncome = computeTaxOnSlabs(taxableIncome, slabs);

  const rebate = computeRebate87a(taxOnIncome, taxableIncome, regime);
  const taxAfterRebate = Math.max(taxOnIncome - rebate, 0);

  const surcharge = computeSurcharge(taxAfterRebate, taxableIncome);
  const cess = computeCess(taxAfterRebate + surcharge);
  const totalTax = round2(taxAfterRebate + surcharge + cess);

  const netTax = round2(totalTax - tdsCredit - advanceTaxPaid);

  return {
    fy: "2025-26",
    regime,
    itr_form: "ITR-4",
    gross_professional_income: grossProfessionalReceipts,
    deemed_income: deemedIncome,
    business_expenses: null,
    gross_other_income: grossOther,
    gross_total_income: grossTotalIncome,
    total_deductions: totalDeductions,
    taxable_income: taxableIncome,
    tax_on_income: taxOnIncome,
    rebate_87a: rebate,
    surcharge,
    cess,
    total_tax: totalTax,
    tds_credit: tdsCredit,
    advance_tax_paid: advanceTaxPaid,
    tax_payable: Math.max(netTax, 0),
    tax_refund: Math.abs(Math.min(netTax, 0)),
  };
}

/**
 * Compute tax for ITR-3 (Business/Profession with books of accounts).
 * Income = Receipts - Expenses.
 */
export function computeItr3(
  grossProfessionalIncome: number,
  businessExpenses: number,
  otherIncome: OtherIncome,
  deductionsList: DeductionInput[],
  tdsCredit: number = 0,
  advanceTaxPaid: number = 0,
  regime: string = "new"
): TaxResult {
  const netBusinessIncome = Math.max(
    grossProfessionalIncome - businessExpenses,
    0
  );

  const interest = otherIncome.interest ?? 0;
  const rental = otherIncome.rental ?? 0;
  const dividend = otherIncome.dividend ?? 0;
  const other = otherIncome.other ?? 0;
  const grossOther = interest + rental + dividend + other;

  const grossTotalIncome = netBusinessIncome + grossOther;

  let totalDeductions: number;
  if (regime === "old") {
    totalDeductions = computeDeductions(deductionsList);
  } else {
    totalDeductions = 0;
  }

  const taxableIncome = Math.max(grossTotalIncome - totalDeductions, 0);

  const slabs = regime === "new" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const taxOnIncome = computeTaxOnSlabs(taxableIncome, slabs);

  const rebate = computeRebate87a(taxOnIncome, taxableIncome, regime);
  const taxAfterRebate = Math.max(taxOnIncome - rebate, 0);

  const surcharge = computeSurcharge(taxAfterRebate, taxableIncome);
  const cess = computeCess(taxAfterRebate + surcharge);
  const totalTax = round2(taxAfterRebate + surcharge + cess);

  const netTax = round2(totalTax - tdsCredit - advanceTaxPaid);

  return {
    fy: "2025-26",
    regime,
    itr_form: "ITR-3",
    gross_professional_income: grossProfessionalIncome,
    deemed_income: null,
    business_expenses: businessExpenses,
    gross_other_income: grossOther,
    gross_total_income: grossTotalIncome,
    total_deductions: totalDeductions,
    taxable_income: taxableIncome,
    tax_on_income: taxOnIncome,
    rebate_87a: rebate,
    surcharge,
    cess,
    total_tax: totalTax,
    tds_credit: tdsCredit,
    advance_tax_paid: advanceTaxPaid,
    tax_payable: Math.max(netTax, 0),
    tax_refund: Math.abs(Math.min(netTax, 0)),
  };
}

/** Compare old vs new regime and recommend the better one. */
export function compareRegimes(
  grossProfessionalIncome: number,
  businessExpenses: number,
  otherIncome: OtherIncome,
  deductionsList: DeductionInput[],
  tdsCredit: number = 0,
  advanceTaxPaid: number = 0,
  itrForm: string = "ITR-4"
): RegimeComparison {
  let oldResult: TaxResult;
  let newResult: TaxResult;

  if (itrForm === "ITR-4") {
    oldResult = computeItr4(
      grossProfessionalIncome,
      otherIncome,
      deductionsList,
      tdsCredit,
      advanceTaxPaid,
      "old"
    );
    newResult = computeItr4(
      grossProfessionalIncome,
      otherIncome,
      deductionsList,
      tdsCredit,
      advanceTaxPaid,
      "new"
    );
  } else {
    oldResult = computeItr3(
      grossProfessionalIncome,
      businessExpenses,
      otherIncome,
      deductionsList,
      tdsCredit,
      advanceTaxPaid,
      "old"
    );
    newResult = computeItr3(
      grossProfessionalIncome,
      businessExpenses,
      otherIncome,
      deductionsList,
      tdsCredit,
      advanceTaxPaid,
      "new"
    );
  }

  const oldPayable = oldResult.tax_payable - oldResult.tax_refund;
  const newPayable = newResult.tax_payable - newResult.tax_refund;

  const recommended = newPayable <= oldPayable ? "new" : "old";
  const savings = Math.abs(oldPayable - newPayable);

  return {
    old_regime: oldResult,
    new_regime: newResult,
    recommended,
    savings: round2(savings),
  };
}

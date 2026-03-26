/**
 * Advance tax schedule and interest calculation.
 */

import { ADVANCE_TAX_SCHEDULE, INTEREST_234C } from "./slabs";

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export interface AdvanceTaxInstallment {
  due_date: string;
  cumulative_pct: number;
  cumulative_amount: number;
  installment_amount: number;
}

/**
 * Compute advance tax installment schedule.
 * Advance tax is required if tax liability exceeds 10,000 after TDS.
 */
export function computeAdvanceTaxSchedule(
  totalTaxLiability: number,
  tdsCredit: number = 0
): AdvanceTaxInstallment[] {
  const netTax = totalTaxLiability - tdsCredit;
  if (netTax <= 10_000) {
    return [];
  }

  const schedule: AdvanceTaxInstallment[] = [];
  for (const [dueDate, cumulativePct] of ADVANCE_TAX_SCHEDULE) {
    const amountDue = round2(netTax * cumulativePct);
    const prevCumulativePct =
      schedule.length > 0 ? schedule[schedule.length - 1].cumulative_pct : 0;
    const installment = round2(netTax * (cumulativePct - prevCumulativePct));
    schedule.push({
      due_date: dueDate,
      cumulative_pct: cumulativePct,
      cumulative_amount: amountDue,
      installment_amount: installment,
    });
  }

  return schedule;
}

interface AdvanceTaxPayment {
  date?: string;
  amount?: number;
}

/**
 * Interest u/s 234C for deferment of advance tax.
 * 1% per month on shortfall for each quarter.
 */
export function computeInterest234c(
  advanceTaxPayments: AdvanceTaxPayment[],
  totalTaxLiability: number,
  tdsCredit: number = 0
): number {
  const netTax = totalTaxLiability - tdsCredit;
  if (netTax <= 10_000) {
    return 0;
  }

  let totalInterest = 0;

  // Map payments to quarters
  const quarterPayments: Record<string, number> = {
    Q1: 0, // By June 15
    Q2: 0, // By Sep 15
    Q3: 0, // By Dec 15
    Q4: 0, // By Mar 15
  };

  for (const payment of advanceTaxPayments) {
    const pdate = payment.date ?? "";
    const amount = payment.amount ?? 0;
    if (pdate <= "2025-06-15") {
      quarterPayments["Q1"] += amount;
    } else if (pdate <= "2025-09-15") {
      quarterPayments["Q2"] += amount;
    } else if (pdate <= "2025-12-15") {
      quarterPayments["Q3"] += amount;
    } else {
      quarterPayments["Q4"] += amount;
    }
  }

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  let cumulativePaid = 0;
  for (let i = 0; i < ADVANCE_TAX_SCHEDULE.length; i++) {
    const [, requiredPct] = ADVANCE_TAX_SCHEDULE[i];
    const quarter = quarters[i];
    cumulativePaid += quarterPayments[quarter];
    const required = netTax * requiredPct;
    const shortfall = Math.max(required - cumulativePaid, 0);
    if (shortfall > 0) {
      // Interest for 3 months on shortfall
      const months = 3;
      const interest = round2(shortfall * INTEREST_234C * months);
      totalInterest += interest;
    }
  }

  return round2(totalInterest);
}

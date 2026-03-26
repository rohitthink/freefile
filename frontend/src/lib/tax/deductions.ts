/**
 * Deduction computation under Chapter VI-A (Old Regime only).
 */

import { DEDUCTION_LIMITS } from "./slabs";

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

interface DeductionInput {
  section?: string;
  amount?: number;
  [key: string]: unknown;
}

/**
 * Compute total eligible deductions under old regime.
 * Each deduction: { section: string, amount: number }
 */
export function computeDeductions(deductions: DeductionInput[]): number {
  // Track 80C aggregate (80C + 80CCC + 80CCD(1) share a 1.5L limit)
  let section80cAggregate = 0;
  let total = 0;

  for (const d of deductions) {
    const section = (d.section ?? "").toUpperCase().replace(/ /g, "");
    const amount = d.amount ?? 0;

    if (
      section === "80C" ||
      section === "80CCC" ||
      section === "80CCD_1" ||
      section === "80CCD(1)"
    ) {
      section80cAggregate += amount;
    } else if (section === "80CCD_1B" || section === "80CCD(1B)") {
      const limit = DEDUCTION_LIMITS["80CCD_1B"] ?? 50_000;
      total += Math.min(amount, limit);
    } else if (section === "80D") {
      // Simplified: use combined limit
      total += Math.min(amount, 75_000); // 25K self + 50K parents max
    } else if (section === "80D_SELF" || section === "80D_PARENTS") {
      const key = section.toLowerCase();
      const limit = DEDUCTION_LIMITS[key] ?? 25_000;
      total += Math.min(amount, limit);
    } else if (section === "80E") {
      total += amount; // No limit on education loan interest
    } else if (section === "80G") {
      total += amount; // Varies by org, user enters net eligible amount
    } else if (section === "80TTA") {
      const limit = DEDUCTION_LIMITS["80TTA"] ?? 10_000;
      total += Math.min(amount, limit);
    } else if (section === "80TTB") {
      const limit = DEDUCTION_LIMITS["80TTB"] ?? 50_000;
      total += Math.min(amount, limit);
    } else {
      // Unknown section, cap at entered amount
      const limit = DEDUCTION_LIMITS[section] ?? null;
      if (limit !== null) {
        total += Math.min(amount, limit);
      } else {
        total += amount;
      }
    }
  }

  // Apply 80C aggregate limit
  total += Math.min(section80cAggregate, DEDUCTION_LIMITS["80C"] ?? 150_000);

  return round2(total);
}

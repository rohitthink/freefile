/**
 * Tax slab definitions for FY 2025-26 (AY 2026-27).
 * Updated per Union Budget. This is the SINGLE SOURCE OF TRUTH for rates.
 */

// Slab type: [limit | null, rate]
// null limit means "no upper limit" (last slab)
export type Slab = [number | null, number];

// New Tax Regime (default from FY 2023-24 onwards), updated per Budget 2025
export const NEW_REGIME_SLABS: Slab[] = [
  [400_000, 0.00],   // 0 - 4,00,000: Nil
  [400_000, 0.05],   // 4,00,001 - 8,00,000: 5%
  [400_000, 0.10],   // 8,00,001 - 12,00,000: 10%
  [400_000, 0.15],   // 12,00,001 - 16,00,000: 15%
  [400_000, 0.20],   // 16,00,001 - 20,00,000: 20%
  [400_000, 0.25],   // 20,00,001 - 24,00,000: 25%
  [null, 0.30],      // Above 24,00,000: 30%
];

// Old Tax Regime
export const OLD_REGIME_SLABS: Slab[] = [
  [250_000, 0.00],   // 0 - 2,50,000: Nil
  [250_000, 0.05],   // 2,50,001 - 5,00,000: 5%
  [500_000, 0.20],   // 5,00,001 - 10,00,000: 20%
  [null, 0.30],      // Above 10,00,000: 30%
];

// Rebate under Section 87A
export const REBATE_87A_NEW = {
  limit: 1_200_000,    // Taxable income up to 12,00,000
  max_rebate: 60_000,  // Max rebate amount (Budget 2025)
} as const;

export const REBATE_87A_OLD = {
  limit: 500_000,       // Taxable income up to 5,00,000
  max_rebate: 12_500,
} as const;

// Standard deduction (new regime, for salaried / pension)
export const STANDARD_DEDUCTION_NEW = 75_000; // FY 2025-26

// Surcharge rates on income tax
export const SURCHARGE_RATES: Slab[] = [
  [5_000_000, 0.00],    // Up to 50L: Nil
  [10_000_000, 0.10],   // 50L - 1Cr: 10%
  [20_000_000, 0.15],   // 1Cr - 2Cr: 15%
  [null, 0.25],          // Above 2Cr: 25%
  // Note: For new regime, max surcharge is 25% (no 37% rate)
];

// Marginal relief applies when surcharge pushes tax beyond income increment
// Health and Education Cess
export const CESS_RATE = 0.04; // 4%

// Section 44ADA presumptive taxation
export const PRESUMPTIVE_44ADA = {
  deemed_profit_rate: 0.50,          // 50% of gross receipts
  turnover_limit_digital: 7_500_000, // 75L if 95%+ digital receipts
  turnover_limit_cash: 5_000_000,    // 50L otherwise
} as const;

// Deduction limits under old regime (Chapter VI-A)
export const DEDUCTION_LIMITS: Record<string, number | null> = {
  "80C": 150_000,
  "80CCC": 150_000,       // Part of 80C overall limit
  "80CCD_1": 150_000,     // Part of 80C overall limit
  "80CCD_1B": 50_000,     // Additional NPS (over and above 80C)
  "80CCD_2": null,         // Employer NPS (14% of salary) - no absolute limit
  "80D_self": 25_000,      // Health insurance - self/family (< 60 years)
  "80D_self_senior": 50_000,   // Self/family (>= 60 years)
  "80D_parents": 25_000,       // Parents (< 60 years)
  "80D_parents_senior": 50_000, // Parents (>= 60 years)
  "80E": null,              // Education loan interest - no limit
  "80G": null,              // Donations - varies by org (50% or 100%)
  "80TTA": 10_000,          // Savings account interest (non-senior)
  "80TTB": 50_000,          // All deposit interest (senior citizens)
  "80U": 75_000,            // Disability (severe: 1,25,000)
  "80DD": 75_000,           // Dependent disability (severe: 1,25,000)
  "80DDB": 40_000,          // Medical treatment (senior: 1,00,000)
};

// Advance tax schedule
export const ADVANCE_TAX_SCHEDULE: [string, number][] = [
  ["2025-06-15", 0.15],  // By June 15: 15% of annual tax
  ["2025-09-15", 0.45],  // By Sep 15: 45% cumulative
  ["2025-12-15", 0.75],  // By Dec 15: 75% cumulative
  ["2026-03-15", 1.00],  // By Mar 15: 100%
];

// Interest rates for late/short payment
export const INTEREST_234A = 0.01; // 1% per month for late filing
export const INTEREST_234B = 0.01; // 1% per month for default on advance tax
export const INTEREST_234C = 0.01; // 1% per month for deferment of advance tax

/**
 * Capital gains tax computation engine for Indian income tax.
 *
 * Tax rates (post Budget 2024, FY 2024-25 onwards):
 * - STCG u/s 111A: 20% (listed equity / equity MF)
 * - LTCG u/s 112A: 12.5% (listed equity / equity MF, exempt up to 1.25L)
 * - LTCG u/s 112: 12.5% (other assets like US stocks, no indexation)
 * - Speculative income: taxed at slab rate
 * - F&O (non-speculative business): taxed at slab rate
 *
 * Loss set-off rules:
 * - STCL can offset STCG + LTCG
 * - LTCL can only offset LTCG
 * - Speculative loss only offsets speculative income
 * - F&O loss offsets any non-speculative income
 */

import { CESS_RATE } from "./slabs";

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// Tax rates for capital gains (FY 2024-25 onwards)
export const STCG_111A_RATE = 0.20;       // 20% on listed equity STCG
export const LTCG_112A_RATE = 0.125;      // 12.5% on listed equity LTCG
export const LTCG_112A_EXEMPT = 125_000;  // Exempt up to 1.25 lakh
export const LTCG_112_RATE = 0.125;       // 12.5% on other LTCG (US stocks, etc.)

export type GainType =
  | "STCG_111A"
  | "LTCG_112A"
  | "LTCG_112"
  | "STCG_slab"
  | "speculative"
  | "fno_business";

export interface CapitalGainEntry {
  gain_loss: number;
  gain_type: GainType;
  scrip_name?: string;
}

export type CarryForwardLossType =
  | "STCG_111A"
  | "STCG_slab"
  | "STCL"
  | "LTCG_112A"
  | "LTCG_112"
  | "LTCL"
  | "speculative"
  | "fno_business";

export interface CarryForwardLoss {
  loss_type: CarryForwardLossType;
  remaining_amount: number;
  fy_of_loss: string;
  expires_fy: string;
}

export interface LossToCarry {
  loss_type: string;
  amount: number;
}

export interface CapitalGainsResult {
  // Gross values
  stcg_111a_gross: number;
  ltcg_112a_gross: number;
  ltcg_112_gross: number;
  stcg_slab_gross: number;
  speculative_gross: number;
  fno_gross: number;

  // Net after set-off
  stcg_111a: number;
  ltcg_112a: number;
  ltcg_112a_exempt: number;
  ltcg_112a_taxable: number;
  ltcg_112: number;
  stcg_slab: number;
  speculative: number;
  fno_business: number;

  // Tax
  tax_stcg_111a: number;
  tax_ltcg_112a: number;
  tax_ltcg_112: number;
  total_cg_tax: number;
  cg_cess: number;
  total_cg_tax_with_cess: number;

  // Slab-rate income (to be added to total income in main engine)
  income_at_slab_rate: number;

  // Carry forward
  losses_to_carry: LossToCarry[];
  carry_forward_applied: Record<string, number>;
}

/**
 * Compute capital gains tax from parsed trade entries.
 *
 * @param entries - List of trade entries with gain_loss and gain_type
 * @param carryForwardLosses - Optional list of carry-forward losses from prior years
 * @returns Capital gains breakdown and tax computation
 */
export function computeCapitalGains(
  entries: CapitalGainEntry[],
  carryForwardLosses: CarryForwardLoss[] | null = null
): CapitalGainsResult {
  // Aggregate gains/losses by type
  let stcg111aGross = 0;
  let ltcg112aGross = 0;
  let ltcg112Gross = 0;
  let stcgSlabGross = 0;
  let speculativeGross = 0;
  let fnoGross = 0;

  for (const entry of entries) {
    const gain = entry.gain_loss ?? 0;
    const gainType = entry.gain_type ?? "";

    if (gainType === "STCG_111A") {
      stcg111aGross += gain;
    } else if (gainType === "LTCG_112A") {
      ltcg112aGross += gain;
    } else if (gainType === "LTCG_112") {
      ltcg112Gross += gain;
    } else if (gainType === "STCG_slab") {
      stcgSlabGross += gain;
    } else if (gainType === "speculative") {
      speculativeGross += gain;
    } else if (gainType === "fno_business") {
      fnoGross += gain;
    }
  }

  // --- Apply loss set-off rules ---
  // Start with net values
  let stcg111aNet = stcg111aGross;
  let ltcg112aNet = ltcg112aGross;
  let ltcg112Net = ltcg112Gross;
  let stcgSlabNet = stcgSlabGross;
  let speculativeNet = speculativeGross;
  let fnoNet = fnoGross;

  // Intra-head set-off: losses within capital gains
  // STCL can offset STCG + LTCG
  let totalStcl = 0;
  if (stcg111aNet < 0) {
    totalStcl += Math.abs(stcg111aNet);
    stcg111aNet = 0;
  }
  if (stcgSlabNet < 0) {
    totalStcl += Math.abs(stcgSlabNet);
    stcgSlabNet = 0;
  }

  // LTCL can only offset LTCG
  let totalLtcl = 0;
  if (ltcg112aNet < 0) {
    totalLtcl += Math.abs(ltcg112aNet);
    ltcg112aNet = 0;
  }
  if (ltcg112Net < 0) {
    totalLtcl += Math.abs(ltcg112Net);
    ltcg112Net = 0;
  }

  // Set off STCL against remaining STCG first, then LTCG
  if (totalStcl > 0) {
    // Against STCG 111A
    if (stcg111aNet > 0) {
      const offset = Math.min(totalStcl, stcg111aNet);
      stcg111aNet -= offset;
      totalStcl -= offset;
    }
    // Against STCG slab
    if (totalStcl > 0 && stcgSlabNet > 0) {
      const offset = Math.min(totalStcl, stcgSlabNet);
      stcgSlabNet -= offset;
      totalStcl -= offset;
    }
    // Against LTCG 112A
    if (totalStcl > 0 && ltcg112aNet > 0) {
      const offset = Math.min(totalStcl, ltcg112aNet);
      ltcg112aNet -= offset;
      totalStcl -= offset;
    }
    // Against LTCG 112
    if (totalStcl > 0 && ltcg112Net > 0) {
      const offset = Math.min(totalStcl, ltcg112Net);
      ltcg112Net -= offset;
      totalStcl -= offset;
    }
  }

  // Set off LTCL against LTCG only
  if (totalLtcl > 0) {
    if (ltcg112aNet > 0) {
      const offset = Math.min(totalLtcl, ltcg112aNet);
      ltcg112aNet -= offset;
      totalLtcl -= offset;
    }
    if (totalLtcl > 0 && ltcg112Net > 0) {
      const offset = Math.min(totalLtcl, ltcg112Net);
      ltcg112Net -= offset;
      totalLtcl -= offset;
    }
  }

  // Speculative loss only offsets speculative income (already net)
  let speculativeLossCf = 0;
  if (speculativeNet < 0) {
    speculativeLossCf = Math.abs(speculativeNet);
    speculativeNet = 0;
  }

  // F&O loss can offset any non-speculative income (handled in main engine)
  let fnoLossCf = 0;
  if (fnoNet < 0) {
    fnoLossCf = Math.abs(fnoNet);
    fnoNet = 0;
  }

  // --- Apply carry-forward losses ---
  const cfApplied: Record<string, number> = {};
  if (carryForwardLosses) {
    const sorted = [...carryForwardLosses].sort((a, b) =>
      (a.fy_of_loss ?? "").localeCompare(b.fy_of_loss ?? "")
    );

    for (const cfl of sorted) {
      const lossType = cfl.loss_type ?? "";
      let remaining = cfl.remaining_amount ?? 0;
      if (remaining <= 0) continue;

      let applied = 0;

      if (
        lossType === "STCG_111A" ||
        lossType === "STCG_slab" ||
        lossType === "STCL"
      ) {
        // STCL carry-forward can offset STCG + LTCG
        if (stcg111aNet > 0) {
          const offset = Math.min(remaining, stcg111aNet);
          stcg111aNet -= offset;
          remaining -= offset;
          applied += offset;
        }
        if (remaining > 0 && stcgSlabNet > 0) {
          const offset = Math.min(remaining, stcgSlabNet);
          stcgSlabNet -= offset;
          remaining -= offset;
          applied += offset;
        }
        if (remaining > 0 && ltcg112aNet > 0) {
          const offset = Math.min(remaining, ltcg112aNet);
          ltcg112aNet -= offset;
          remaining -= offset;
          applied += offset;
        }
        if (remaining > 0 && ltcg112Net > 0) {
          const offset = Math.min(remaining, ltcg112Net);
          ltcg112Net -= offset;
          remaining -= offset;
          applied += offset;
        }
      } else if (
        lossType === "LTCG_112A" ||
        lossType === "LTCG_112" ||
        lossType === "LTCL"
      ) {
        // LTCL carry-forward only offsets LTCG
        if (ltcg112aNet > 0) {
          const offset = Math.min(remaining, ltcg112aNet);
          ltcg112aNet -= offset;
          remaining -= offset;
          applied += offset;
        }
        if (remaining > 0 && ltcg112Net > 0) {
          const offset = Math.min(remaining, ltcg112Net);
          ltcg112Net -= offset;
          remaining -= offset;
          applied += offset;
        }
      } else if (lossType === "speculative") {
        if (speculativeNet > 0) {
          const offset = Math.min(remaining, speculativeNet);
          speculativeNet -= offset;
          remaining -= offset;
          applied += offset;
        }
      } else if (lossType === "fno_business") {
        // F&O carry-forward loss offsets non-speculative income
        if (fnoNet > 0) {
          const offset = Math.min(remaining, fnoNet);
          fnoNet -= offset;
          remaining -= offset;
          applied += offset;
        }
      }

      if (applied > 0) {
        cfApplied[cfl.fy_of_loss ?? "unknown"] = applied;
      }
    }
  }

  // --- Compute tax on each head ---
  // STCG 111A: 20%
  const taxStcg111a = round2(Math.max(stcg111aNet, 0) * STCG_111A_RATE);

  // LTCG 112A: 12.5% with 1.25L exemption
  const ltcg112aTaxable = Math.max(ltcg112aNet - LTCG_112A_EXEMPT, 0);
  const taxLtcg112a = round2(ltcg112aTaxable * LTCG_112A_RATE);

  // LTCG 112: 12.5% (no exemption)
  const taxLtcg112 = round2(Math.max(ltcg112Net, 0) * LTCG_112_RATE);

  // Speculative and F&O: taxed at slab rate (added to total income in main engine)
  // We return the net values so the main engine can add them to slab income

  const totalCgTax = round2(taxStcg111a + taxLtcg112a + taxLtcg112);

  // Cess on CG tax
  const cgCess = round2(totalCgTax * CESS_RATE);

  // Losses to carry forward (8 years)
  const lossesToCarry: LossToCarry[] = [];
  if (totalStcl > 0) {
    lossesToCarry.push({ loss_type: "STCL", amount: round2(totalStcl) });
  }
  if (totalLtcl > 0) {
    lossesToCarry.push({ loss_type: "LTCL", amount: round2(totalLtcl) });
  }
  if (speculativeLossCf > 0) {
    lossesToCarry.push({ loss_type: "speculative", amount: round2(speculativeLossCf) });
  }
  if (fnoLossCf > 0) {
    lossesToCarry.push({ loss_type: "fno_business", amount: round2(fnoLossCf) });
  }

  return {
    // Gross values
    stcg_111a_gross: round2(stcg111aGross),
    ltcg_112a_gross: round2(ltcg112aGross),
    ltcg_112_gross: round2(ltcg112Gross),
    stcg_slab_gross: round2(stcgSlabGross),
    speculative_gross: round2(speculativeGross),
    fno_gross: round2(fnoGross),

    // Net after set-off
    stcg_111a: round2(stcg111aNet),
    ltcg_112a: round2(ltcg112aNet),
    ltcg_112a_exempt: ltcg112aNet > 0 ? Math.min(ltcg112aNet, LTCG_112A_EXEMPT) : 0,
    ltcg_112a_taxable: round2(ltcg112aTaxable),
    ltcg_112: round2(ltcg112Net),
    stcg_slab: round2(stcgSlabNet),
    speculative: round2(speculativeNet),
    fno_business: round2(fnoNet),

    // Tax
    tax_stcg_111a: taxStcg111a,
    tax_ltcg_112a: taxLtcg112a,
    tax_ltcg_112: taxLtcg112,
    total_cg_tax: totalCgTax,
    cg_cess: cgCess,
    total_cg_tax_with_cess: round2(totalCgTax + cgCess),

    // Slab-rate income (to be added to total income in main engine)
    income_at_slab_rate: round2(stcgSlabNet + speculativeNet + fnoNet),

    // Carry forward
    losses_to_carry: lossesToCarry,
    carry_forward_applied: cfApplied,
  };
}

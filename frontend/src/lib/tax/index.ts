/**
 * Tax computation engine - barrel exports.
 */

export {
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  REBATE_87A_NEW,
  REBATE_87A_OLD,
  SURCHARGE_RATES,
  CESS_RATE,
  PRESUMPTIVE_44ADA,
  STANDARD_DEDUCTION_NEW,
  DEDUCTION_LIMITS,
  ADVANCE_TAX_SCHEDULE,
  INTEREST_234A,
  INTEREST_234B,
  INTEREST_234C,
  type Slab,
} from "./slabs";

export { computeDeductions } from "./deductions";

export {
  computeTaxOnSlabs,
  computeSurcharge,
  computeCess,
  computeRebate87a,
  computeItr4,
  computeItr3,
  compareRegimes,
} from "./engine";

export {
  computeAdvanceTaxSchedule,
  computeInterest234c,
  type AdvanceTaxInstallment,
} from "./advance-tax";

export {
  computeCapitalGains,
  STCG_111A_RATE,
  LTCG_112A_RATE,
  LTCG_112A_EXEMPT,
  LTCG_112_RATE,
  type GainType,
  type CapitalGainEntry,
  type CarryForwardLossType,
  type CarryForwardLoss,
  type LossToCarry,
  type CapitalGainsResult,
} from "./capital-gains";

import { describe, it, expect } from "vitest";
import {
  computeItr4,
  computeItr3,
  compareRegimes,
  computeAdvanceTaxSchedule,
} from "../index";
import fixtures from "./fixtures.json";

describe("Tax Engine - Python parity tests", () => {
  it("Case 1: 20L freelancer, new regime, ITR-4", () => {
    const result = computeItr4(
      2_000_000,
      { interest: 50_000, rental: 0, dividend: 0, other: 0 },
      [],
      80_000,
      0,
      "new"
    );
    expect(result).toEqual(fixtures.case1);
  });

  it("Case 2: 20L freelancer, old regime + deductions, ITR-4", () => {
    const result = computeItr4(
      2_000_000,
      { interest: 50_000, rental: 0, dividend: 0, other: 0 },
      [
        { section: "80C", amount: 150_000 },
        { section: "80D", amount: 25_000 },
      ],
      80_000,
      0,
      "old"
    );
    expect(result).toEqual(fixtures.case2);
  });

  it("Case 3: ITR-3 with expenses, new regime", () => {
    const result = computeItr3(
      3_000_000,
      800_000,
      { interest: 100_000, rental: 0, dividend: 0, other: 0 },
      [],
      100_000,
      50_000,
      "new"
    );
    expect(result).toEqual(fixtures.case3);
  });

  it("Case 4: Compare regimes (ITR-4)", () => {
    const result = compareRegimes(
      2_000_000,
      0,
      { interest: 50_000, rental: 0, dividend: 0, other: 0 },
      [{ section: "80C", amount: 150_000 }],
      80_000,
      0,
      "ITR-4"
    );
    expect(result).toEqual(fixtures.case4);
  });

  it("Case 5: Advance tax schedule", () => {
    const result = computeAdvanceTaxSchedule(500_000, 80_000);
    expect(result).toEqual(fixtures.case5);
  });

  it("Case 6: Zero income", () => {
    const result = computeItr4(
      0,
      { interest: 0, rental: 0, dividend: 0, other: 0 },
      [],
      0,
      0,
      "new"
    );
    expect(result).toEqual(fixtures.case6);
  });

  it("Case 7: High income with surcharge (6Cr receipts)", () => {
    const result = computeItr4(
      60_000_000,
      { interest: 500_000, rental: 0, dividend: 0, other: 0 },
      [],
      200_000,
      100_000,
      "new"
    );
    expect(result).toEqual(fixtures.case7);
  });
});

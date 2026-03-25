"""Core tax computation engine for Indian income tax."""

from .slabs import (
    NEW_REGIME_SLABS, OLD_REGIME_SLABS,
    REBATE_87A_NEW, REBATE_87A_OLD,
    SURCHARGE_RATES, CESS_RATE,
    PRESUMPTIVE_44ADA, STANDARD_DEDUCTION_NEW,
)
from .deductions import compute_deductions


def compute_tax_on_slabs(taxable_income: float, slabs: list[tuple]) -> float:
    """Compute tax using given slab rates."""
    tax = 0.0
    remaining = taxable_income

    for slab_limit, rate in slabs:
        if slab_limit is None:
            # Last slab, no upper limit
            tax += remaining * rate
            break
        taxable_in_slab = min(remaining, slab_limit)
        tax += taxable_in_slab * rate
        remaining -= taxable_in_slab
        if remaining <= 0:
            break

    return round(tax, 2)


def compute_surcharge(tax: float, taxable_income: float) -> float:
    """Compute surcharge on income tax with marginal relief."""
    applicable_rate = 0.0
    for threshold, rate in SURCHARGE_RATES:
        if threshold is None or taxable_income <= threshold:
            applicable_rate = rate
            break
        applicable_rate = rate

    surcharge = round(tax * applicable_rate, 2)

    # Marginal relief: surcharge should not exceed income exceeding the threshold
    if applicable_rate > 0:
        prev_threshold = 0
        for threshold, rate in SURCHARGE_RATES:
            if rate == applicable_rate and prev_threshold > 0:
                excess_income = taxable_income - prev_threshold
                tax_at_prev = compute_tax_on_slabs(prev_threshold, NEW_REGIME_SLABS)
                if tax + surcharge > tax_at_prev + excess_income:
                    surcharge = max(0, (tax_at_prev + excess_income) - tax)
                break
            if threshold is not None:
                prev_threshold = threshold

    return round(surcharge, 2)


def compute_cess(tax_plus_surcharge: float) -> float:
    """4% Health and Education Cess."""
    return round(tax_plus_surcharge * CESS_RATE, 2)


def compute_rebate_87a(tax: float, taxable_income: float, regime: str) -> float:
    """Compute rebate under Section 87A."""
    if regime == "new":
        if taxable_income <= REBATE_87A_NEW["limit"]:
            return min(tax, REBATE_87A_NEW["max_rebate"])
    else:
        if taxable_income <= REBATE_87A_OLD["limit"]:
            return min(tax, REBATE_87A_OLD["max_rebate"])
    return 0.0


def compute_itr4(
    gross_professional_receipts: float,
    other_income: dict,
    deductions_list: list[dict],
    tds_credit: float = 0.0,
    advance_tax_paid: float = 0.0,
    regime: str = "new",
) -> dict:
    """
    Compute tax for ITR-4 (Presumptive taxation under 44ADA).
    50% of gross receipts deemed as income.
    """
    deemed_profit_rate = PRESUMPTIVE_44ADA["deemed_profit_rate"]
    deemed_income = round(gross_professional_receipts * deemed_profit_rate, 2)

    interest = other_income.get("interest", 0.0)
    rental = other_income.get("rental", 0.0)
    dividend = other_income.get("dividend", 0.0)
    other = other_income.get("other", 0.0)
    gross_other = interest + rental + dividend + other

    gross_total_income = deemed_income + gross_other

    if regime == "old":
        total_deductions = compute_deductions(deductions_list)
    else:
        # New regime: standard deduction of 75K for salaried only
        # For business/professional income under 44ADA, no standard deduction
        total_deductions = 0.0

    taxable_income = max(gross_total_income - total_deductions, 0.0)

    slabs = NEW_REGIME_SLABS if regime == "new" else OLD_REGIME_SLABS
    tax_on_income = compute_tax_on_slabs(taxable_income, slabs)

    rebate = compute_rebate_87a(tax_on_income, taxable_income, regime)
    tax_after_rebate = max(tax_on_income - rebate, 0.0)

    surcharge = compute_surcharge(tax_after_rebate, taxable_income)
    cess = compute_cess(tax_after_rebate + surcharge)
    total_tax = round(tax_after_rebate + surcharge + cess, 2)

    net_tax = round(total_tax - tds_credit - advance_tax_paid, 2)

    return {
        "fy": "2025-26",
        "regime": regime,
        "itr_form": "ITR-4",
        "gross_professional_income": gross_professional_receipts,
        "deemed_income": deemed_income,
        "gross_other_income": gross_other,
        "gross_total_income": gross_total_income,
        "business_expenses": None,
        "total_deductions": total_deductions,
        "taxable_income": taxable_income,
        "tax_on_income": tax_on_income,
        "rebate_87a": rebate,
        "surcharge": surcharge,
        "cess": cess,
        "total_tax": total_tax,
        "tds_credit": tds_credit,
        "advance_tax_paid": advance_tax_paid,
        "tax_payable": max(net_tax, 0.0),
        "tax_refund": abs(min(net_tax, 0.0)),
    }


def compute_itr3(
    gross_professional_income: float,
    business_expenses: float,
    other_income: dict,
    deductions_list: list[dict],
    tds_credit: float = 0.0,
    advance_tax_paid: float = 0.0,
    regime: str = "new",
) -> dict:
    """
    Compute tax for ITR-3 (Business/Profession with books of accounts).
    Income = Receipts - Expenses.
    """
    net_business_income = max(gross_professional_income - business_expenses, 0.0)

    interest = other_income.get("interest", 0.0)
    rental = other_income.get("rental", 0.0)
    dividend = other_income.get("dividend", 0.0)
    other = other_income.get("other", 0.0)
    gross_other = interest + rental + dividend + other

    gross_total_income = net_business_income + gross_other

    if regime == "old":
        total_deductions = compute_deductions(deductions_list)
    else:
        total_deductions = 0.0

    taxable_income = max(gross_total_income - total_deductions, 0.0)

    slabs = NEW_REGIME_SLABS if regime == "new" else OLD_REGIME_SLABS
    tax_on_income = compute_tax_on_slabs(taxable_income, slabs)

    rebate = compute_rebate_87a(tax_on_income, taxable_income, regime)
    tax_after_rebate = max(tax_on_income - rebate, 0.0)

    surcharge = compute_surcharge(tax_after_rebate, taxable_income)
    cess = compute_cess(tax_after_rebate + surcharge)
    total_tax = round(tax_after_rebate + surcharge + cess, 2)

    net_tax = round(total_tax - tds_credit - advance_tax_paid, 2)

    return {
        "fy": "2025-26",
        "regime": regime,
        "itr_form": "ITR-3",
        "gross_professional_income": gross_professional_income,
        "deemed_income": None,
        "business_expenses": business_expenses,
        "gross_other_income": gross_other,
        "gross_total_income": gross_total_income,
        "total_deductions": total_deductions,
        "taxable_income": taxable_income,
        "tax_on_income": tax_on_income,
        "rebate_87a": rebate,
        "surcharge": surcharge,
        "cess": cess,
        "total_tax": total_tax,
        "tds_credit": tds_credit,
        "advance_tax_paid": advance_tax_paid,
        "tax_payable": max(net_tax, 0.0),
        "tax_refund": abs(min(net_tax, 0.0)),
    }


def compare_regimes(
    gross_professional_income: float,
    business_expenses: float,
    other_income: dict,
    deductions_list: list[dict],
    tds_credit: float = 0.0,
    advance_tax_paid: float = 0.0,
    itr_form: str = "ITR-4",
) -> dict:
    """Compare old vs new regime and recommend the better one."""
    compute_fn = compute_itr4 if itr_form == "ITR-4" else compute_itr3

    if itr_form == "ITR-4":
        old = compute_fn(gross_professional_income, other_income, deductions_list, tds_credit, advance_tax_paid, "old")
        new = compute_fn(gross_professional_income, other_income, deductions_list, tds_credit, advance_tax_paid, "new")
    else:
        old = compute_fn(gross_professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, "old")
        new = compute_fn(gross_professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, "new")

    old_payable = old["tax_payable"] - old["tax_refund"]
    new_payable = new["tax_payable"] - new["tax_refund"]

    recommended = "new" if new_payable <= old_payable else "old"
    savings = abs(old_payable - new_payable)

    return {
        "old_regime": old,
        "new_regime": new,
        "recommended": recommended,
        "savings": round(savings, 2),
    }

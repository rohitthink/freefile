"""Advance tax schedule and interest calculation."""

from datetime import date
from .slabs import ADVANCE_TAX_SCHEDULE, INTEREST_234B, INTEREST_234C


def compute_advance_tax_schedule(total_tax_liability: float, tds_credit: float = 0.0) -> list[dict]:
    """
    Compute advance tax installment schedule.
    Advance tax is required if tax liability exceeds 10,000 after TDS.
    """
    net_tax = total_tax_liability - tds_credit
    if net_tax <= 10_000:
        return []

    schedule = []
    for due_date, cumulative_pct in ADVANCE_TAX_SCHEDULE:
        amount_due = round(net_tax * cumulative_pct, 2)
        installment = round(net_tax * (cumulative_pct - (schedule[-1]["cumulative_pct"] if schedule else 0)), 2)
        schedule.append({
            "due_date": due_date,
            "cumulative_pct": cumulative_pct,
            "cumulative_amount": amount_due,
            "installment_amount": installment,
        })

    return schedule


def compute_interest_234c(
    advance_tax_payments: list[dict],
    total_tax_liability: float,
    tds_credit: float = 0.0,
) -> float:
    """
    Interest u/s 234C for deferment of advance tax.
    1% per month on shortfall for each quarter.
    """
    net_tax = total_tax_liability - tds_credit
    if net_tax <= 10_000:
        return 0.0

    total_interest = 0.0
    paid_cumulative = 0.0

    # Map payments to quarters
    quarter_payments = {
        "Q1": 0.0,  # By June 15
        "Q2": 0.0,  # By Sep 15
        "Q3": 0.0,  # By Dec 15
        "Q4": 0.0,  # By Mar 15
    }

    for payment in advance_tax_payments:
        pdate = payment.get("date", "")
        amount = payment.get("amount", 0.0)
        if pdate <= "2025-06-15":
            quarter_payments["Q1"] += amount
        elif pdate <= "2025-09-15":
            quarter_payments["Q2"] += amount
        elif pdate <= "2025-12-15":
            quarter_payments["Q3"] += amount
        else:
            quarter_payments["Q4"] += amount

    cumulative_paid = 0.0
    for (due_date, required_pct), quarter in zip(ADVANCE_TAX_SCHEDULE, ["Q1", "Q2", "Q3", "Q4"]):
        cumulative_paid += quarter_payments[quarter]
        required = net_tax * required_pct
        shortfall = max(required - cumulative_paid, 0.0)
        if shortfall > 0:
            # Interest for 3 months on shortfall
            months = 3
            interest = round(shortfall * INTEREST_234C * months, 2)
            total_interest += interest

    return round(total_interest, 2)

"""Deduction computation under Chapter VI-A (Old Regime only)."""

from .slabs import DEDUCTION_LIMITS


def compute_deductions(deductions: list[dict]) -> float:
    """
    Compute total eligible deductions under old regime.
    Each deduction dict: {section: str, amount: float, description: str}
    """
    # Track 80C aggregate (80C + 80CCC + 80CCD(1) share a 1.5L limit)
    section_80c_aggregate = 0.0
    total = 0.0

    for d in deductions:
        section = d.get("section", "").upper().replace(" ", "")
        amount = d.get("amount", 0.0)

        if section in ("80C", "80CCC", "80CCD_1", "80CCD(1)"):
            section_80c_aggregate += amount
        elif section in ("80CCD_1B", "80CCD(1B)"):
            limit = DEDUCTION_LIMITS.get("80CCD_1B", 50_000)
            total += min(amount, limit)
        elif section == "80D":
            # Simplified: use combined limit
            total += min(amount, 75_000)  # 25K self + 50K parents max
        elif section in ("80D_SELF", "80D_PARENTS"):
            key = section.lower()
            limit = DEDUCTION_LIMITS.get(key, 25_000)
            total += min(amount, limit)
        elif section == "80E":
            total += amount  # No limit on education loan interest
        elif section == "80G":
            total += amount  # Varies by org, user enters net eligible amount
        elif section == "80TTA":
            limit = DEDUCTION_LIMITS.get("80TTA", 10_000)
            total += min(amount, limit)
        elif section == "80TTB":
            limit = DEDUCTION_LIMITS.get("80TTB", 50_000)
            total += min(amount, limit)
        else:
            # Unknown section, cap at entered amount
            limit = DEDUCTION_LIMITS.get(section, None)
            if limit is not None:
                total += min(amount, limit)
            else:
                total += amount

    # Apply 80C aggregate limit
    total += min(section_80c_aggregate, DEDUCTION_LIMITS.get("80C", 150_000))

    return round(total, 2)

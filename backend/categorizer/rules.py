"""Rule-based transaction categorization engine."""

from .keywords import CATEGORY_KEYWORDS, LARGE_CREDIT_THRESHOLD, SMALL_UPI_THRESHOLD


def categorize_transaction(
    narration: str,
    amount: float,
    tx_type: str,
    overrides: dict[str, str] | None = None,
) -> str:
    """
    Categorize a transaction based on narration text and amount.
    Returns category string.
    """
    narration_lower = narration.lower().strip()

    # Check user overrides first
    if overrides:
        for pattern, category in overrides.items():
            if pattern.lower() in narration_lower:
                return category

    # Keyword matching
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in narration_lower:
                return category

    # Heuristic rules for uncategorized
    if tx_type == "credit":
        # Large credits via NEFT/RTGS/IMPS are likely professional income
        if amount >= LARGE_CREDIT_THRESHOLD:
            for prefix in ["neft", "rtgs", "imps"]:
                if prefix in narration_lower:
                    return "professional_income"
        # Interest entries
        if "int" in narration_lower:
            return "interest_income"
        return "other_income"

    if tx_type == "debit":
        # UPI small payments are likely personal
        if "upi" in narration_lower and amount < SMALL_UPI_THRESHOLD:
            return "personal"
        # EMI payments
        if "emi" in narration_lower:
            return "personal"

    return "uncategorized"


def categorize_transactions(
    transactions: list[dict],
    overrides: dict[str, str] | None = None,
) -> list[dict]:
    """Categorize a list of transactions in place."""
    for tx in transactions:
        if not tx.get("category_confirmed"):
            tx["category"] = categorize_transaction(
                narration=tx["narration"],
                amount=tx["amount"],
                tx_type=tx["tx_type"],
                overrides=overrides,
            )
    return transactions

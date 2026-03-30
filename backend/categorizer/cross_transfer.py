"""Cross-transfer detection for identifying self-transfers across bank accounts."""

from datetime import datetime, timedelta

# UPI handles belonging to the user -- extend as needed
OWN_UPI_HANDLES: list[str] = [
    "rohitthink@axl",
    "rohitthink@ybl",
    "rohitthink@ibl",
    "rohitthink@okic",
    "rohitthink@sbi",
    "rohitga@icici",
    "rohitga@ibl",
    "rohitthink",
    "rohitga",
]

# Narration patterns that indicate CC bill / self-payment transfers
CC_BILL_PATTERNS: list[str] = [
    "bil/inft",
    "billpay",
    "cc billpay",
    "cc bill",
    "credit card bill",
    "credit card payment",
    "cred.club",
    "cred club",
    "paid via cred",
    "icici bank credit ca",
    "self transfer",
]

# Family member names -- configure per user
FAMILY_NAMES: list[str] = ["Probir Ganguly", "PROBIR GANGULY"]

# Maximum day gap for matching a debit in one account with a credit in another
DATE_TOLERANCE_DAYS = 2


def _parse_date(date_str: str) -> datetime:
    """Parse a date string, trying common Indian bank formats."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: {date_str}")


def _contains_own_upi(narration: str) -> bool:
    """Check if narration contains any of the user's own UPI handles."""
    narr = narration.lower()
    return any(handle.lower() in narr for handle in OWN_UPI_HANDLES)


def _is_cc_bill(narration: str) -> bool:
    """Check if narration matches a credit-card bill payment pattern."""
    narr = narration.lower()
    return any(pat in narr for pat in CC_BILL_PATTERNS)


def _contains_family_name(narration: str) -> bool:
    """Check if narration contains a configured family member name."""
    if not FAMILY_NAMES:
        return False
    narr = narration.lower()
    return any(name.lower() in narr for name in FAMILY_NAMES)


def detect_cross_transfers(transactions: list[dict]) -> list[dict]:
    """
    Identify self-transfers in a list of transactions and mark them as
    category='transfer'.

    Detection strategies (applied in order):
    1. Narration contains the user's own UPI handle.
    2. Narration matches a CC bill payment pattern.
    3. Narration contains a family member name (configurable).
    4. Amount-matching: a debit and a credit with the same amount appear
       within +/- 2 days (likely inter-account transfer).

    Parameters
    ----------
    transactions : list[dict]
        Each dict must have at least: date, amount, narration, tx_type, category.
        Optionally: bank_account_id (used for cross-account matching).

    Returns
    -------
    list[dict]
        The same list with cross-transfer transactions updated to
        category='transfer'.
    """
    # Pass 1: pattern-based detection
    for tx in transactions:
        if tx.get("category_confirmed"):
            continue
        narration = tx.get("narration", "")
        if _contains_own_upi(narration) or _is_cc_bill(narration) or _contains_family_name(narration):
            tx["category"] = "transfer"

    # Pass 2: amount-matching across accounts
    # Group debits and credits separately
    debits: list[tuple[int, dict]] = []
    credits: list[tuple[int, dict]] = []
    for idx, tx in enumerate(transactions):
        if tx.get("category_confirmed"):
            continue
        if tx.get("tx_type") == "debit":
            debits.append((idx, tx))
        elif tx.get("tx_type") == "credit":
            credits.append((idx, tx))

    tolerance = timedelta(days=DATE_TOLERANCE_DAYS)
    matched_indices: set[int] = set()

    for d_idx, d_tx in debits:
        if d_idx in matched_indices:
            continue
        try:
            d_date = _parse_date(d_tx["date"])
        except (ValueError, KeyError):
            continue
        d_amount = d_tx["amount"]
        d_account = d_tx.get("bank_account_id")

        for c_idx, c_tx in credits:
            if c_idx in matched_indices:
                continue
            # Same account transfers are not cross-transfers
            c_account = c_tx.get("bank_account_id")
            if d_account is not None and c_account is not None and d_account == c_account:
                continue
            if c_tx["amount"] != d_amount:
                continue
            try:
                c_date = _parse_date(c_tx["date"])
            except (ValueError, KeyError):
                continue
            if abs(d_date - c_date) <= tolerance:
                matched_indices.add(d_idx)
                matched_indices.add(c_idx)
                break

    for idx in matched_indices:
        tx = transactions[idx]
        if not tx.get("category_confirmed"):
            tx["category"] = "transfer"

    return transactions

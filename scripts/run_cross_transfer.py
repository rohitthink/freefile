"""Run cross-transfer detection on FY 2025-26 transactions and update the DB."""

import sqlite3
import sys
import os

# Add project root to path so we can import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.categorizer.cross_transfer import detect_cross_transfers


DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "freefile.db")
FY = "2025-26"


def load_transactions(conn: sqlite3.Connection) -> list[dict]:
    """Load all FY 2025-26 transactions as list of dicts."""
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        "SELECT id, fy, bank_account_id, date, narration, amount, tx_type, "
        "balance, reference, category, category_confirmed, source_file "
        "FROM transactions WHERE fy = ?",
        (FY,),
    )
    return [dict(row) for row in cur.fetchall()]


def main():
    conn = sqlite3.connect(DB_PATH)

    # --- Load ---
    txns = load_transactions(conn)
    total = len(txns)

    # Snapshot: which IDs are already categorized as transfer
    pre_transfer_ids = {t["id"] for t in txns if t["category"] == "transfer"}
    pre_uncategorized = sum(1 for t in txns if t["category"] == "uncategorized")

    print(f"Loaded {total} transactions for FY {FY}")
    print(f"Already categorized as transfer: {len(pre_transfer_ids)}")
    print(f"Currently uncategorized: {pre_uncategorized}")
    print()

    # --- Detect ---
    detect_cross_transfers(txns)

    # Identify newly detected transfers
    new_transfer_txns = [
        t for t in txns
        if t["category"] == "transfer" and t["id"] not in pre_transfer_ids
    ]
    all_transfer_txns = [t for t in txns if t["category"] == "transfer"]

    print("=" * 60)
    print("CROSS-TRANSFER DETECTION RESULTS")
    print("=" * 60)
    print(f"Total transactions:          {total}")
    print(f"Previously transfer:         {len(pre_transfer_ids)}")
    print(f"Newly detected transfers:    {len(new_transfer_txns)}")
    print(f"Total transfers now:         {len(all_transfer_txns)}")
    print(f"Total transfer amount:       Rs {sum(t['amount'] for t in all_transfer_txns):,.2f}")
    print()

    # Show sample newly detected
    if new_transfer_txns:
        print("--- Sample newly detected transfers ---")
        for t in new_transfer_txns[:20]:
            print(f"  [{t['tx_type']:6}] Rs {t['amount']:>12,.2f}  {t['narration'][:80]}")
        if len(new_transfer_txns) > 20:
            print(f"  ... and {len(new_transfer_txns) - 20} more")
        print()

    # --- Update DB ---
    print("Updating database...")
    updated = 0
    for t in new_transfer_txns:
        conn.execute(
            "UPDATE transactions SET category = 'transfer' WHERE id = ? AND category_confirmed = 0",
            (t["id"],),
        )
        updated += 1
    conn.commit()
    print(f"Updated {updated} transactions to category='transfer'")
    print()

    # --- Final Summary ---
    print("=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)

    # Reload for accurate counts
    conn.row_factory = None
    cur = conn.execute(
        "SELECT category, tx_type, COUNT(*), SUM(amount) "
        "FROM transactions WHERE fy = ? "
        "GROUP BY category, tx_type ORDER BY category, tx_type",
        (FY,),
    )
    rows = cur.fetchall()

    cat_summary: dict[str, dict] = {}
    for cat, tx_type, count, total_amt in rows:
        if cat not in cat_summary:
            cat_summary[cat] = {"credit_count": 0, "credit_amt": 0.0, "debit_count": 0, "debit_amt": 0.0}
        if tx_type == "credit":
            cat_summary[cat]["credit_count"] = count
            cat_summary[cat]["credit_amt"] = total_amt or 0.0
        else:
            cat_summary[cat]["debit_count"] = count
            cat_summary[cat]["debit_amt"] = total_amt or 0.0

    total_txns = sum(v["credit_count"] + v["debit_count"] for v in cat_summary.values())
    transfer_count = (
        cat_summary.get("transfer", {}).get("credit_count", 0)
        + cat_summary.get("transfer", {}).get("debit_count", 0)
    )
    uncategorized_count = (
        cat_summary.get("uncategorized", {}).get("credit_count", 0)
        + cat_summary.get("uncategorized", {}).get("debit_count", 0)
    )

    print(f"Total transactions:      {total_txns}")
    print(f"Transfers detected:      {transfer_count}")
    print(f"Remaining uncategorized: {uncategorized_count}")
    print()

    # Income breakdown (credits only, excluding transfers)
    print("--- Income Breakdown (credits, non-transfer) ---")
    for cat in sorted(cat_summary.keys()):
        v = cat_summary[cat]
        if cat == "transfer" or cat == "uncategorized":
            continue
        if v["credit_count"] > 0:
            print(f"  {cat:25s}  {v['credit_count']:4d} txns  Rs {v['credit_amt']:>14,.2f}")

    print()
    print("--- Expense Breakdown (debits, non-transfer) ---")
    for cat in sorted(cat_summary.keys()):
        v = cat_summary[cat]
        if cat == "transfer" or cat == "uncategorized":
            continue
        if v["debit_count"] > 0:
            print(f"  {cat:25s}  {v['debit_count']:4d} txns  Rs {v['debit_amt']:>14,.2f}")

    print()
    td = cat_summary.get("transfer", {})
    t_cr = td.get("credit_count", 0)
    t_dr = td.get("debit_count", 0)
    t_cr_amt = td.get("credit_amt", 0.0)
    t_dr_amt = td.get("debit_amt", 0.0)
    print("--- Transfers ---")
    print(f"  Credits (incoming):   {t_cr:4d} txns  Rs {t_cr_amt:>14,.2f}")
    print(f"  Debits (outgoing):    {t_dr:4d} txns  Rs {t_dr_amt:>14,.2f}")
    print(f"  Total:                {t_cr + t_dr:4d} txns  Rs {t_cr_amt + t_dr_amt:>14,.2f}")

    print()
    uc = cat_summary.get("uncategorized", {})
    print("--- Uncategorized ---")
    print(f"  Credits:   {uc.get('credit_count', 0):4d} txns  Rs {uc.get('credit_amt', 0.0):>14,.2f}")
    print(f"  Debits:    {uc.get('debit_count', 0):4d} txns  Rs {uc.get('debit_amt', 0.0):>14,.2f}")

    conn.close()


if __name__ == "__main__":
    main()

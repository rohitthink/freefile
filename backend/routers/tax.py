from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from backend.db.database import get_db
from backend.tax.engine import compute_itr4, compute_itr3, compare_regimes
from backend.tax.advance_tax import compute_advance_tax_schedule
from backend.reports.itr_summary import generate_itr_summary_pdf

router = APIRouter()


@router.get("/tax/compute")
async def compute_tax(fy: str = Query("2025-26")):
    """Compute tax based on current transactions and settings."""
    db = await get_db()
    try:
        # Get FY settings
        cursor = await db.execute("SELECT regime, itr_form FROM financial_years WHERE fy = ?", (fy,))
        fy_row = await cursor.fetchone()
        if not fy_row:
            raise HTTPException(404, f"Financial year {fy} not configured")

        regime = fy_row[0]
        itr_form = fy_row[1]

        # Get income totals from transactions
        cursor = await db.execute(
            """SELECT category, SUM(amount) FROM transactions
            WHERE fy = ? AND tx_type = 'credit'
            GROUP BY category""",
            (fy,),
        )
        income_rows = await cursor.fetchall()

        professional_income = 0.0
        other_income = {"interest": 0.0, "rental": 0.0, "dividend": 0.0, "other": 0.0}

        for row in income_rows:
            cat = row[0]
            total = row[1] or 0.0
            if cat == "professional_income":
                professional_income += total
            elif cat == "interest_income":
                other_income["interest"] += total
            elif cat == "rental_income":
                other_income["rental"] += total
            elif cat == "dividend_income":
                other_income["dividend"] += total
            elif cat in ("other_income",):
                other_income["other"] += total

        # Get business expenses (for ITR-3)
        business_expenses = 0.0
        if itr_form == "ITR-3":
            cursor = await db.execute(
                """SELECT SUM(amount) FROM transactions
                WHERE fy = ? AND tx_type = 'debit' AND category NOT IN
                ('personal', 'investment', 'tax_payment', 'gst_payment', 'transfer', 'uncategorized')""",
                (fy,),
            )
            row = await cursor.fetchone()
            business_expenses = row[0] or 0.0

        # Get deductions
        cursor = await db.execute("SELECT section, amount, description FROM deductions WHERE fy = ?", (fy,))
        deduction_rows = await cursor.fetchall()
        deductions_list = [{"section": r[0], "amount": r[1], "description": r[2]} for r in deduction_rows]

        # Get TDS credit
        cursor = await db.execute("SELECT SUM(tds_deposited) FROM tds_entries WHERE fy = ?", (fy,))
        tds_row = await cursor.fetchone()
        tds_credit = tds_row[0] or 0.0

        # Get advance tax paid
        cursor = await db.execute(
            """SELECT SUM(amount) FROM transactions
            WHERE fy = ? AND category = 'tax_payment' AND tx_type = 'debit'""",
            (fy,),
        )
        adv_row = await cursor.fetchone()
        advance_tax_paid = adv_row[0] or 0.0

        if itr_form == "ITR-4":
            result = compute_itr4(professional_income, other_income, deductions_list, tds_credit, advance_tax_paid, regime)
        else:
            result = compute_itr3(professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, regime)

        return result

    finally:
        await db.close()


@router.get("/tax/compare")
async def compare_tax_regimes(fy: str = Query("2025-26")):
    """Compare old vs new tax regime."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT itr_form FROM financial_years WHERE fy = ?", (fy,))
        fy_row = await cursor.fetchone()
        itr_form = fy_row[0] if fy_row else "ITR-4"

        # Gather same data as compute_tax
        cursor = await db.execute(
            "SELECT category, SUM(amount) FROM transactions WHERE fy = ? AND tx_type = 'credit' GROUP BY category",
            (fy,),
        )
        income_rows = await cursor.fetchall()

        professional_income = 0.0
        other_income = {"interest": 0.0, "rental": 0.0, "dividend": 0.0, "other": 0.0}
        for row in income_rows:
            cat = row[0]
            total = row[1] or 0.0
            if cat == "professional_income":
                professional_income += total
            elif cat == "interest_income":
                other_income["interest"] += total
            elif cat == "rental_income":
                other_income["rental"] += total
            elif cat == "dividend_income":
                other_income["dividend"] += total
            elif cat == "other_income":
                other_income["other"] += total

        business_expenses = 0.0
        if itr_form == "ITR-3":
            cursor = await db.execute(
                """SELECT SUM(amount) FROM transactions WHERE fy = ? AND tx_type = 'debit'
                AND category NOT IN ('personal', 'investment', 'tax_payment', 'gst_payment', 'transfer', 'uncategorized')""",
                (fy,),
            )
            row = await cursor.fetchone()
            business_expenses = row[0] or 0.0

        cursor = await db.execute("SELECT section, amount, description FROM deductions WHERE fy = ?", (fy,))
        deductions_list = [{"section": r[0], "amount": r[1], "description": r[2]} for r in await cursor.fetchall()]

        cursor = await db.execute("SELECT SUM(tds_deposited) FROM tds_entries WHERE fy = ?", (fy,))
        tds_credit = (await cursor.fetchone())[0] or 0.0

        cursor = await db.execute(
            "SELECT SUM(amount) FROM transactions WHERE fy = ? AND category = 'tax_payment' AND tx_type = 'debit'",
            (fy,),
        )
        advance_tax_paid = (await cursor.fetchone())[0] or 0.0

        result = compare_regimes(professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, itr_form)
        return result

    finally:
        await db.close()


@router.get("/tax/advance-schedule")
async def get_advance_tax_schedule(fy: str = Query("2025-26")):
    """Get advance tax installment schedule."""
    tax_result = await compute_tax(fy)
    total_tax = tax_result.get("total_tax", 0.0)
    tds_credit = tax_result.get("tds_credit", 0.0)

    schedule = compute_advance_tax_schedule(total_tax, tds_credit)
    return {"schedule": schedule, "total_tax": total_tax, "tds_credit": tds_credit}


@router.post("/tax/deductions")
async def save_deduction(deduction: dict):
    """Save a deduction entry."""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO deductions (fy, section, description, amount) VALUES (?, ?, ?, ?)",
            (deduction["fy"], deduction["section"], deduction.get("description", ""), deduction["amount"]),
        )
        await db.commit()
        return {"status": "saved"}
    finally:
        await db.close()


@router.get("/tax/deductions")
async def list_deductions(fy: str = Query("2025-26")):
    """List all deductions for a FY."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id, fy, section, description, amount FROM deductions WHERE fy = ?", (fy,))
        rows = await cursor.fetchall()
        return {"deductions": [dict(row) for row in rows]}
    finally:
        await db.close()


@router.delete("/tax/deductions/{deduction_id}")
async def delete_deduction(deduction_id: int):
    """Delete a deduction."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM deductions WHERE id = ?", (deduction_id,))
        await db.commit()
        return {"status": "deleted"}
    finally:
        await db.close()


@router.post("/tax/tds")
async def save_tds_entry(entry: dict):
    """Save a TDS entry."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO tds_entries (fy, deductor_name, deductor_tan, amount_paid, tds_deducted, tds_deposited, section)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (entry["fy"], entry.get("deductor_name"), entry.get("deductor_tan"),
             entry.get("amount_paid"), entry.get("tds_deducted"), entry.get("tds_deposited"), entry.get("section")),
        )
        await db.commit()
        return {"status": "saved"}
    finally:
        await db.close()


@router.get("/tax/tds")
async def list_tds(fy: str = Query("2025-26")):
    """List TDS entries."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM tds_entries WHERE fy = ?", (fy,))
        rows = await cursor.fetchall()
        return {"tds_entries": [dict(row) for row in rows]}
    finally:
        await db.close()


@router.delete("/tax/tds/{tds_id}")
async def delete_tds_entry(tds_id: int):
    """Delete a TDS entry."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM tds_entries WHERE id = ?", (tds_id,))
        await db.commit()
        return {"status": "deleted"}
    finally:
        await db.close()


@router.get("/export")
async def export_data(fy: str = Query("2025-26")):
    """Export all data for a FY as JSON backup."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM transactions WHERE fy = ?", (fy,))
        transactions = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute("SELECT * FROM deductions WHERE fy = ?", (fy,))
        deductions = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute("SELECT * FROM tds_entries WHERE fy = ?", (fy,))
        tds_entries = [dict(r) for r in await cursor.fetchall()]

        cursor = await db.execute("SELECT * FROM financial_years WHERE fy = ?", (fy,))
        settings = dict(await cursor.fetchone()) if (await db.execute("SELECT * FROM financial_years WHERE fy = ?", (fy,))) else {}
        # Re-fetch since cursor was consumed
        cursor = await db.execute("SELECT * FROM financial_years WHERE fy = ?", (fy,))
        row = await cursor.fetchone()
        settings = dict(row) if row else {}

        cursor = await db.execute("SELECT * FROM category_overrides")
        overrides = [dict(r) for r in await cursor.fetchall()]

        return {
            "export_version": "1.0",
            "fy": fy,
            "settings": settings,
            "transactions": transactions,
            "deductions": deductions,
            "tds_entries": tds_entries,
            "category_overrides": overrides,
        }
    finally:
        await db.close()


@router.put("/settings/fy")
async def update_fy_settings(settings: dict):
    """Update FY settings (regime, ITR form)."""
    db = await get_db()
    try:
        fy = settings.get("fy", "2025-26")
        regime = settings.get("regime", "new")
        itr_form = settings.get("itr_form", "ITR-4")
        await db.execute(
            "INSERT OR REPLACE INTO financial_years (fy, regime, itr_form) VALUES (?, ?, ?)",
            (fy, regime, itr_form),
        )
        await db.commit()
        return {"status": "saved"}
    finally:
        await db.close()


@router.get("/settings/fy")
async def get_fy_settings(fy: str = Query("2025-26")):
    """Get FY settings."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT fy, regime, itr_form FROM financial_years WHERE fy = ?", (fy,))
        row = await cursor.fetchone()
        if row:
            return dict(row)
        return {"fy": fy, "regime": "new", "itr_form": "ITR-4"}
    finally:
        await db.close()


@router.get("/report/pdf")
async def generate_pdf_report(fy: str = Query("2025-26")):
    """Generate and download ITR summary PDF report."""
    # Gather all data
    tax_result = await compute_tax(fy)
    comparison_result = await compare_tax_regimes(fy)

    db = await get_db()
    try:
        # Profile
        cursor = await db.execute("SELECT * FROM profile WHERE id = 1")
        profile_row = await cursor.fetchone()
        profile_data = dict(profile_row) if profile_row else {}

        # Income summary
        cursor = await db.execute(
            """SELECT category, tx_type, COUNT(*) as count, SUM(amount) as total
            FROM transactions WHERE fy = ? GROUP BY category, tx_type""",
            (fy,),
        )
        rows = await cursor.fetchall()
        income_by_cat = {}
        total_income = 0.0
        total_expenses = 0.0
        for row in rows:
            cat, tx_type, count, total = row[0], row[1], row[2], row[3] or 0.0
            if tx_type == "credit":
                income_by_cat[cat] = {"count": count, "total": total}
                total_income += total
            else:
                total_expenses += total

        income_summary = {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "income_by_category": income_by_cat,
        }

        # Deductions
        cursor = await db.execute("SELECT section, description, amount FROM deductions WHERE fy = ?", (fy,))
        deductions = [dict(r) for r in await cursor.fetchall()]

        # TDS
        cursor = await db.execute("SELECT * FROM tds_entries WHERE fy = ?", (fy,))
        tds_entries = [dict(r) for r in await cursor.fetchall()]

    finally:
        await db.close()

    pdf_bytes = generate_itr_summary_pdf(
        profile=profile_data,
        tax_result=tax_result,
        comparison=comparison_result,
        income_summary=income_summary,
        deductions=deductions,
        tds_entries=tds_entries,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ITR_Summary_FY{fy}.pdf"},
    )

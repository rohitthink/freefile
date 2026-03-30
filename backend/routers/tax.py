from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from backend.db.database import get_db
from backend.tax.engine import compute_itr4, compute_itr3, compare_regimes
from backend.tax.advance_tax import compute_advance_tax_schedule
from backend.tax.capital_gains import compute_capital_gains
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

        # --- Capital gains integration ---
        cursor = await db.execute(
            "SELECT gain_loss, gain_type, scrip_name FROM capital_gains WHERE fy = ?",
            (fy,),
        )
        cg_rows = await cursor.fetchall()
        cg_entries = [{"gain_loss": r[0], "gain_type": r[1], "scrip_name": r[2]} for r in cg_rows]

        # Carry-forward losses
        cursor = await db.execute(
            "SELECT loss_type, remaining_amount, fy_of_loss, expires_fy FROM carry_forward_losses WHERE remaining_amount > 0"
        )
        cf_rows = await cursor.fetchall()
        cf_losses = [
            {"loss_type": r[0], "remaining_amount": r[1], "fy_of_loss": r[2], "expires_fy": r[3]}
            for r in cf_rows
        ]

        cg_result = None
        if cg_entries:
            cg_result = compute_capital_gains(cg_entries, cf_losses if cf_losses else None)
            # Add slab-rate CG income (speculative, F&O, STCG_slab) to other income
            other_income["other"] += cg_result.get("income_at_slab_rate", 0.0)

        # Dividends from trading
        cursor = await db.execute("SELECT SUM(amount) FROM dividends WHERE fy = ?", (fy,))
        div_row = await cursor.fetchone()
        dividend_income = div_row[0] or 0.0
        other_income["dividend"] += dividend_income

        if itr_form == "ITR-4":
            result = compute_itr4(professional_income, other_income, deductions_list, tds_credit, advance_tax_paid, regime)
        else:
            result = compute_itr3(professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, regime)

        # Merge capital gains tax into result
        if cg_result:
            result["capital_gains"] = cg_result
            result["total_tax"] = round(result["total_tax"] + cg_result["total_cg_tax_with_cess"], 2)
            net_tax = round(result["total_tax"] - tds_credit - advance_tax_paid, 2)
            result["tax_payable"] = max(net_tax, 0.0)
            result["tax_refund"] = abs(min(net_tax, 0.0))

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


@router.get("/tax/capital-gains")
async def get_capital_gains(fy: str = Query("2025-26")):
    """Compute capital gains summary from imported trading data."""
    db = await get_db()
    try:
        # Get all capital gains entries
        cursor = await db.execute(
            """SELECT id, source, scrip_name, isin, asset_type, buy_date, sell_date,
                      quantity, buy_value, sell_value, expenses, gain_loss, gain_type,
                      holding_period_days, source_file
            FROM capital_gains WHERE fy = ?""",
            (fy,),
        )
        rows = await cursor.fetchall()
        entries = [
            {
                "id": r[0], "source": r[1], "scrip_name": r[2], "isin": r[3],
                "asset_type": r[4], "buy_date": r[5], "sell_date": r[6],
                "quantity": r[7], "buy_value": r[8], "sell_value": r[9],
                "expenses": r[10], "gain_loss": r[11], "gain_type": r[12],
                "holding_period_days": r[13], "source_file": r[14],
            }
            for r in rows
        ]

        # Get carry-forward losses
        cursor = await db.execute(
            "SELECT loss_type, remaining_amount, fy_of_loss, expires_fy FROM carry_forward_losses WHERE remaining_amount > 0"
        )
        cf_rows = await cursor.fetchall()
        cf_losses = [
            {"loss_type": r[0], "remaining_amount": r[1], "fy_of_loss": r[2], "expires_fy": r[3]}
            for r in cf_rows
        ]

        # Get dividends
        cursor = await db.execute(
            "SELECT source, scrip_name, ex_date, amount, tds FROM dividends WHERE fy = ?",
            (fy,),
        )
        div_rows = await cursor.fetchall()
        dividends = [
            {"source": r[0], "scrip_name": r[1], "ex_date": r[2], "amount": r[3], "tds": r[4]}
            for r in div_rows
        ]
        total_dividends = sum(d["amount"] or 0 for d in dividends)
        total_dividend_tds = sum(d["tds"] or 0 for d in dividends)

        # Compute capital gains
        if entries:
            cg_summary = compute_capital_gains(entries, cf_losses if cf_losses else None)
        else:
            cg_summary = {
                "stcg_111a": 0, "ltcg_112a": 0, "ltcg_112": 0,
                "speculative": 0, "fno_business": 0,
                "total_cg_tax": 0, "total_cg_tax_with_cess": 0,
                "losses_to_carry": [], "income_at_slab_rate": 0,
            }

        return {
            "fy": fy,
            "total_trades": len(entries),
            "capital_gains": cg_summary,
            "dividends": {
                "total_amount": round(total_dividends, 2),
                "total_tds": round(total_dividend_tds, 2),
                "entries": dividends,
            },
            "trades": entries,
            "carry_forward_losses": cf_losses,
        }

    finally:
        await db.close()

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from backend.parsers.detector import detect_parser
from backend.categorizer.rules import categorize_transaction
from backend.db.database import get_db

router = APIRouter()


@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    fy: str = Form("2025-26"),
    bank_hint: Optional[str] = Form(None),
):
    """Upload a bank statement (PDF, CSV, XLSX, or XLS) and parse transactions."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".csv", ".tsv", ".xlsx", ".xls"):
        raise HTTPException(400, "Only PDF, CSV, TSV, XLSX, and XLS files are supported")

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parser = detect_parser(tmp_path, password)
        raw_transactions = parser.parse(tmp_path, password)

        if not raw_transactions:
            raise HTTPException(422, "Could not parse any transactions from the file. Try a different format or check if the PDF is password-protected.")

        # Load category overrides
        db = await get_db()
        try:
            cursor = await db.execute("SELECT narration_pattern, category FROM category_overrides")
            rows = await cursor.fetchall()
            overrides = {row[0]: row[1] for row in rows}
        finally:
            await db.close()

        # Convert to dicts and categorize
        transactions = []
        for raw in raw_transactions:
            category = categorize_transaction(
                narration=raw.narration,
                amount=raw.amount,
                tx_type=raw.tx_type,
                overrides=overrides,
            )
            transactions.append({
                "fy": fy,
                "date": raw.date.isoformat(),
                "narration": raw.narration,
                "amount": raw.amount,
                "tx_type": raw.tx_type,
                "balance": raw.balance,
                "reference": raw.reference,
                "category": category,
                "category_confirmed": False,
                "source_file": file.filename,
            })

        # Save to database, skip duplicates
        db = await get_db()
        inserted = 0
        skipped = 0
        try:
            for tx in transactions:
                # Check for duplicate (same date + amount + narration)
                cursor = await db.execute(
                    "SELECT id FROM transactions WHERE fy=? AND date=? AND amount=? AND narration=?",
                    (tx["fy"], tx["date"], tx["amount"], tx["narration"]),
                )
                existing = await cursor.fetchone()
                if existing:
                    skipped += 1
                    continue

                await db.execute(
                    """INSERT INTO transactions (fy, date, narration, amount, tx_type, balance, reference, category, category_confirmed, source_file)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (tx["fy"], tx["date"], tx["narration"], tx["amount"], tx["tx_type"],
                     tx["balance"], tx["reference"], tx["category"], 0, tx["source_file"]),
                )
                inserted += 1

            await db.commit()
        finally:
            await db.close()

        return {
            "bank_name": parser.bank_name,
            "transactions_count": inserted,
            "duplicates_skipped": skipped,
            "transactions": transactions,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error parsing file: {str(e)}")
    finally:
        os.unlink(tmp_path)


@router.post("/upload/26as")
async def upload_26as(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    fy: str = Form("2025-26"),
):
    """Upload Form 26AS PDF and import TDS entries."""
    from backend.parsers.form26as import parse_form_26as

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted for Form 26AS")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = parse_form_26as(tmp_path, password)

        if result.get("error"):
            raise HTTPException(422, result["error"])

        # Save TDS entries to database
        db = await get_db()
        imported = 0
        try:
            for entry in result.get("tds_entries", []):
                # Skip duplicates by TAN + amount
                cursor = await db.execute(
                    "SELECT id FROM tds_entries WHERE fy=? AND deductor_tan=? AND tds_deposited=?",
                    (fy, entry["deductor_tan"], entry["tds_deposited"]),
                )
                if await cursor.fetchone():
                    continue

                await db.execute(
                    """INSERT INTO tds_entries (fy, deductor_name, deductor_tan, amount_paid, tds_deducted, tds_deposited, section)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (fy, entry["deductor_name"], entry["deductor_tan"],
                     entry["amount_paid"], entry["tds_deducted"], entry["tds_deposited"], entry["section"]),
                )
                imported += 1

            await db.commit()
        finally:
            await db.close()

        return {
            "tds_imported": imported,
            "total_tds": result.get("total_tds", 0),
            "tax_payments_found": len(result.get("tax_payments", [])),
            "total_advance_tax": result.get("total_advance_tax", 0),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error parsing 26AS: {str(e)}")
    finally:
        os.unlink(tmp_path)


@router.post("/upload/trading")
async def upload_trading_report(
    file: UploadFile = File(...),
    source: str = Form(...),
    fy: str = Form("2025-26"),
):
    """Upload a trading report (Zerodha, Groww MF, INDmoney) and parse capital gains."""
    valid_sources = ("zerodha", "groww_mf", "indmoney")
    if source not in valid_sources:
        raise HTTPException(400, f"Invalid source. Must be one of: {', '.join(valid_sources)}")

    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".xlsx", ".xls"):
        raise HTTPException(400, "Only XLSX/XLS files are supported for trading reports")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        trades = []
        dividends = []
        summary = {}

        if source == "zerodha":
            from backend.parsers.zerodha import parse_zerodha_pnl
            result = parse_zerodha_pnl(tmp_path)
            trades = [
                {
                    "source": "zerodha", "scrip_name": t.scrip_name, "isin": t.isin,
                    "asset_type": t.asset_type, "buy_date": t.buy_date,
                    "sell_date": t.sell_date, "quantity": t.quantity,
                    "buy_value": t.buy_value, "sell_value": t.sell_value,
                    "expenses": t.expenses, "gain_loss": t.gain_loss,
                    "gain_type": t.gain_type, "holding_period_days": t.holding_period_days,
                }
                for t in result.trades
            ]
            dividends = [
                {
                    "source": "zerodha", "scrip_name": d.scrip_name, "isin": d.isin,
                    "ex_date": d.ex_date, "amount": d.amount, "tds": d.tds,
                }
                for d in result.dividends
            ]
            summary = result.summary

        elif source == "groww_mf":
            from backend.parsers.groww_mf import parse_groww_mf
            result = parse_groww_mf(tmp_path)
            trades = [
                {
                    "source": "groww_mf", "scrip_name": t.scrip_name, "isin": t.isin,
                    "asset_type": t.asset_type, "buy_date": t.buy_date,
                    "sell_date": t.sell_date, "quantity": t.quantity,
                    "buy_value": t.buy_value, "sell_value": t.sell_value,
                    "expenses": t.expenses, "gain_loss": t.gain_loss,
                    "gain_type": t.gain_type, "holding_period_days": t.holding_period_days,
                }
                for t in result.trades
            ]
            summary = result.summary

        elif source == "indmoney":
            from backend.parsers.indmoney import parse_indmoney_us
            result = parse_indmoney_us(tmp_path)
            trades = [
                {
                    "source": "indmoney", "scrip_name": t.scrip_name, "isin": t.isin,
                    "asset_type": t.asset_type, "buy_date": t.buy_date,
                    "sell_date": t.sell_date, "quantity": t.quantity,
                    "buy_value": t.buy_value, "sell_value": t.sell_value,
                    "expenses": t.expenses, "gain_loss": t.gain_loss,
                    "gain_type": t.gain_type, "holding_period_days": t.holding_period_days,
                }
                for t in result.trades
            ]
            dividends = [
                {
                    "source": "indmoney", "scrip_name": d.scrip_name,
                    "ex_date": d.date, "amount": d.amount_inr, "tds": d.tds_inr,
                }
                for d in result.dividends
            ]
            summary = result.summary

        if not trades and not dividends:
            raise HTTPException(422, "Could not parse any trades or dividends from the file.")

        # Save to database
        db = await get_db()
        trades_inserted = 0
        dividends_inserted = 0
        trades_skipped = 0
        try:
            for t in trades:
                # Skip duplicates (same source + scrip + buy_date + sell_date + amount)
                cursor = await db.execute(
                    """SELECT id FROM capital_gains
                    WHERE fy=? AND source=? AND scrip_name=? AND buy_date=? AND sell_date=? AND gain_loss=?""",
                    (fy, t["source"], t["scrip_name"], t["buy_date"], t["sell_date"], t["gain_loss"]),
                )
                if await cursor.fetchone():
                    trades_skipped += 1
                    continue

                await db.execute(
                    """INSERT INTO capital_gains
                    (fy, source, scrip_name, isin, asset_type, buy_date, sell_date, quantity,
                     buy_value, sell_value, expenses, gain_loss, gain_type, holding_period_days, source_file)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (fy, t["source"], t["scrip_name"], t["isin"], t["asset_type"],
                     t["buy_date"], t["sell_date"], t["quantity"], t["buy_value"],
                     t["sell_value"], t["expenses"], t["gain_loss"], t["gain_type"],
                     t["holding_period_days"], file.filename),
                )
                trades_inserted += 1

            for d in dividends:
                cursor = await db.execute(
                    """SELECT id FROM dividends
                    WHERE fy=? AND source=? AND scrip_name=? AND amount=?""",
                    (fy, d["source"], d["scrip_name"], d["amount"]),
                )
                if await cursor.fetchone():
                    continue

                await db.execute(
                    """INSERT INTO dividends (fy, source, scrip_name, ex_date, amount, tds)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (fy, d["source"], d["scrip_name"], d.get("ex_date"), d["amount"], d.get("tds", 0)),
                )
                dividends_inserted += 1

            await db.commit()
        finally:
            await db.close()

        return {
            "source": source,
            "trades_imported": trades_inserted,
            "trades_skipped": trades_skipped,
            "dividends_imported": dividends_inserted,
            "summary": summary,
            "trades": trades,
            "dividends": dividends,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error parsing trading report: {str(e)}")
    finally:
        os.unlink(tmp_path)

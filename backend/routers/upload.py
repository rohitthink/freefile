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
    """Upload a bank statement (PDF or CSV) and parse transactions."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".csv", ".tsv"):
        raise HTTPException(400, "Only PDF, CSV, and TSV files are supported")

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

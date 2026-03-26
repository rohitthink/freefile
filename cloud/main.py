"""FreeFile Cloud -- PDF parsing service.

Minimal FastAPI app that handles PDF parsing (bank statements + Form 26AS).
No database, no tax computation, no filing. Returns parsed data as JSON.
"""
import os
import sys
import tempfile

# Allow importing from backend/ when running as cloud/main.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from backend.parsers.detector import detect_parser
from backend.parsers.form26as import parse_form_26as
from backend.categorizer.rules import categorize_transaction

app = FastAPI(title="FreeFile Cloud", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("FREEFILE_API_KEY", "dev-key-change-me")


async def verify_api_key(x_api_key: str = Header(default="")):
    if x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    fy: str = Form("2025-26"),
):
    """Upload a bank statement (PDF or CSV) and return parsed transactions as JSON."""
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
            raise HTTPException(
                422,
                "Could not parse any transactions from the file. "
                "Try a different format or check if the PDF is password-protected.",
            )

        # Convert to dicts and categorize (no DB overrides in cloud mode)
        transactions = []
        for raw in raw_transactions:
            category = categorize_transaction(
                narration=raw.narration,
                amount=raw.amount,
                tx_type=raw.tx_type,
            )
            transactions.append({
                "date": raw.date.isoformat(),
                "narration": raw.narration,
                "amount": raw.amount,
                "tx_type": raw.tx_type,
                "balance": raw.balance,
                "reference": raw.reference,
                "category": category,
            })

        return {
            "bank_name": parser.bank_name,
            "transactions": transactions,
            "transactions_count": len(transactions),
            "duplicates_skipped": 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error parsing file: {str(e)}")
    finally:
        os.unlink(tmp_path)


@app.post("/api/upload/26as")
async def upload_26as(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    fy: str = Form("2025-26"),
):
    """Upload Form 26AS PDF and return TDS entries as JSON."""
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

        return {
            "tds_entries": result.get("tds_entries", []),
            "tds_imported": len(result.get("tds_entries", [])),
            "total_tds": result.get("total_tds", 0),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error parsing 26AS: {str(e)}")
    finally:
        os.unlink(tmp_path)

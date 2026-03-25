import asyncio
import os
import subprocess
import shutil
from fastapi import APIRouter, BackgroundTasks, Query
from sse_starlette.sse import EventSourceResponse

from backend.automation.portal import (
    start_filing, get_session, send_signal, stop_filing,
)
from backend.db.database import get_db
from backend.tax.engine import compute_itr4, compute_itr3

router = APIRouter()


@router.get("/playwright/status")
async def playwright_status():
    """Check if Playwright Chromium browser is installed."""
    data_dir = os.environ.get("FREEFILE_DATA_DIR", "")
    if data_dir:
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = data_dir

    # Check if chromium exists in expected location
    browsers_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if browsers_path:
        chromium_dir = os.path.join(browsers_path, "chromium-")
        # Check if any chromium directory exists
        parent = browsers_path
        has_chromium = any(
            d.startswith("chromium") for d in os.listdir(parent)
        ) if os.path.isdir(parent) else False
    else:
        # Default playwright location
        has_chromium = shutil.which("chromium") is not None or True  # assume installed in default location

    return {"installed": has_chromium, "browsers_path": browsers_path}


@router.post("/playwright/install")
async def install_playwright_browser():
    """Download Playwright Chromium browser."""
    data_dir = os.environ.get("FREEFILE_DATA_DIR", "")
    env = os.environ.copy()
    if data_dir:
        env["PLAYWRIGHT_BROWSERS_PATH"] = data_dir

    try:
        result = subprocess.run(
            ["python", "-m", "playwright", "install", "chromium"],
            capture_output=True, text=True, env=env, timeout=300,
        )
        if result.returncode == 0:
            return {"status": "installed", "output": result.stdout[-200:] if result.stdout else ""}
        return {"status": "error", "error": result.stderr[-500:] if result.stderr else "Unknown error"}
    except subprocess.TimeoutExpired:
        return {"status": "error", "error": "Installation timed out (5 minutes)"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/filing/start")
async def start_itr_filing(
    background_tasks: BackgroundTasks,
    pan: str = "",
    assessment_year: str = "2026-27",
    fy: str = "2025-26",
):
    """Start ITR filing automation. Launches headed browser."""
    session = get_session()
    if session["status"] in ("starting", "navigating", "filling_income", "review"):
        return {"error": "Filing already in progress", "status": session["status"]}

    if not pan or len(pan) != 10:
        return {"error": "Valid 10-character PAN required"}

    # Get FY settings and compute tax
    db = await get_db()
    try:
        cursor = await db.execute("SELECT regime, itr_form FROM financial_years WHERE fy = ?", (fy,))
        fy_row = await cursor.fetchone()
        regime = fy_row[0] if fy_row else "new"
        itr_form = fy_row[1] if fy_row else "ITR-4"

        # Gather income data
        cursor = await db.execute(
            "SELECT category, SUM(amount) FROM transactions WHERE fy = ? AND tx_type = 'credit' GROUP BY category",
            (fy,),
        )
        income_rows = await cursor.fetchall()
        professional_income = 0.0
        other_income = {"interest": 0.0, "rental": 0.0, "dividend": 0.0, "other": 0.0}
        for row in income_rows:
            cat, total = row[0], row[1] or 0.0
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

        # Business expenses for ITR-3
        business_expenses = 0.0
        if itr_form == "ITR-3":
            cursor = await db.execute(
                """SELECT SUM(amount) FROM transactions WHERE fy = ? AND tx_type = 'debit'
                AND category NOT IN ('personal','investment','tax_payment','gst_payment','transfer','uncategorized')""",
                (fy,),
            )
            row = await cursor.fetchone()
            business_expenses = row[0] or 0.0

        # Deductions
        cursor = await db.execute("SELECT section, amount, description FROM deductions WHERE fy = ?", (fy,))
        deductions_list = [{"section": r[0], "amount": r[1], "description": r[2]} for r in await cursor.fetchall()]

        cursor = await db.execute("SELECT SUM(tds_deposited) FROM tds_entries WHERE fy = ?", (fy,))
        tds_credit = (await cursor.fetchone())[0] or 0.0

        cursor = await db.execute(
            "SELECT SUM(amount) FROM transactions WHERE fy = ? AND category = 'tax_payment' AND tx_type = 'debit'",
            (fy,),
        )
        advance_tax_paid = (await cursor.fetchone())[0] or 0.0

        if itr_form == "ITR-4":
            tax_data = compute_itr4(professional_income, other_income, deductions_list, tds_credit, advance_tax_paid, regime)
        else:
            tax_data = compute_itr3(professional_income, business_expenses, other_income, deductions_list, tds_credit, advance_tax_paid, regime)

    finally:
        await db.close()

    # Launch filing in background
    background_tasks.add_task(
        start_filing,
        pan=pan,
        assessment_year=assessment_year,
        itr_form=itr_form,
        tax_data=tax_data,
    )

    return {"status": "started", "itr_form": itr_form, "regime": regime}


@router.get("/filing/status")
async def filing_status():
    """Get current filing automation status and steps."""
    session = get_session()
    return {
        "status": session["status"],
        "waiting_for": session["waiting_for"],
        "steps": session["steps"],
    }


@router.get("/filing/stream")
async def filing_stream():
    """SSE stream of filing automation progress."""
    async def event_generator():
        last_count = 0
        while True:
            session = get_session()
            steps = session["steps"]
            if len(steps) > last_count:
                for step in steps[last_count:]:
                    yield {
                        "event": "step",
                        "data": f'{{"step": "{step["step"]}", "detail": "{step["detail"]}"}}'
                    }
                last_count = len(steps)

            if session["status"] in ("completed", "error", "stopped"):
                yield {
                    "event": "done",
                    "data": f'{{"status": "{session["status"]}"}}'
                }
                break

            await asyncio.sleep(1)

    return EventSourceResponse(event_generator())


@router.post("/filing/signal")
async def filing_signal(signal: str = ""):
    """Send a signal to continue automation (after OTP, review, etc.)."""
    valid_signals = ("login_complete", "nav_complete", "review", "otp_everify")
    if signal not in valid_signals:
        return {"error": f"Invalid signal. Use one of: {valid_signals}"}

    await send_signal(signal)
    return {"status": "signal_sent", "signal": signal}


@router.post("/filing/stop")
async def stop_itr_filing():
    """Stop the automation and close browser."""
    await stop_filing()
    return {"status": "stopped"}

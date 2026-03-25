"""Playwright automation for incometax.gov.in ITR filing portal."""

import asyncio
from typing import Callable, Optional
from playwright.async_api import async_playwright, Page, Browser

PORTAL_URL = "https://eportal.incometax.gov.in/iec/foservices/#/login"

# Shared state for the automation session
_session: dict = {
    "browser": None,
    "page": None,
    "status": "idle",
    "steps": [],
    "waiting_for": None,  # "otp_login", "otp_everify", "review", None
}


def get_session() -> dict:
    return _session


async def emit_step(step: str, detail: str = ""):
    """Record a step in the automation progress."""
    _session["steps"].append({"step": step, "detail": detail})
    _session["status"] = step


async def start_filing(
    pan: str,
    assessment_year: str,
    itr_form: str,
    tax_data: dict,
) -> None:
    """
    Launch headed Chromium, navigate to ITR portal, begin filing.
    This runs as a background task. Frontend polls /filing/status for updates.
    """
    import os
    browsers_path = os.environ.get("FREEFILE_DATA_DIR")
    if browsers_path:
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = browsers_path

    _session["steps"] = []
    _session["status"] = "starting"
    _session["waiting_for"] = None

    try:
        await emit_step("launching_browser", "Opening Chrome browser...")

        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=False,
            args=["--start-maximized"],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            no_viewport=True,
        )
        page = await context.new_page()

        _session["browser"] = browser
        _session["page"] = page

        # Step 1: Navigate to portal
        await emit_step("navigating", "Opening income tax portal...")
        await page.goto(PORTAL_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Step 2: Enter PAN
        await emit_step("entering_pan", f"Entering PAN: {pan[:4]}****{pan[-1]}")
        try:
            # The portal login page has a PAN input field
            pan_input = page.locator('input[id="panAdhaarUserId"]').first
            if not await pan_input.is_visible():
                pan_input = page.locator('input[placeholder*="PAN"]').first
            if not await pan_input.is_visible():
                pan_input = page.get_by_placeholder("Enter PAN").first

            await pan_input.fill(pan)
            await asyncio.sleep(1)

            # Click Continue
            continue_btn = page.locator('button:has-text("Continue")').first
            await continue_btn.click()
            await asyncio.sleep(2)
        except Exception as e:
            await emit_step("pan_entry_fallback", f"Auto-fill PAN field not found ({e}). Please enter PAN manually in the browser.")

        # Step 3: Wait for user to enter password + OTP
        await emit_step("waiting_for_login", "Please enter your password and complete OTP verification in the browser.")
        _session["waiting_for"] = "otp_login"

        # The automation pauses here. Frontend shows "enter password + OTP" message.
        # User calls /filing/signal with signal="login_complete" when done.
        while _session["waiting_for"] == "otp_login":
            await asyncio.sleep(1)

        # Step 4: Navigate to e-File section
        await emit_step("navigating_efile", "Navigating to e-File > Income Tax Returns...")
        await asyncio.sleep(2)

        try:
            # Try to navigate to the ITR filing page
            await page.goto(
                "https://eportal.incometax.gov.in/iec/foservices/#/pre-login/itr-online-filing",
                wait_until="networkidle",
                timeout=15000,
            )
        except Exception:
            # Fallback: try clicking through menu
            try:
                efile_menu = page.locator('text=e-File').first
                await efile_menu.click()
                await asyncio.sleep(1)
                itr_link = page.locator('text=Income Tax Returns').first
                await itr_link.click()
                await asyncio.sleep(1)
                file_link = page.locator('text=File Income Tax Return').first
                await file_link.click()
                await asyncio.sleep(2)
            except Exception as nav_err:
                await emit_step("nav_fallback", f"Could not auto-navigate. Please navigate to e-File > Income Tax Returns > File ITR manually. ({nav_err})")
                _session["waiting_for"] = "nav_complete"
                while _session["waiting_for"] == "nav_complete":
                    await asyncio.sleep(1)

        # Step 5: Select AY and ITR form
        await emit_step("selecting_form", f"Selecting AY {assessment_year}, {itr_form}...")
        await asyncio.sleep(2)

        try:
            # Select Assessment Year
            ay_dropdown = page.locator('select, [role="listbox"]').first
            if await ay_dropdown.is_visible():
                await ay_dropdown.select_option(label=assessment_year)
                await asyncio.sleep(1)
        except Exception:
            await emit_step("ay_manual", f"Please select Assessment Year {assessment_year} manually.")

        try:
            # Select ITR form
            form_option = page.locator(f'text={itr_form}').first
            if await form_option.is_visible():
                await form_option.click()
                await asyncio.sleep(1)
        except Exception:
            await emit_step("form_manual", f"Please select {itr_form} manually.")

        # Step 6: Fill income fields
        await emit_step("filling_income", "Filling income details...")
        await _fill_income_fields(page, tax_data, itr_form)

        # Step 7: Fill deduction fields (old regime only)
        if tax_data.get("total_deductions", 0) > 0:
            await emit_step("filling_deductions", "Filling deduction details...")
            await _fill_deduction_fields(page, tax_data)

        # Step 8: Pause for user review
        await emit_step("review", "All fields filled. Please REVIEW everything in the browser before proceeding.")
        _session["waiting_for"] = "review"
        while _session["waiting_for"] == "review":
            await asyncio.sleep(1)

        # Step 9: E-verification
        await emit_step("everification", "Please complete e-verification (Aadhaar OTP) in the browser.")
        _session["waiting_for"] = "otp_everify"
        while _session["waiting_for"] == "otp_everify":
            await asyncio.sleep(1)

        await emit_step("completed", "ITR filing completed successfully!")
        _session["status"] = "completed"

    except Exception as e:
        await emit_step("error", f"Automation error: {str(e)}")
        _session["status"] = "error"


async def _fill_income_fields(page: Page, tax_data: dict, itr_form: str):
    """Attempt to fill income fields in the ITR form."""
    fields_to_fill = {}

    if itr_form == "ITR-4":
        fields_to_fill = {
            "gross_professional_income": tax_data.get("gross_professional_income", 0),
            "presumptive_income": tax_data.get("deemed_income", 0),
        }
    else:
        fields_to_fill = {
            "gross_professional_income": tax_data.get("gross_professional_income", 0),
            "business_expenses": tax_data.get("business_expenses", 0),
        }

    # Add other income
    fields_to_fill["interest_income"] = tax_data.get("gross_other_income", 0)

    for field_name, value in fields_to_fill.items():
        if value and value > 0:
            try:
                # Try multiple strategies to find the input
                input_el = page.locator(f'input[name*="{field_name}"]').first
                if not await input_el.is_visible():
                    input_el = page.locator(f'input[id*="{field_name}"]').first
                if await input_el.is_visible():
                    await input_el.fill(str(int(value)))
                    await asyncio.sleep(0.5)
            except Exception:
                pass  # Field not found, user will fill manually

    await emit_step("income_filled", f"Attempted to fill {len(fields_to_fill)} income fields. Please verify values.")


async def _fill_deduction_fields(page: Page, tax_data: dict):
    """Attempt to fill deduction fields."""
    total_ded = tax_data.get("total_deductions", 0)
    if total_ded > 0:
        try:
            # Look for 80C-like fields
            ded_input = page.locator('input[name*="80C"], input[id*="80C"], input[name*="deduction"]').first
            if await ded_input.is_visible():
                await ded_input.fill(str(int(total_ded)))
        except Exception:
            pass
    await emit_step("deductions_filled", "Deduction fields filled. Please verify.")


async def send_signal(signal: str):
    """Receive a signal from the frontend to continue automation."""
    if signal in ("login_complete", "nav_complete", "review", "otp_everify"):
        _session["waiting_for"] = None


async def stop_filing():
    """Stop the automation and close the browser."""
    _session["waiting_for"] = None
    _session["status"] = "stopped"
    browser = _session.get("browser")
    if browser:
        try:
            await browser.close()
        except Exception:
            pass
    _session["browser"] = None
    _session["page"] = None

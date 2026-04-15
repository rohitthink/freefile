# Hacker News Launch Post

**Title:** Show HN: FreeFile – Open-source ITR filing for Indian freelancers

**URL:** https://github.com/rohitthink/freefile

**Body (first comment):**

Hi HN, I'm Rohit. I built FreeFile because filing taxes as a freelancer in India is needlessly painful — the government portal is slow, accountants charge a premium, and most "free" apps monetize your financial data.

FreeFile is a local-first ITR filing app that runs entirely on your device. Key design decisions:

**Architecture:**
- Backend: Python FastAPI (for bank statement parsing and tax computation)
- Frontend: Next.js 16 + React 19 + TypeScript
- Desktop: Tauri 2 (Rust shell with embedded PyInstaller binary)
- Mobile: Capacitor 8 (Android + iOS)
- Storage: SQLite, local only

**Why local-first:**
Financial data never leaves the device. There's no backend database storing user data. The only network call happens when you opt into cloud PDF parsing (faster than local for scanned PDFs), and even then the file is processed in-memory and discarded.

**Tax engine:**
Full implementation of ITR-3 and ITR-4 (44ADA presumptive) with:
- Both old and new regime (FY 2025-26)
- Rebate 87A with marginal relief
- Surcharge calculation with marginal relief
- All major deductions (80C, 80D, 80CCD(1B), 80E, 80G, 80TTA)
- Advance tax schedule
- Standard deduction under new regime
- Deemed income calculation under 44ADA

Tests validate the engine against known tax scenarios — I'd love extra eyes on this since correctness is critical.

**Bank parsers:**
PDF parsing with pdfplumber + pikepdf, plus dedicated parsers for HDFC, SBI, ICICI, Axis, Kotak. Also handles Zerodha/Groww/IndMoney trading statements and Form 26AS.

**Filing automation:**
Playwright driving incometax.gov.in directly. Your credentials never touch my code — you enter them in the official portal window.

**License:** AGPL-3.0. I considered MIT but chose AGPL specifically because tax compliance software should remain open — if someone forks it and deploys it as a service, their changes have to be open too.

Source: https://github.com/rohitthink/freefile

The repo has 5 `good first issue` tickets if anyone wants to contribute. Happy to answer any technical questions.

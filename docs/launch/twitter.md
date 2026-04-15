# Twitter/X Launch Thread

## Thread (10 tweets)

**1/**
I just open-sourced FreeFile — a free, privacy-first ITR filing app for Indian freelancers.

All your financial data stays on your device. No accounts, no tracking, no ads.

🔗 github.com/rohitthink/freefile

🧵👇

**2/**
Why I built this:

Filing taxes as a freelancer in India is painful.
- Government portal is slow
- CAs charge ₹3-5k
- "Free" apps sell your data
- Most tools don't understand freelancer edge cases (44ADA, TDS from Form 26AS, capital gains from trading)

**3/**
What FreeFile does:

✅ Imports statements from HDFC, SBI, ICICI, Axis, Kotak
✅ Auto-categorizes 20+ transaction types
✅ Computes tax under both old + new regime
✅ Supports ITR-3 and ITR-4 (44ADA)
✅ Tracks 80C, 80D, 80CCD(1B), 80E, 80G, 80TTA
✅ Imports Form 26AS TDS

**4/**
Privacy-first design:

🔒 All data stored locally (SQLite on device)
🔒 No backend database
🔒 No analytics, no telemetry
🔒 IT portal credentials never touch my code
🔒 AGPL-3.0 licensed — protected from proprietary forks

**5/**
Tech stack for the curious:

⚙️ Backend: FastAPI + Python (PDF parsing, tax engine)
⚙️ Frontend: Next.js 16 + React 19 + Tailwind
⚙️ Desktop: Tauri 2 (Rust)
⚙️ Mobile: Capacitor 8 (Android + iOS)
⚙️ Automation: Playwright (browser-based filing)

**6/**
Also supports capital gains from trading:

📈 Zerodha statements
📈 Groww mutual fund statements
📈 IndMoney statements
📈 LTCG/STCG calculation
📈 Grandfathering for pre-2018 shares

**7/**
Everything is open source under AGPL-3.0.

This is the full codebase — tax engine, parsers, UI. You can:
• Audit the logic
• Self-host
• Fork it
• Contribute back

Code: github.com/rohitthink/freefile

**8/**
Looking for contributors! 5 good-first-issues ready:

1. Bank of Baroda parser
2. Dark mode
3. Hindi language support
4. ICICI parser edge case tests
5. Mobile responsive improvements

If you're a dev who files ITR, come help 🙏

**9/**
Huge thanks to the open source community — this wouldn't exist without:
• pdfplumber / pikepdf (PDF parsing)
• FastAPI (backend framework)
• Next.js (frontend)
• Tauri (desktop shell)
• Playwright (filing automation)

**10/**
If you're an Indian freelancer, give FreeFile a try this tax season.

If it saves you time or money, ⭐ the repo.

If you find bugs, open an issue.

If you want to contribute, PRs welcome.

github.com/rohitthink/freefile

#opensource #india #freelancer #tax

---

## Shorter single-tweet version

Just open-sourced FreeFile — free, privacy-first ITR filing app for Indian freelancers 🇮🇳

• All data local, no tracking
• Supports HDFC/SBI/ICICI/Axis/Kotak
• ITR-3 + ITR-4 (44ADA)
• Old vs new regime
• AGPL-3.0

github.com/rohitthink/freefile

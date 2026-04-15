# Reddit Launch Posts

## r/india, r/IndiaInvestments, r/IndiaTax, r/indianstartups

**Title:**
I built a free, open-source ITR filing app for Indian freelancers — all data stays on your device

**Body:**

Hey folks,

I'm a freelancer and every year filing my ITR was painful. The official portal is slow, accountants charge 3-5k, and most "free" apps either have ads, collect your data, or lock features behind a paywall.

So I built **FreeFile** — a completely free, open-source, privacy-first ITR filing app for Indian freelancers and consultants.

**What it does:**
- Imports bank statements from HDFC, SBI, ICICI, Axis, Kotak (PDF, CSV, XLSX)
- Auto-categorizes transactions into 20+ income/expense categories
- Computes tax under both **old and new regime** (FY 2025-26) and shows you which one saves more
- Supports **ITR-3** and **ITR-4 (44ADA presumptive)**
- Tracks deductions under 80C, 80D, 80CCD(1B), 80E, 80G, 80TTA, etc.
- Imports TDS from Form 26AS
- Filing automation via browser on incometax.gov.in (credentials never stored)
- Parses trading statements from Zerodha, Groww, IndMoney for capital gains

**Privacy:**
- All your data stays on YOUR device (local SQLite)
- No accounts, no tracking, no ads
- No analytics or telemetry

**Tech stack:** Next.js 16 + FastAPI + Tauri (desktop) + Capacitor (mobile). All MIT-compatible open source libraries.

**License:** AGPL-3.0 — you can use, modify, fork, whatever. Just can't take it closed-source.

**GitHub:** https://github.com/rohitthink/freefile

I'd love your feedback — and if you want to contribute, there are 5 `good first issue` tickets waiting for you, including adding support for new banks like Bank of Baroda, dark mode, and Hindi language support.

Happy to answer any questions!

---

## r/opensource, r/selfhosted

**Title:**
FreeFile — Open source local-first ITR filing for Indian freelancers (AGPL-3.0)

**Body:**

Just open-sourced FreeFile, a privacy-first tax filing app I built for Indian freelancers. Thought this community might appreciate it:

- **Local-first:** SQLite on device, no cloud sync required
- **Self-hostable:** Runs as desktop (Tauri) or web (FastAPI + Next.js)
- **No telemetry:** Zero analytics, zero tracking
- **AGPL-3.0:** Protected against proprietary forks
- **Auditable:** Tax computation engine is fully open source so you can verify correctness

Supports 5 major Indian banks, 3 trading platforms, both tax regimes, and automated filing on the official portal via Playwright.

Repo: https://github.com/rohitthink/freefile

Looking for contributors, especially people who want to:
- Add parsers for more banks
- Add i18n (Hindi language support)
- Improve mobile UX
- Audit the tax computation logic

Feedback and PRs welcome!

# IndieHackers Launch Post

**Title:** I open-sourced my ITR filing app for Indian freelancers — here's why

**Body:**

Hey IH!

Quick share: I just open-sourced **FreeFile**, a privacy-first income tax filing app I've been building for Indian freelancers.

## The problem

Every year, filing income tax in India is painful for freelancers:
- The official portal is slow and confusing
- Chartered Accountants charge ₹3,000–5,000 for simple returns
- "Free" apps either have ads, sell your data, or lock the actual filing behind a paywall
- Most tools don't handle freelancer-specific things like 44ADA presumptive taxation, Form 26AS TDS import, or capital gains from trading platforms

## The solution

FreeFile is a local-first app that does the whole thing on your device:

1. You upload your bank statements (PDF/CSV/XLSX from HDFC, SBI, ICICI, Axis, Kotak)
2. It auto-categorizes your transactions
3. It computes tax under both old and new regimes and tells you which saves more
4. It imports TDS from Form 26AS
5. It generates your ITR summary as a PDF
6. It can even automate the actual filing via Playwright (opens incometax.gov.in in a browser, you enter credentials yourself)

Zero data leaves your device. No accounts. No subscription. No ads.

## Why I open-sourced it

1. **Trust:** Tax software should be auditable. I want users to verify the tax engine is correct.
2. **Community:** Every freelancer in India deals with this pain. Distributed development = more banks supported faster.
3. **Licensing protection:** AGPL-3.0 means if someone forks it into a SaaS, they have to open-source their changes too. No proprietary capture.
4. **Marketing:** Open source is a credibility signal in the privacy space. "Trust me" doesn't work for financial data; "read the code" does.

## Tech

- Next.js 16 + React 19 (frontend)
- FastAPI + Python (backend)
- Tauri 2 (desktop app)
- Capacitor (mobile apps)
- SQLite (local storage)
- Playwright (filing automation)

## Where I need help

- Contributors to add support for more Indian banks
- i18n for Hindi language support
- UX feedback
- Testers for the filing automation

Repo: https://github.com/rohitthink/freefile

Happy to answer any questions — especially if you're thinking about open-sourcing your own project and wondering whether it's worth it.

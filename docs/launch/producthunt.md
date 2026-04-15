# Product Hunt Launch Plan

## Product Name
FreeFile ITR

## Tagline (60 chars max)
Free, open-source ITR filing for Indian freelancers

## Description (260 chars max)
Local-first ITR filing app for Indian freelancers. Imports bank statements, computes tax under both regimes, tracks deductions, files on incometax.gov.in. All data stays on your device. Free and open source under AGPL-3.0.

## Topics
- Open Source
- Privacy
- Productivity
- Finance
- Developer Tools

## Gallery (Images needed)
1. Hero: Dashboard screenshot with tax summary
2. Bank statement upload flow
3. Old vs New regime comparison
4. Transaction categorization
5. Filing automation in action
6. PDF report sample

## First Comment (Maker)

Hi Product Hunt! 👋

I'm Rohit, a solo freelancer and developer from India. I built FreeFile because filing income tax here is a yearly pain — the official portal is slow, CAs charge a premium, and every "free" app I tried either showed ads or wanted me to sign up with my PAN.

**What FreeFile does:**

📂 **Imports bank statements** from India's 5 biggest banks (HDFC, SBI, ICICI, Axis, Kotak) in PDF, CSV, or XLSX format

🧮 **Computes your tax** under both old and new regimes (FY 2025-26) and tells you which saves more money. Supports ITR-3 and ITR-4 (presumptive 44ADA).

🏷️ **Auto-categorizes transactions** into 20+ income and expense categories (professional income, travel, utilities, etc.)

💰 **Tracks deductions** — 80C, 80D, 80CCD(1B), 80E, 80G, 80TTA

📑 **Imports Form 26AS TDS** for accurate TDS credit tracking

📈 **Handles capital gains** from Zerodha, Groww, and IndMoney

🤖 **Files automatically** — opens the official incometax.gov.in portal and walks you through filing (you enter your credentials, I never see them)

**Privacy is not a feature — it's the foundation:**

🔒 All data stored **locally** on your device (SQLite)
🔒 **No accounts** required
🔒 **No tracking**, analytics, or telemetry
🔒 **No ads**
🔒 Source code is **100% open** (AGPL-3.0)

**Why open source?**

Tax software should be auditable. Finance tools built on "trust me bro" deserve skepticism — I'd rather you read the code and verify the tax engine yourself. Plus, more contributors means more banks supported faster.

**Tech stack** (for the dev crowd):

Next.js 16 + React 19 (frontend), FastAPI + Python (backend with bank statement parsers and tax engine), Tauri 2 (desktop), Capacitor 8 (mobile). SQLite for storage, Playwright for filing automation.

**Call to action:**

If you're an Indian freelancer — give it a spin this tax season. Free forever.
If you're a developer — check out the 5 `good first issue` tickets on GitHub, PRs welcome.
If you hit a bug or want a feature — open an issue.

Thanks Product Hunt! Happy to answer any questions below. 🙏

GitHub: https://github.com/rohitthink/freefile

## Launch Day Checklist

- [ ] Schedule launch for 12:01 AM PT on a Tuesday or Wednesday
- [ ] Prepare 6 high-quality screenshots
- [ ] Record a 30-60 second demo video
- [ ] Draft first comment (done above)
- [ ] Add hunters / supporters
- [ ] Share in Indian maker communities, r/IndiaInvestments, Twitter/X, LinkedIn
- [ ] Respond to every comment within 30 minutes during launch day
- [ ] Update GitHub issues / README with PH link

## Promotion Plan

- **T-7 days:** Soft launch on Twitter, ask for "coming soon" signups
- **T-1 day:** Notify friends, family, and existing supporters
- **T-0 (launch day):** Post at 00:01 PT, spam-share (responsibly)
- **T+1 day:** Follow up with thank-you posts

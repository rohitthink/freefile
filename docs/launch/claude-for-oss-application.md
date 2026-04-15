# Claude for OSS Application Draft

Use this when filling out the Claude for OSS contact form at:
https://claude.com/contact-sales/claude-for-oss

## Project Information

**Project Name:** FreeFile ITR

**Project URL:** https://github.com/rohitthink/freefile

**License:** GNU Affero General Public License v3.0 (AGPL-3.0) — OSI-approved

**Description (short):**
Free, privacy-first income tax return filing application for Indian freelancers. Local-first architecture keeps all financial data on the user's device. Supports ITR-3 and ITR-4 (44ADA presumptive) with both old and new tax regimes.

**Description (long):**

FreeFile ITR is an open source tax filing application that addresses a real problem: filing income tax returns is painful and expensive for Indian freelancers. The official portal is slow, Chartered Accountants charge ₹3,000-5,000 per return, and commercial "free" apps typically monetize user data.

FreeFile solves this with a privacy-first, local-first approach:
- All financial data stored locally on the user's device (SQLite)
- No user accounts, no telemetry, no tracking
- No backend database storing personal information
- Open source tax engine users can audit for correctness

The app is actively maintained and has infrastructure for community contributions including contributor guide, code of conduct, security policy, CI pipeline, and labeled starter issues.

## Technical Details

**Tech Stack:**
- Backend: Python, FastAPI, Pydantic, SQLite (aiosqlite)
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Desktop: Tauri 2 (Rust)
- Mobile: Capacitor 8 (Android + iOS)
- PDF parsing: pdfplumber, pikepdf
- Browser automation: Playwright

**Features:**
- Bank statement parsing (HDFC, SBI, ICICI, Axis, Kotak)
- Form 26AS TDS import
- Trading statement parsing (Zerodha, Groww, IndMoney)
- Dual-regime tax computation (old + new for FY 2025-26)
- ITR-3 and ITR-4 (44ADA) support
- Deduction tracking (80C, 80D, 80CCD(1B), 80E, 80G, 80TTA)
- Advance tax schedule calculation
- Automated filing via Playwright on incometax.gov.in
- PDF report generation

## Community & Maintenance

**Active Contributors:** Currently solo maintainer (project open-sourced April 2026). Community infrastructure is fully built out and ready to scale.

**Community Setup:**
- [CONTRIBUTING.md](https://github.com/rohitthink/freefile/blob/main/CONTRIBUTING.md) — Full contributor guide including "how to add a bank parser" walkthrough
- [CODE_OF_CONDUCT.md](https://github.com/rohitthink/freefile/blob/main/CODE_OF_CONDUCT.md) — Contributor Covenant v2.1
- [SECURITY.md](https://github.com/rohitthink/freefile/blob/main/SECURITY.md) — Responsible disclosure policy
- Issue templates for bug reports and feature requests
- PR template with checklist (py_compile, tsc, tests)
- GitHub Actions CI matrix (Python 3.12/3.13 + Node 20)
- 5 labeled `good first issue` tickets to attract contributors
- `v1.0 Community Release` milestone on GitHub
- Public roadmap at https://github.com/users/rohitthink/projects/1
- GitHub Discussions enabled for community Q&A
- Full README with 7 product screenshots

**Commit History:** 13+ commits, actively maintained

**Active Outreach — 5 open PRs to major awesome-X lists:**
- [Lissy93/awesome-privacy #500](https://github.com/Lissy93/awesome-privacy/pull/500)
- [zhongkechen/awesome-local-first #2](https://github.com/zhongkechen/awesome-local-first/pull/2)
- [tauri-apps/awesome-tauri #663](https://github.com/tauri-apps/awesome-tauri/pull/663)
- [mjhea0/awesome-fastapi #281](https://github.com/mjhea0/awesome-fastapi/pull/281)
- [pluja/awesome-privacy #766](https://github.com/pluja/awesome-privacy/pull/766)

**Launch plan prepared:** Full launch kit ready at [docs/launch/](https://github.com/rohitthink/freefile/tree/main/docs/launch) for Reddit (r/india, r/opensource), Hacker News (Show HN), Twitter thread, IndieHackers, Product Hunt.

## Why This Matters

FreeFile serves a specific and underserved audience: Indian freelancers and independent professionals who need affordable, trustworthy tax filing tools. There are approximately 15 million freelancers in India, and existing solutions either charge annual subscriptions or compromise user privacy.

By being open source, FreeFile:
1. **Enables trust** — users can audit the tax engine for correctness
2. **Democratizes access** — free forever, no paywall
3. **Protects privacy** — no incentive to monetize user data
4. **Scales community-first** — new bank parsers and features come from community contributions
5. **Sets a standard** — shows that financial tools can be privacy-preserving AND free

## How I Would Use Claude

I am the sole maintainer and use Claude extensively for:
- Writing and reviewing bank statement parsers (PDF parsing edge cases)
- Debugging tax computation logic
- Writing test cases for tax scenarios
- Reviewing contributor PRs
- Writing documentation
- Code review before releases

Access to Claude via the OSS program would directly accelerate development of new bank parsers (currently the biggest bottleneck for user adoption) and help me maintain the project while working solo.

## Maintainer Info

**Name:** Rohit Ganguly
**GitHub:** https://github.com/rohitthink
**Email:** welcome2ithink@gmail.com
**Location:** India

**Existing Claude usage:** Max plan subscriber, use Claude Code daily for FreeFile development. Would upgrade to OSS tier to support more aggressive bank parser development and community PR review.

## Relevant Links

- Repository: https://github.com/rohitthink/freefile
- License: https://github.com/rohitthink/freefile/blob/main/LICENSE
- Contributing: https://github.com/rohitthink/freefile/blob/main/CONTRIBUTING.md
- Issues: https://github.com/rohitthink/freefile/issues
- Privacy Policy: https://github.com/rohitthink/freefile/blob/main/privacy.md

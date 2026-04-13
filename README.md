<h1 align="center">FreeFile ITR</h1>

<p align="center">
  <strong>Free, privacy-first income tax return filing app for Indian freelancers</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License"></a>
  <a href="https://github.com/rohitthink/freefile/issues"><img src="https://img.shields.io/github/issues/rohitthink/freefile.svg" alt="Issues"></a>
  <a href="https://github.com/rohitthink/freefile/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://github.com/rohitthink/freefile/stargazers"><img src="https://img.shields.io/github/stars/rohitthink/freefile.svg" alt="Stars"></a>
</p>

---

FreeFile ITR helps Indian freelancers, consultants, and independent professionals compute and file their income tax returns — completely free, with all data stored locally on your device.

## Features

| Feature | Description |
|---------|-------------|
| Bank Statement Parsing | Auto-import from HDFC, SBI, ICICI, Axis, Kotak (PDF, CSV, XLSX) |
| Smart Categorization | Auto-categorize transactions into 20+ income/expense categories |
| Tax Computation | ITR-3 and ITR-4 (44ADA) with old vs new regime comparison |
| Deduction Tracking | Sections 80C, 80D, 80CCD(1B), 80E, 80G, 80TTA, and more |
| TDS Credits | Import from Form 26AS or manual entry |
| Advance Tax Schedule | Quarterly installment breakdowns |
| Filing Automation | Browser-based filing on incometax.gov.in (credentials never stored) |
| PDF Reports | Professional ITR summary with full tax breakdown |
| Capital Gains | Track trading income from Zerodha, Groww, IndMoney |
| Desktop App | Native desktop via Tauri (macOS, Windows, Linux) |
| Mobile App | Android and iOS via Capacitor |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/rohitthink/freefile.git
cd freefile

# Install dependencies
make setup

# Run development servers (backend + frontend)
make dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:3000`.

### Prerequisites

- Python 3.12+
- Node.js 20+
- Git

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand |
| Backend | Python, FastAPI, Pydantic, SQLite (aiosqlite) |
| Desktop | Tauri 2 (Rust) |
| Mobile | Capacitor 8 (Android + iOS) |
| PDF Parsing | pdfplumber, pikepdf |
| Filing | Playwright (browser automation) |

## Project Structure

```
freefile/
  backend/
    main.py          # FastAPI app entry point
    parsers/         # Bank statement parsers (HDFC, SBI, ICICI, Axis, Kotak, ...)
    tax/             # Tax computation engine (old/new regime, ITR-3/4)
    categorizer/     # Auto-categorization rules and keywords
    db/              # SQLite models and database layer
    routes/          # API route handlers
  frontend/
    src/app/         # Next.js pages (dashboard, upload, transactions, tax, filing)
    src/components/  # Reusable UI components
    src/store/       # Zustand state management
  src-tauri/         # Tauri desktop app shell
  cloud/             # Cloud deployment (Dockerfile)
  tests/             # Pytest test suite
  scripts/           # Dev and build scripts
```

## Supported Banks

- HDFC Bank (PDF, CSV)
- State Bank of India (PDF, XLSX)
- ICICI Bank (PDF, XLS)
- Axis Bank (PDF, CSV)
- Kotak Mahindra Bank (PDF, CSV)
- Form 26AS (TDS statements)
- Zerodha (trading statements)
- Groww (mutual fund statements)
- IndMoney (mutual fund statements)

> Want support for your bank? [Open an issue](https://github.com/rohitthink/freefile/issues/new?template=feature_request.md) or submit a PR!

## Privacy

All your financial data stays on your device. No accounts, no tracking, no ads. See our full [Privacy Policy](privacy.md).

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

Look for issues labeled [`good first issue`](https://github.com/rohitthink/freefile/labels/good%20first%20issue) if you're new to the project.

## License

FreeFile ITR is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means you can freely use, modify, and distribute this software, but any modified version that is deployed as a service must also be open sourced under the same license.

## Support

- [Report a Bug](https://github.com/rohitthink/freefile/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/rohitthink/freefile/issues/new?template=feature_request.md)
- [Security Issues](SECURITY.md)

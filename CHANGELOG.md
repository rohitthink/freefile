# Changelog

All notable changes to FreeFile ITR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-15

First community release. The project is now open source under AGPL-3.0 with
full contributor infrastructure.

### Added

- Bank statement parsing for HDFC, SBI, ICICI, Axis, and Kotak (PDF, CSV, XLSX)
- Form 26AS TDS import
- Trading statement parsing for Zerodha, Groww, and IndMoney
- Dual-regime tax computation (old and new regimes, FY 2025-26)
- ITR-3 and ITR-4 (44ADA presumptive) support
- Deduction tracking for Sections 80C, 80D, 80CCD(1B), 80E, 80G, 80TTA
- Advance tax schedule with quarterly breakdowns
- Capital gains tracking (short-term, long-term, LTCG grandfathering for pre-2018 shares)
- Automated filing on incometax.gov.in via Playwright (credentials never stored)
- PDF report generation
- Multi-transaction cross-transfer detection
- Rebate 87A and surcharge calculation with marginal relief
- Standard deduction under the new regime

### Infrastructure

- AGPL-3.0 license
- README with feature overview and 7 product screenshots
- CONTRIBUTING.md with "how to add a bank parser" walkthrough
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SECURITY.md responsible disclosure policy
- GitHub issue templates (bug report, feature request)
- Pull request template
- GitHub Actions CI pipeline (py_compile, tsc, pytest)
- 5 seeded `good first issue` tickets for new contributors
- Public roadmap (GitHub Projects)
- GitHub Discussions enabled
- `.github/FUNDING.yml` for GitHub Sponsors

### Platforms

- Desktop app: Tauri 2 (macOS, Windows, Linux)
- Mobile app: Capacitor 8 (Android, iOS)
- Web app: FastAPI backend + Next.js frontend

### Privacy

- All financial data stored locally in SQLite on the user's device
- No user accounts required
- No analytics, telemetry, or third-party SDKs
- No backend database stores user data

[1.0.0]: https://github.com/rohitthink/freefile/releases/tag/v1.0.0

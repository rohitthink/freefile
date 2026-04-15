# OSS Directory Submissions

List of awesome-X GitHub lists and directories to submit FreeFile to.

## Format to use for each submission

**Category:** Finance / Tax / India / Local-first

**Entry:**
```markdown
- [FreeFile ITR](https://github.com/rohitthink/freefile) - Free, privacy-first income tax return filing app for Indian freelancers. Imports bank statements, computes tax under both regimes, files on incometax.gov.in. Local-first with AGPL-3.0 license.
```

## Target Directories

### High priority

1. **awesome-india**
   - Repo: https://github.com/iRohitSingh/awesome-india (and similar)
   - Category: Finance / Tools
   - Action: Open PR adding FreeFile entry

2. **awesome-selfhosted**
   - Repo: https://github.com/awesome-selfhosted/awesome-selfhosted
   - Category: Money, Budgeting & Management
   - Action: Open PR (strict format requirements — see CONTRIBUTING.md)
   - Note: Must be self-hostable (✅), non-trivial (✅), AGPL is fine

3. **awesome-open-source**
   - Repo: https://github.com/topics/awesome
   - Multiple awesome lists to submit to

4. **awesome-privacy**
   - Repo: https://github.com/Lissy93/awesome-privacy
   - Category: Financial Tools or Apps
   - Action: Open PR

5. **awesome-local-first**
   - Repo: https://github.com/rain-1/awesome-local-first-software
   - Category: Finance
   - Action: Open PR

### Medium priority

6. **awesome-foss-apps** — Android/desktop FOSS apps
7. **awesome-sysadmin** — If self-hosting angle is strong
8. **awesome-react** — Since it's React-based
9. **awesome-fastapi** — Since it's FastAPI-based
10. **awesome-tauri** — Since it uses Tauri

### Indian-focused

11. **awesome-indian-makers** (if exists)
12. **awesome-india-opensource** — Indian OSS projects
13. **Indian Hackers Discord** — Share in relevant channels

## Web Directories (non-GitHub)

14. **AlternativeTo** — alternativeto.net
    - List as alternative to ClearTax, Quicko, Tax2Win
    - Category: Tax Software, Free, Open Source

15. **LibHunt** — libhunt.com
    - Python / FastAPI category

16. **OpenSource.com** — Write an article about the project

17. **F-Droid** — For Android build (once F-Droid compliant)

18. **Flathub** — For Linux desktop (Tauri bundle)

## Submission Template Message

When opening PRs, use this template:

---

**PR Title:** Add FreeFile ITR to [Category]

**PR Body:**

Hi! I'd like to propose adding FreeFile ITR to this list.

**Project:** https://github.com/rohitthink/freefile
**Description:** Free, privacy-first income tax return filing app for Indian freelancers. Imports bank statements from major Indian banks, computes tax under both old and new regimes, supports ITR-3 and ITR-4 (44ADA), and can file directly on incometax.gov.in.
**License:** AGPL-3.0 (OSI-approved)
**Maintained:** Yes, actively maintained
**Self-hostable:** Yes, runs as desktop app (Tauri), web app, or mobile app (Capacitor)

**Why it fits this list:** [customize per directory]

Thanks for considering!

---

## Tracking

| # | Directory | Status | PR Link | Notes |
|---|-----------|--------|---------|-------|
| 1 | Lissy93/awesome-privacy | PR OPEN | https://github.com/Lissy93/awesome-privacy/pull/500 | Added to Finance → Budgeting (YAML format) |
| 2 | zhongkechen/awesome-local-first | PR OPEN | https://github.com/zhongkechen/awesome-local-first/pull/2 | Created new Finance category |
| 3 | tauri-apps/awesome-tauri | PR OPEN | https://github.com/tauri-apps/awesome-tauri/pull/663 | Added to Finance section |
| 4 | mjhea0/awesome-fastapi | PR OPEN | https://github.com/mjhea0/awesome-fastapi/pull/281 | Added to Open Source Projects |
| 5 | pluja/awesome-privacy | PR OPEN | https://github.com/pluja/awesome-privacy/pull/766 | Created new Tax Filing subsection |
| 6 | awesome-selfhosted (GitLab) | NEEDS USER ACTION | - | Branch ready at github.com/rohitthink/awesome-selfhosted/tree/add-freefile-itr — submit manually via GitLab MR after creating GitLab account |
| 7 | awesome-india | Not submitted | - | Identify specific awesome-india repo with active maintainer |
| 8 | AlternativeTo | Not submitted | - | Submit manually at alternativeto.net — add as alternative to ClearTax, Quicko |

## PR Monitoring

A daily scheduled task (`freefile-pr-monitor`) runs at 9:37 AM local time to check for new comments, reviews, or status changes on all 5 open PRs. The task is configured via Claude Code's scheduled-tasks system and reports back when there is activity that needs a response.

## Manual: Submit to awesome-selfhosted via GitLab

The upstream awesome-selfhosted is on GitLab (gitlab.com/awesome-selfhosted/awesome-selfhosted-data). The GitHub mirror at awesome-selfhosted/awesome-selfhosted has interactions restricted to collaborators only.

To submit manually:
1. Create a GitLab account (or sign in if you have one)
2. Fork https://gitlab.com/awesome-selfhosted/awesome-selfhosted-data
3. Their data is in YAML format under `software/freefile-itr.yml`
4. Use this template:

```yaml
name: FreeFile ITR
website_url: https://github.com/rohitthink/freefile
source_code_url: https://github.com/rohitthink/freefile
description: |
  Free, privacy-first income tax return filing app for Indian freelancers.
  Imports bank statements from major Indian banks (HDFC, SBI, ICICI, Axis,
  Kotak), auto-categorizes transactions, computes tax under both old and
  new regimes, supports ITR-3 and ITR-4 (44ADA presumptive), and files
  directly on the official incometax.gov.in portal via browser automation.
  All financial data stored locally in SQLite — no telemetry, no accounts.
licenses:
  - AGPL-3.0
platforms:
  - Python
  - Nodejs
  - Docker
tags:
  - money-budgeting-and-management
```

5. Open MR against the master branch
6. The CI will validate the entry format automatically

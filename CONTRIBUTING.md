# Contributing to FreeFile ITR

Thank you for your interest in contributing to FreeFile! This guide will help you get started.

## Prerequisites

- Python 3.12+
- Node.js 20+
- Git

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/freefile.git
cd freefile
```

### 2. Set Up the Development Environment

```bash
# Create Python virtual environment and install backend deps
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install frontend deps
cd frontend && npm install && cd ..
```

### 3. Run the App

```bash
make dev
```

This starts the FastAPI backend on port 8000 and the Next.js frontend on port 3000.

## Development Workflow

### Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Make Your Changes

Follow the existing code patterns:
- **Backend:** FastAPI routes in `backend/routes/`, parsers in `backend/parsers/`
- **Frontend:** Next.js pages in `frontend/src/app/`, components in `frontend/src/components/`
- **Tests:** Pytest tests in `tests/`

### Run Bug Checks (Required)

After editing any code, you **must** run these checks before committing:

**Python files:**
```bash
source venv/bin/activate
python -m py_compile backend/path/to/your_file.py
```

**TypeScript/React files:**
```bash
cd frontend && npx tsc --noEmit
```

### Run Tests

```bash
source venv/bin/activate
pytest tests/ -v
```

### Submit a Pull Request

1. Push your branch to your fork
2. Open a PR against the `main` branch of `rohitthink/freefile`
3. Fill out the PR template
4. Ensure CI passes

## Adding a Bank Parser

One of the most valuable contributions is adding support for new banks. Here's how:

1. Create a new file in `backend/parsers/` (e.g., `bob.py` for Bank of Baroda)
2. Follow the pattern in existing parsers like `hdfc.py`
3. Your parser should accept a file path and return a list of transaction dicts with:
   - `date` (YYYY-MM-DD)
   - `description` (string)
   - `amount` (float, positive)
   - `type` ("credit" or "debit")
   - `balance` (float, optional)
4. Register your parser in the upload route
5. Add test cases in `tests/`

## Code Style

- **Python:** Follow PEP 8. Use type hints where practical.
- **TypeScript:** Follow the existing patterns. Use TypeScript types, not `any`.
- **Commits:** Use clear, descriptive commit messages. Prefix with `feat:`, `fix:`, `docs:`, `test:`, `chore:` as appropriate.

## Issue Labels

| Label | Description |
|-------|-------------|
| `good first issue` | Great for newcomers |
| `help wanted` | Community help appreciated |
| `bug` | Something isn't working |
| `enhancement` | New feature or improvement |
| `bank-parser` | Related to bank statement parsing |
| `tax-engine` | Related to tax computation |
| `ui` | Frontend/UI changes |
| `docs` | Documentation improvements |

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open a [discussion](https://github.com/rohitthink/freefile/issues) or comment on the relevant issue. We're happy to help!

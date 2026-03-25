# FreeFile - ITR Filing App for Indian Freelancers

## Project Structure
- `backend/` - Python FastAPI (port 8000): parsers, tax engine, API routes
- `frontend/` - Next.js 16 + TypeScript (port 3000): dashboard, upload, transactions, tax UI
- `data/freefile.db` - SQLite database (local-only, gitignored)
- `venv/` - Python virtual environment

## Running
```bash
cd freefile
bash scripts/dev.sh    # or: make dev
```

## Bug Checking Rule
After writing or editing ANY code file, always run:
- **Python**: `source venv/bin/activate && python -m py_compile <file>` for each changed .py file
- **TypeScript**: `cd frontend && npx tsc --noEmit` for any changed .ts/.tsx file
- Fix any errors before moving on. Do not skip this step.

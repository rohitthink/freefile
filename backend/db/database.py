import aiosqlite
import os
from pathlib import Path


def _resolve_db_path() -> Path:
    data_dir = os.environ.get("FREEFILE_DATA_DIR")
    if data_dir:
        p = Path(data_dir) / "freefile.db"
    else:
        p = Path(__file__).parent.parent.parent / "data" / "freefile.db"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


DB_PATH = _resolve_db_path()


def get_db_path() -> str:
    return str(DB_PATH)


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(get_db_path())
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS financial_years (
    fy TEXT PRIMARY KEY,
    regime TEXT DEFAULT 'new' CHECK(regime IN ('old', 'new')),
    itr_form TEXT DEFAULT 'ITR-4' CHECK(itr_form IN ('ITR-3', 'ITR-4'))
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    ifsc TEXT,
    is_primary INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fy TEXT NOT NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    date TEXT NOT NULL,
    narration TEXT NOT NULL,
    amount REAL NOT NULL,
    tx_type TEXT NOT NULL CHECK(tx_type IN ('credit', 'debit')),
    balance REAL,
    reference TEXT,
    category TEXT DEFAULT 'uncategorized',
    category_confirmed INTEGER DEFAULT 0,
    source_file TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fy TEXT NOT NULL,
    section TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tds_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fy TEXT NOT NULL,
    deductor_name TEXT,
    deductor_tan TEXT,
    amount_paid REAL,
    tds_deducted REAL,
    tds_deposited REAL,
    section TEXT
);

CREATE TABLE IF NOT EXISTS filing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fy TEXT NOT NULL,
    filed_at TEXT,
    acknowledgement_number TEXT,
    itr_form TEXT,
    status TEXT DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS category_overrides (
    narration_pattern TEXT PRIMARY KEY,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    pan TEXT,
    name TEXT,
    dob TEXT,
    father_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    mobile TEXT,
    email TEXT,
    aadhaar_linked INTEGER DEFAULT 0,
    profession TEXT DEFAULT 'freelancer'
);

INSERT OR IGNORE INTO financial_years (fy, regime, itr_form) VALUES ('2025-26', 'new', 'ITR-4');
INSERT OR IGNORE INTO profile (id) VALUES (1);
"""

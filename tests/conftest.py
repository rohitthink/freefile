"""Shared fixtures for FreeFile test suite."""
import os
import tempfile
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Use a temp database for tests
_test_dir = tempfile.mkdtemp(prefix="freefile-test-")
os.environ["FREEFILE_DATA_DIR"] = _test_dir

from backend.main import app  # noqa: E402
from backend.db.database import init_db  # noqa: E402


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def client():
    """Async HTTP client against the FastAPI app with fresh DB."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="session")
def test_dir():
    return _test_dir


@pytest_asyncio.fixture(scope="session")
async def seed_transactions(client, test_dir):
    """Seed 50 test transactions for integration/stress tests."""
    import aiosqlite
    db_path = os.path.join(test_dir, "freefile.db")
    db = await aiosqlite.connect(db_path)
    try:
        # Check if already seeded
        cursor = await db.execute("SELECT COUNT(*) FROM transactions WHERE fy = '2025-26'")
        count = (await cursor.fetchone())[0]
        if count > 0:
            return  # Already seeded

        # Income transactions
        for i in range(20):
            await db.execute(
                "INSERT INTO transactions (fy, date, narration, amount, tx_type, category, category_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("2025-26", f"2025-{(i % 12) + 1:02d}-15", f"Invoice payment #{i+1} from Client {chr(65 + i % 5)}", 50000 + i * 1000, "credit", "professional_income", 1),
            )
        # Interest income
        for i in range(5):
            await db.execute(
                "INSERT INTO transactions (fy, date, narration, amount, tx_type, category) VALUES (?, ?, ?, ?, ?, ?)",
                ("2025-26", f"2025-{(i % 12) + 1:02d}-28", f"Interest credit Q{i+1}", 2500 + i * 100, "credit", "interest_income"),
            )
        # Expenses
        expenses = [
            ("Rent payment", 25000, "rent"),
            ("Internet bill", 1500, "internet_phone"),
            ("AWS subscription", 3000, "software_subscriptions"),
            ("MacBook repair", 15000, "equipment"),
            ("Flight to Delhi", 8000, "travel"),
            ("CA fees", 10000, "professional_fees"),
            ("Health insurance premium", 5000, "insurance"),
            ("Office supplies from Amazon", 2000, "office_supplies"),
            ("Client dinner", 3500, "meals_entertainment"),
            ("Grocery shopping", 5000, "personal"),
            ("Mutual fund SIP", 10000, "investment"),
            ("Advance tax Q1", 25000, "tax_payment"),
            ("GST payment", 9000, "gst_payment"),
            ("UPI transfer to savings", 50000, "transfer"),
            ("ATM withdrawal", 5000, "uncategorized"),
        ]
        for i, (narr, amt, cat) in enumerate(expenses):
            await db.execute(
                "INSERT INTO transactions (fy, date, narration, amount, tx_type, category) VALUES (?, ?, ?, ?, ?, ?)",
                ("2025-26", f"2025-{(i % 12) + 1:02d}-10", narr, amt, "debit", cat),
            )
        # Bulk uncategorized
        for i in range(10):
            await db.execute(
                "INSERT INTO transactions (fy, date, narration, amount, tx_type, category) VALUES (?, ?, ?, ?, ?, ?)",
                ("2025-26", f"2025-06-{i+1:02d}", f"NEFT TRANSFER REF{1000+i}", 5000 + i * 500, "debit", "uncategorized"),
            )
        await db.commit()
    finally:
        await db.close()

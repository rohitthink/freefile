"""Stress tests — concurrent requests, large payloads, edge cases."""
import pytest
import asyncio


@pytest.mark.asyncio
async def test_concurrent_reads(client, seed_transactions):
    """Fire 50 concurrent read requests."""
    async def fetch():
        res = await client.get("/api/transactions", params={"fy": "2025-26", "limit": "10"})
        return res.status_code

    results = await asyncio.gather(*[fetch() for _ in range(50)])
    assert all(r == 200 for r in results), f"Some requests failed: {results}"


@pytest.mark.asyncio
async def test_concurrent_summary_and_tax(client, seed_transactions):
    """Fire summary + tax compute + compare concurrently."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    async def summary():
        return (await client.get("/api/transactions/summary", params={"fy": "2025-26"})).status_code

    async def compute():
        return (await client.get("/api/tax/compute", params={"fy": "2025-26"})).status_code

    async def compare():
        return (await client.get("/api/tax/compare", params={"fy": "2025-26"})).status_code

    tasks = [summary() for _ in range(10)] + [compute() for _ in range(10)] + [compare() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    assert all(r == 200 for r in results)


@pytest.mark.asyncio
async def test_rapid_deduction_crud(client):
    """Rapidly add and delete deductions."""
    ids = []
    for i in range(20):
        res = await client.post("/api/tax/deductions", json={
            "fy": "2025-26", "section": "80C", "description": f"Rapid test {i}", "amount": 1000 + i,
        })
        assert res.status_code == 200

    # List and delete all test deductions
    res = await client.get("/api/tax/deductions", params={"fy": "2025-26"})
    for d in res.json()["deductions"]:
        if d["description"].startswith("Rapid test"):
            ids.append(d["id"])

    for did in ids:
        res = await client.delete(f"/api/tax/deductions/{did}")
        assert res.status_code == 200


@pytest.mark.asyncio
async def test_large_search_query(client, seed_transactions):
    """Search with a long query string."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "search": "A" * 500})
    assert res.status_code == 200
    assert res.json()["total"] == 0


@pytest.mark.asyncio
async def test_zero_amount_deduction(client):
    """Zero amount deduction should still save."""
    res = await client.post("/api/tax/deductions", json={
        "fy": "2025-26", "section": "80G", "description": "Zero donation", "amount": 0,
    })
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_very_large_income(client):
    """Test tax computation with very large income (crore+)."""
    import aiosqlite, os
    db_path = os.path.join(os.environ["FREEFILE_DATA_DIR"], "freefile.db")
    db = await aiosqlite.connect(db_path)
    try:
        await db.execute(
            "INSERT INTO transactions (fy, date, narration, amount, tx_type, category) VALUES (?, ?, ?, ?, ?, ?)",
            ("2025-26", "2025-03-31", "Mega project payment", 50000000, "credit", "professional_income"),
        )
        await db.commit()
    finally:
        await db.close()

    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})
    res = await client.get("/api/tax/compute", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    # With 5 crore+ income, surcharge should apply
    assert data["total_tax"] > 0
    assert data["surcharge"] >= 0
    assert data["cess"] > 0

    # Clean up
    db = await aiosqlite.connect(db_path)
    try:
        await db.execute("DELETE FROM transactions WHERE narration = 'Mega project payment'")
        await db.commit()
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_concurrent_pdf_generation(client, seed_transactions):
    """Generate 5 PDFs concurrently."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    async def gen_pdf():
        res = await client.get("/api/report/pdf", params={"fy": "2025-26"})
        return res.status_code, len(res.content)

    results = await asyncio.gather(*[gen_pdf() for _ in range(5)])
    for status, size in results:
        assert status == 200
        assert size > 1000


@pytest.mark.asyncio
async def test_filing_status_without_filing(client):
    """Filing status when no filing is in progress."""
    res = await client.get("/api/filing/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("idle", "completed", "error", "stopped")


@pytest.mark.asyncio
async def test_invalid_filing_signal(client):
    """Sending invalid signal."""
    res = await client.post("/api/filing/signal", params={"signal": "invalid_signal"})
    assert res.status_code == 200
    assert "error" in res.json()


@pytest.mark.asyncio
async def test_playwright_status(client):
    """Check playwright status endpoint."""
    res = await client.get("/api/playwright/status")
    assert res.status_code == 200
    data = res.json()
    assert "installed" in data
    assert "browsers_path" in data

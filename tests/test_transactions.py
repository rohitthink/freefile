"""Test transaction endpoints — CRUD, filters, bulk update, summary."""
import pytest


@pytest.mark.asyncio
async def test_empty_transactions_unseeded_fy(client):
    """Unseeded FY has no transactions."""
    res = await client.get("/api/transactions", params={"fy": "2099-00"})
    assert res.status_code == 200
    data = res.json()
    assert data["transactions"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_transaction_summary_empty_unseeded_fy(client):
    """Unseeded FY summary is zero."""
    res = await client.get("/api/transactions/summary", params={"fy": "2099-00"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_income"] == 0.0
    assert data["total_expenses"] == 0.0


# --- Tests that need seeded data (fixture from conftest.py) ---

@pytest.mark.asyncio
async def test_seeded_transactions(client, seed_transactions):
    """After seeding, should have 50 transactions."""
    res = await client.get("/api/transactions", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 50


@pytest.mark.asyncio
async def test_filter_by_category(client, seed_transactions):
    """Filter transactions by category."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "category": "professional_income"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 20
    for tx in data["transactions"]:
        assert tx["category"] == "professional_income"


@pytest.mark.asyncio
async def test_filter_by_tx_type(client, seed_transactions):
    """Filter by credit/debit."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "tx_type": "credit"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 25  # 20 professional + 5 interest


@pytest.mark.asyncio
async def test_search_narration(client, seed_transactions):
    """Search by narration text."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "search": "Invoice"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 20


@pytest.mark.asyncio
async def test_pagination(client, seed_transactions):
    """Test limit and offset."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "limit": "10", "offset": "0"})
    data = res.json()
    assert len(data["transactions"]) == 10
    assert data["total"] == 50

    res2 = await client.get("/api/transactions", params={"fy": "2025-26", "limit": "10", "offset": "10"})
    data2 = res2.json()
    assert len(data2["transactions"]) == 10
    # Different transactions
    ids1 = {tx["id"] for tx in data["transactions"]}
    ids2 = {tx["id"] for tx in data2["transactions"]}
    assert ids1.isdisjoint(ids2)


@pytest.mark.asyncio
async def test_update_category(client, seed_transactions):
    """Update a single transaction's category."""
    # Get first uncategorized
    res = await client.get("/api/transactions", params={"fy": "2025-26", "category": "uncategorized"})
    txns = res.json()["transactions"]
    tx_id = txns[0]["id"]

    res = await client.put(f"/api/transactions/{tx_id}", params={"category": "personal", "category_confirmed": "true"})
    assert res.status_code == 200

    # Verify
    res = await client.get("/api/transactions", params={"fy": "2025-26", "category": "uncategorized"})
    remaining_ids = {tx["id"] for tx in res.json()["transactions"]}
    assert tx_id not in remaining_ids


@pytest.mark.asyncio
async def test_bulk_update(client, seed_transactions):
    """Bulk update categories."""
    res = await client.get("/api/transactions", params={"fy": "2025-26", "category": "uncategorized"})
    txns = res.json()["transactions"]
    # Take up to 5
    updates = [{"id": tx["id"], "category": "personal"} for tx in txns[:5]]

    res = await client.put("/api/transactions/bulk-update", json=updates)
    if res.status_code != 200:
        print(f"BULK UPDATE FAILED: {res.status_code} {res.text}")
    assert res.status_code == 200
    assert res.json()["count"] == len(updates)


@pytest.mark.asyncio
async def test_summary_with_data(client, seed_transactions):
    """Summary should have real numbers after seeding."""
    res = await client.get("/api/transactions/summary", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_income"] > 0
    assert data["total_expenses"] > 0
    assert "professional_income" in data["income_by_category"]
    assert len(data["monthly"]) > 0

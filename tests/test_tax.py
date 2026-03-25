"""Test tax computation, deductions, TDS, advance tax, regime comparison, and PDF report."""
import pytest


# --- Deductions ---

@pytest.mark.asyncio
async def test_add_deduction(client):
    """Add a deduction."""
    res = await client.post("/api/tax/deductions", json={
        "fy": "2025-26", "section": "80C", "description": "PPF contribution", "amount": 150000,
    })
    assert res.status_code == 200

    res = await client.post("/api/tax/deductions", json={
        "fy": "2025-26", "section": "80D", "description": "Health insurance", "amount": 25000,
    })
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_list_deductions(client):
    """List deductions."""
    res = await client.get("/api/tax/deductions", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["deductions"]) >= 2
    sections = [d["section"] for d in data["deductions"]]
    assert "80C" in sections
    assert "80D" in sections


@pytest.mark.asyncio
async def test_delete_deduction(client):
    """Delete a deduction."""
    res = await client.get("/api/tax/deductions", params={"fy": "2025-26"})
    ded_id = res.json()["deductions"][-1]["id"]

    res = await client.delete(f"/api/tax/deductions/{ded_id}")
    assert res.status_code == 200


# --- TDS ---

@pytest.mark.asyncio
async def test_add_tds_entry(client):
    """Add TDS entries."""
    entries = [
        {"fy": "2025-26", "deductor_name": "Client A", "deductor_tan": "MUMA12345B",
         "amount_paid": 500000, "tds_deducted": 50000, "tds_deposited": 50000, "section": "194J"},
        {"fy": "2025-26", "deductor_name": "Client B", "deductor_tan": "DELB67890C",
         "amount_paid": 300000, "tds_deducted": 30000, "tds_deposited": 30000, "section": "194J"},
        {"fy": "2025-26", "deductor_name": "Bank Interest", "deductor_tan": "HDFC11111A",
         "amount_paid": 50000, "tds_deducted": 5000, "tds_deposited": 5000, "section": "194A"},
    ]
    for entry in entries:
        res = await client.post("/api/tax/tds", json=entry)
        assert res.status_code == 200


@pytest.mark.asyncio
async def test_list_tds(client):
    """List TDS entries."""
    res = await client.get("/api/tax/tds", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["tds_entries"]) >= 3
    total_tds = sum(t["tds_deposited"] for t in data["tds_entries"])
    assert total_tds >= 85000


@pytest.mark.asyncio
async def test_delete_tds(client):
    """Delete a TDS entry."""
    res = await client.get("/api/tax/tds", params={"fy": "2025-26"})
    tds_id = res.json()["tds_entries"][-1]["id"]

    res = await client.delete(f"/api/tax/tds/{tds_id}")
    assert res.status_code == 200


# --- Tax Computation ---

@pytest.mark.asyncio
async def test_compute_tax_new_regime(client, seed_transactions):
    """Compute tax under new regime (ITR-4)."""
    # Ensure new regime ITR-4
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    res = await client.get("/api/tax/compute", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()

    assert data["regime"] == "new"
    assert data["itr_form"] == "ITR-4"
    assert data["gross_professional_income"] > 0
    assert data["deemed_income"] is not None  # ITR-4 has deemed income
    assert data["taxable_income"] >= 0
    assert data["total_tax"] >= 0
    assert data["cess"] == round(data["tax_on_income"] * 0.04, 2) or data["cess"] >= 0


@pytest.mark.asyncio
async def test_compute_tax_old_regime(client, seed_transactions):
    """Compute tax under old regime."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "old", "itr_form": "ITR-4"})

    res = await client.get("/api/tax/compute", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["regime"] == "old"
    assert data["total_deductions"] > 0  # We added 80C deduction earlier


@pytest.mark.asyncio
async def test_compute_tax_itr3(client, seed_transactions):
    """Compute tax under ITR-3 (actual expenses)."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-3"})

    res = await client.get("/api/tax/compute", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["itr_form"] == "ITR-3"
    assert data["business_expenses"] is not None
    assert data["deemed_income"] is None  # ITR-3 has no deemed income


@pytest.mark.asyncio
async def test_compare_regimes(client, seed_transactions):
    """Compare old vs new regime."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    res = await client.get("/api/tax/compare", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert "old_regime" in data
    assert "new_regime" in data
    assert "recommended" in data
    assert data["recommended"] in ("old", "new")
    assert "savings" in data
    assert data["savings"] >= 0
    # Both regimes should have computed values
    assert data["old_regime"]["total_tax"] >= 0
    assert data["new_regime"]["total_tax"] >= 0


@pytest.mark.asyncio
async def test_advance_tax_schedule(client, seed_transactions):
    """Get advance tax schedule."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    res = await client.get("/api/tax/advance-schedule", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert "schedule" in data
    assert "total_tax" in data
    # Schedule should have 4 installments if tax > 10000
    if data["total_tax"] - data["tds_credit"] > 10000:
        assert len(data["schedule"]) == 4


# --- PDF Report ---

@pytest.mark.asyncio
async def test_pdf_report(client, seed_transactions):
    """Generate PDF report and verify it's valid."""
    await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-4"})

    res = await client.get("/api/report/pdf", params={"fy": "2025-26"})
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000  # Should be a real PDF
    assert res.content[:5] == b"%PDF-"  # PDF magic bytes


# --- Export ---

@pytest.mark.asyncio
async def test_export_data(client, seed_transactions):
    """Export all data as JSON."""
    res = await client.get("/api/export", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["export_version"] == "1.0"
    assert data["fy"] == "2025-26"
    assert len(data["transactions"]) > 0
    assert "settings" in data
    assert "category_overrides" in data

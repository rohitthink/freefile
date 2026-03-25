"""Test FY settings endpoints."""
import pytest


@pytest.mark.asyncio
async def test_get_default_fy_settings(client):
    """Default FY settings should be 2025-26, new regime, ITR-4."""
    res = await client.get("/api/settings/fy", params={"fy": "2025-26"})
    assert res.status_code == 200
    data = res.json()
    assert data["fy"] == "2025-26"
    assert data["regime"] == "new"
    assert data["itr_form"] == "ITR-4"


@pytest.mark.asyncio
async def test_update_fy_settings_old_regime(client):
    """Switch to old regime."""
    res = await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "old", "itr_form": "ITR-4"})
    assert res.status_code == 200

    res = await client.get("/api/settings/fy", params={"fy": "2025-26"})
    assert res.json()["regime"] == "old"


@pytest.mark.asyncio
async def test_update_fy_settings_itr3(client):
    """Switch to ITR-3."""
    res = await client.put("/api/settings/fy", json={"fy": "2025-26", "regime": "new", "itr_form": "ITR-3"})
    assert res.status_code == 200

    res = await client.get("/api/settings/fy", params={"fy": "2025-26"})
    data = res.json()
    assert data["itr_form"] == "ITR-3"
    assert data["regime"] == "new"


@pytest.mark.asyncio
async def test_create_new_fy(client):
    """Create settings for a new FY."""
    res = await client.put("/api/settings/fy", json={"fy": "2024-25", "regime": "old", "itr_form": "ITR-4"})
    assert res.status_code == 200

    res = await client.get("/api/settings/fy", params={"fy": "2024-25"})
    data = res.json()
    assert data["fy"] == "2024-25"
    assert data["regime"] == "old"


@pytest.mark.asyncio
async def test_nonexistent_fy_returns_defaults(client):
    """Unknown FY returns defaults."""
    res = await client.get("/api/settings/fy", params={"fy": "2099-00"})
    assert res.status_code == 200
    data = res.json()
    assert data["regime"] == "new"
    assert data["itr_form"] == "ITR-4"

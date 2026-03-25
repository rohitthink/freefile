"""Test category override CRUD."""
import pytest


@pytest.mark.asyncio
async def test_empty_overrides(client):
    """Fresh DB may have some overrides from transaction updates, or none."""
    res = await client.get("/api/category-overrides")
    assert res.status_code == 200
    assert "overrides" in res.json()


@pytest.mark.asyncio
async def test_add_override(client):
    """Add a category override rule."""
    res = await client.post("/api/category-overrides", json={
        "narration_pattern": "razorpay settlement",
        "category": "professional_income",
    })
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_add_duplicate_override(client):
    """Adding same pattern should replace, not error."""
    res = await client.post("/api/category-overrides", json={
        "narration_pattern": "razorpay settlement",
        "category": "other_income",
    })
    assert res.status_code == 200

    # Verify it was updated
    res = await client.get("/api/category-overrides")
    overrides = res.json()["overrides"]
    match = [o for o in overrides if o["narration_pattern"] == "razorpay settlement"]
    assert len(match) == 1
    assert match[0]["category"] == "other_income"


@pytest.mark.asyncio
async def test_add_multiple_overrides(client):
    """Add several overrides."""
    rules = [
        ("aws monthly charge", "software_subscriptions"),
        ("google workspace", "software_subscriptions"),
        ("rent payment to landlord", "rent"),
        ("zomato order", "meals_entertainment"),
        ("uber ride", "travel"),
    ]
    for pattern, category in rules:
        res = await client.post("/api/category-overrides", json={
            "narration_pattern": pattern, "category": category,
        })
        assert res.status_code == 200

    res = await client.get("/api/category-overrides")
    assert len(res.json()["overrides"]) >= 6


@pytest.mark.asyncio
async def test_delete_override(client):
    """Delete an override."""
    res = await client.delete("/api/category-overrides/zomato%20order")
    assert res.status_code == 200

    # Verify deleted
    res = await client.get("/api/category-overrides")
    patterns = [o["narration_pattern"] for o in res.json()["overrides"]]
    assert "zomato order" not in patterns


@pytest.mark.asyncio
async def test_delete_nonexistent_override(client):
    """Deleting nonexistent override should 404."""
    res = await client.delete("/api/category-overrides/nonexistent%20pattern")
    assert res.status_code == 404

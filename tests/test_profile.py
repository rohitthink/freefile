"""Test profile CRUD operations."""
import pytest


@pytest.mark.asyncio
async def test_get_default_profile(client):
    """Fresh DB should have an empty profile."""
    res = await client.get("/api/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["profession"] == "freelancer"
    assert data["pan"] is None


@pytest.mark.asyncio
async def test_update_profile(client):
    """Update profile and verify persistence."""
    profile = {
        "pan": "ABCDE1234F",
        "name": "Test User",
        "dob": "1990-01-15",
        "father_name": "Father Name",
        "address": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "mobile": "9876543210",
        "email": "test@example.com",
        "profession": "freelancer",
    }
    res = await client.put("/api/profile", json=profile)
    assert res.status_code == 200

    # Verify
    res = await client.get("/api/profile")
    data = res.json()
    assert data["pan"] == "ABCDE1234F"
    assert data["name"] == "Test User"
    assert data["city"] == "Mumbai"
    assert data["pincode"] == "400001"


@pytest.mark.asyncio
async def test_update_profile_partial(client):
    """Update only some fields."""
    res = await client.put("/api/profile", json={"name": "Updated Name", "city": "Delhi"})
    assert res.status_code == 200

    res = await client.get("/api/profile")
    data = res.json()
    assert data["name"] == "Updated Name"
    assert data["city"] == "Delhi"
    # Other fields should persist
    assert data["pan"] == "ABCDE1234F"

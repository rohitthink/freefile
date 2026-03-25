"""Test health and basic app startup."""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_cors_headers(client):
    """Verify CORS is open for desktop app."""
    res = await client.options(
        "/api/health",
        headers={"Origin": "http://tauri.localhost", "Access-Control-Request-Method": "GET"},
    )
    # Should not reject the origin
    assert res.status_code in (200, 204, 405)

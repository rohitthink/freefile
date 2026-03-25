from fastapi import APIRouter
from backend.db.database import get_db

router = APIRouter()


@router.get("/profile")
async def get_profile():
    """Get user profile."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM profile WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row) if row else {}
    finally:
        await db.close()


@router.put("/profile")
async def update_profile(data: dict):
    """Update user profile."""
    db = await get_db()
    try:
        fields = ["pan", "name", "dob", "father_name", "address", "city",
                   "state", "pincode", "mobile", "email", "aadhaar_linked", "profession"]
        updates = []
        params = []
        for f in fields:
            if f in data:
                updates.append(f"{f} = ?")
                params.append(data[f])

        if not updates:
            return {"status": "nothing to update"}

        params.append(1)
        await db.execute(f"UPDATE profile SET {', '.join(updates)} WHERE id = ?", params)
        await db.commit()
        return {"status": "saved"}
    finally:
        await db.close()

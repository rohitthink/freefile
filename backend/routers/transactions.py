from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from backend.db.database import get_db

router = APIRouter()


@router.get("/transactions")
async def list_transactions(
    fy: str = Query("2025-26"),
    category: Optional[str] = Query(None),
    tx_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(500),
    offset: int = Query(0),
):
    """List transactions with optional filters."""
    db = await get_db()
    try:
        query = "SELECT * FROM transactions WHERE fy = ?"
        params: list = [fy]

        if category:
            query += " AND category = ?"
            params.append(category)
        if tx_type:
            query += " AND tx_type = ?"
            params.append(tx_type)
        if search:
            query += " AND narration LIKE ?"
            params.append(f"%{search}%")

        query += " ORDER BY date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()

        # Get total count
        count_query = "SELECT COUNT(*) FROM transactions WHERE fy = ?"
        count_params: list = [fy]
        if category:
            count_query += " AND category = ?"
            count_params.append(category)
        if tx_type:
            count_query += " AND tx_type = ?"
            count_params.append(tx_type)
        if search:
            count_query += " AND narration LIKE ?"
            count_params.append(f"%{search}%")

        cursor = await db.execute(count_query, count_params)
        total = (await cursor.fetchone())[0]

        transactions = [dict(row) for row in rows]
        return {"transactions": transactions, "total": total}
    finally:
        await db.close()


@router.put("/transactions/{tx_id}")
async def update_transaction(tx_id: int, category: Optional[str] = None, category_confirmed: Optional[bool] = None):
    """Update a transaction's category."""
    db = await get_db()
    try:
        updates = []
        params = []
        if category is not None:
            updates.append("category = ?")
            params.append(category)
        if category_confirmed is not None:
            updates.append("category_confirmed = ?")
            params.append(1 if category_confirmed else 0)

        if not updates:
            raise HTTPException(400, "No fields to update")

        params.append(tx_id)
        await db.execute(f"UPDATE transactions SET {', '.join(updates)} WHERE id = ?", params)

        # If category was confirmed, save as override for future matching
        if category and category_confirmed:
            cursor = await db.execute("SELECT narration FROM transactions WHERE id = ?", (tx_id,))
            row = await cursor.fetchone()
            if row:
                narration = row[0]
                # Extract key part of narration (first 30 chars, lowered)
                pattern = narration[:30].strip().lower()
                await db.execute(
                    "INSERT OR REPLACE INTO category_overrides (narration_pattern, category) VALUES (?, ?)",
                    (pattern, category),
                )

        await db.commit()
        return {"status": "updated"}
    finally:
        await db.close()


@router.put("/transactions/bulk-update")
async def bulk_update_transactions(updates: list[dict]):
    """Bulk update transaction categories."""
    db = await get_db()
    try:
        for update in updates:
            tx_id = update.get("id")
            category = update.get("category")
            if tx_id and category:
                await db.execute(
                    "UPDATE transactions SET category = ?, category_confirmed = 1 WHERE id = ?",
                    (category, tx_id),
                )
        await db.commit()
        return {"status": "updated", "count": len(updates)}
    finally:
        await db.close()


@router.get("/transactions/summary")
async def transaction_summary(fy: str = Query("2025-26")):
    """Get income/expense summary grouped by category."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT category, tx_type, COUNT(*) as count, SUM(amount) as total
            FROM transactions WHERE fy = ?
            GROUP BY category, tx_type
            ORDER BY total DESC""",
            (fy,),
        )
        rows = await cursor.fetchall()

        income_categories = {}
        expense_categories = {}
        total_income = 0.0
        total_expenses = 0.0

        for row in rows:
            cat = row[0]
            tx_type = row[1]
            count = row[2]
            total = row[3] or 0.0

            if tx_type == "credit":
                income_categories[cat] = {"count": count, "total": round(total, 2)}
                total_income += total
            else:
                expense_categories[cat] = {"count": count, "total": round(total, 2)}
                total_expenses += total

        # Monthly breakdown
        cursor = await db.execute(
            """SELECT strftime('%Y-%m', date) as month, tx_type, SUM(amount) as total
            FROM transactions WHERE fy = ?
            GROUP BY month, tx_type
            ORDER BY month""",
            (fy,),
        )
        monthly_rows = await cursor.fetchall()

        monthly = {}
        for row in monthly_rows:
            month = row[0]
            if month not in monthly:
                monthly[month] = {"income": 0.0, "expenses": 0.0}
            if row[1] == "credit":
                monthly[month]["income"] = round(row[2] or 0.0, 2)
            else:
                monthly[month]["expenses"] = round(row[2] or 0.0, 2)

        return {
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "income_by_category": income_categories,
            "expense_by_category": expense_categories,
            "monthly": monthly,
        }
    finally:
        await db.close()


# --- Category Overrides ---


class CategoryOverrideCreate(BaseModel):
    narration_pattern: str
    category: str


@router.get("/category-overrides")
async def list_category_overrides():
    """List all category override rules."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT narration_pattern, category FROM category_overrides ORDER BY narration_pattern"
        )
        rows = await cursor.fetchall()
        return {"overrides": [dict(row) for row in rows]}
    finally:
        await db.close()


@router.post("/category-overrides")
async def add_category_override(override: CategoryOverrideCreate):
    """Add or update a category override rule."""
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO category_overrides (narration_pattern, category) VALUES (?, ?)",
            (override.narration_pattern.strip().lower(), override.category),
        )
        await db.commit()
        return {"status": "created", "narration_pattern": override.narration_pattern.strip().lower(), "category": override.category}
    finally:
        await db.close()


@router.delete("/category-overrides/{pattern:path}")
async def delete_category_override(pattern: str):
    """Delete a category override rule."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM category_overrides WHERE narration_pattern = ?", (pattern,)
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(404, "Override not found")
        return {"status": "deleted"}
    finally:
        await db.close()

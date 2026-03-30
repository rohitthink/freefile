"""Parser for Groww Mutual Funds Capital Gains XLSX reports."""

import pandas as pd
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class GrowwMFEntry:
    """A single mutual fund capital gains entry."""
    source: str = "groww_mf"
    scrip_name: str = ""
    scheme_code: str = ""
    category: str = ""
    folio_number: str = ""
    isin: str = ""
    asset_type: str = "mutual_fund"
    buy_date: Optional[str] = None
    sell_date: Optional[str] = None
    quantity: float = 0.0
    buy_value: float = 0.0
    sell_value: float = 0.0
    expenses: float = 0.0
    stcg: float = 0.0
    ltcg: float = 0.0
    gain_loss: float = 0.0
    gain_type: str = ""
    holding_period_days: int = 0


@dataclass
class GrowwMFParseResult:
    """Complete result from parsing Groww MF report."""
    trades: list = field(default_factory=list)
    summary: dict = field(default_factory=dict)


def _safe_float(val) -> float:
    if val is None:
        return 0.0
    try:
        f = float(val)
        if pd.isna(f):
            return 0.0
        return round(f, 2)
    except (ValueError, TypeError):
        if isinstance(val, str):
            cleaned = val.strip().replace(",", "").replace("₹", "").replace("Rs", "").strip()
            try:
                return round(float(cleaned), 2)
            except (ValueError, TypeError):
                return 0.0
        return 0.0


def _safe_str(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    return str(val).strip()


def _parse_date(val) -> Optional[str]:
    """Parse date to ISO format string."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    if not s:
        return None
    for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y", "%d %b %Y",
                "%d %B %Y", "%b %d, %Y", "%B %d, %Y"]:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    try:
        from dateutil import parser as dateutil_parser
        return dateutil_parser.parse(s, dayfirst=True).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def _classify_mf_gain(category: str, buy_date_str: str, sell_date_str: str) -> str:
    """
    Classify mutual fund gain type.
    Equity MF: <=12 months = STCG 111A, >12 months = LTCG 112A
    Debt MF (post Apr 2023): always STCG at slab rate
    """
    is_equity = "equity" in category.lower() if category else True

    if buy_date_str and sell_date_str:
        try:
            buy = datetime.strptime(buy_date_str, "%Y-%m-%d")
            sell = datetime.strptime(sell_date_str, "%Y-%m-%d")
            days = (sell - buy).days

            if is_equity:
                return "STCG_111A" if days <= 365 else "LTCG_112A"
            else:
                # Debt MFs purchased after April 2023 are taxed at slab rates
                if buy >= datetime(2023, 4, 1):
                    return "STCG_slab"
                else:
                    return "STCG_slab" if days <= 36 * 30 else "LTCG_112"
        except (ValueError, TypeError):
            pass

    return "STCG_111A" if is_equity else "STCG_slab"


def parse_groww_mf(file_path: str) -> GrowwMFParseResult:
    """
    Parse Groww Mutual Funds Capital Gains XLSX.

    Structure:
    - Rows 9-12: Summary with Asset Class | Taxable Short Term | Taxable Long Term
    - Row 20+: Detail table with:
      Scheme Name | Scheme Code | Category | Folio Number | Purchase Date |
      Matched Quantity | Purchase Price | Redeem Date | Redeem Price |
      Short Term-Capital Gain | Long Term-Capital Gain
    """
    result = GrowwMFParseResult()
    df = pd.read_excel(file_path, header=None)

    # --- Parse Summary Section (rows 9-12 approximately) ---
    for idx in range(min(len(df), 20)):
        row_vals = [_safe_str(v).lower() for v in df.iloc[idx]]
        row_text = " ".join(row_vals)

        if "equity" in row_text and ("short term" in row_text or "taxable" in row_text):
            # This could be the summary header row
            pass

        for i, val in enumerate(row_vals):
            if "equity" in val and "debt" not in val:
                stcg = _safe_float(df.iloc[idx].iloc[i + 1]) if i + 1 < len(df.columns) else 0.0
                ltcg = _safe_float(df.iloc[idx].iloc[i + 2]) if i + 2 < len(df.columns) else 0.0
                if stcg != 0.0 or ltcg != 0.0:
                    result.summary["equity_stcg"] = stcg
                    result.summary["equity_ltcg"] = ltcg
            elif "debt" in val:
                stcg = _safe_float(df.iloc[idx].iloc[i + 1]) if i + 1 < len(df.columns) else 0.0
                ltcg = _safe_float(df.iloc[idx].iloc[i + 2]) if i + 2 < len(df.columns) else 0.0
                if stcg != 0.0 or ltcg != 0.0:
                    result.summary["debt_stcg"] = stcg
                    result.summary["debt_ltcg"] = ltcg

    # --- Parse Detail Table ---
    detail_header_idx = -1
    col_map = {}

    for idx in range(min(len(df), 30)):
        row_vals = [_safe_str(v).lower() for v in df.iloc[idx]]
        # Look for detail table header with "scheme name" and "purchase date"
        if any("scheme name" in v for v in row_vals) and \
           any("purchase" in v for v in row_vals):
            detail_header_idx = idx
            for i, h in enumerate(row_vals):
                if "scheme name" in h:
                    col_map["scheme_name"] = i
                elif "scheme code" in h:
                    col_map["scheme_code"] = i
                elif "category" in h:
                    col_map["category"] = i
                elif "folio" in h:
                    col_map["folio"] = i
                elif "purchase date" in h:
                    col_map["purchase_date"] = i
                elif "matched quantity" in h or "quantity" in h:
                    col_map["quantity"] = i
                elif "purchase price" in h:
                    col_map["purchase_price"] = i
                elif "redeem date" in h:
                    col_map["redeem_date"] = i
                elif "redeem price" in h:
                    col_map["redeem_price"] = i
                elif "short term" in h and ("gain" in h or "capital" in h):
                    col_map["stcg"] = i
                elif "long term" in h and ("gain" in h or "capital" in h):
                    col_map["ltcg"] = i
            break

    if detail_header_idx < 0 or "scheme_name" not in col_map:
        return result

    # Parse data rows
    for idx in range(detail_header_idx + 1, len(df)):
        row = df.iloc[idx]
        scheme_name = _safe_str(row.iloc[col_map["scheme_name"]]) if "scheme_name" in col_map else ""

        if not scheme_name:
            continue
        if any(kw in scheme_name.lower() for kw in ["total", "grand total", "summary"]):
            break

        scheme_code = _safe_str(row.iloc[col_map["scheme_code"]]) if "scheme_code" in col_map else ""
        category = _safe_str(row.iloc[col_map["category"]]) if "category" in col_map else ""
        folio = _safe_str(row.iloc[col_map["folio"]]) if "folio" in col_map else ""
        purchase_date = _parse_date(row.iloc[col_map["purchase_date"]]) if "purchase_date" in col_map else None
        quantity = _safe_float(row.iloc[col_map["quantity"]]) if "quantity" in col_map else 0.0
        purchase_price = _safe_float(row.iloc[col_map["purchase_price"]]) if "purchase_price" in col_map else 0.0
        redeem_date = _parse_date(row.iloc[col_map["redeem_date"]]) if "redeem_date" in col_map else None
        redeem_price = _safe_float(row.iloc[col_map["redeem_price"]]) if "redeem_price" in col_map else 0.0
        stcg = _safe_float(row.iloc[col_map["stcg"]]) if "stcg" in col_map else 0.0
        ltcg = _safe_float(row.iloc[col_map["ltcg"]]) if "ltcg" in col_map else 0.0

        buy_value = round(quantity * purchase_price, 2) if quantity and purchase_price else 0.0
        sell_value = round(quantity * redeem_price, 2) if quantity and redeem_price else 0.0
        gain_loss = stcg + ltcg if (stcg or ltcg) else sell_value - buy_value

        # Holding period
        holding_days = 0
        if purchase_date and redeem_date:
            try:
                bd = datetime.strptime(purchase_date, "%Y-%m-%d")
                sd = datetime.strptime(redeem_date, "%Y-%m-%d")
                holding_days = (sd - bd).days
            except (ValueError, TypeError):
                pass

        # Determine gain type
        if ltcg != 0.0 and stcg == 0.0:
            gain_type = _classify_mf_gain(category, purchase_date or "", redeem_date or "")
            if "112A" not in gain_type and "112" not in gain_type:
                gain_type = "LTCG_112A" if "equity" in category.lower() else "LTCG_112"
        elif stcg != 0.0 and ltcg == 0.0:
            gain_type = "STCG_111A" if "equity" in category.lower() else "STCG_slab"
        else:
            gain_type = _classify_mf_gain(category, purchase_date or "", redeem_date or "")

        entry = GrowwMFEntry(
            scrip_name=scheme_name,
            scheme_code=scheme_code,
            category=category,
            folio_number=folio,
            buy_date=purchase_date,
            sell_date=redeem_date,
            quantity=quantity,
            buy_value=buy_value,
            sell_value=sell_value,
            stcg=stcg,
            ltcg=ltcg,
            gain_loss=gain_loss,
            gain_type=gain_type,
            holding_period_days=holding_days,
        )
        result.trades.append(entry)

    return result

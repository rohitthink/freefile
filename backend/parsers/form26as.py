"""Parser for Form 26AS (Tax Credit Statement) PDF from TRACES.

Form 26AS contains:
Part A  - TDS from salary
Part A1 - TDS from other than salary (194J, 194C, etc.) - MOST RELEVANT for freelancers
Part A2 - TDS on sale of immovable property
Part B  - Tax collected at source
Part C  - Tax paid (advance tax, self-assessment)
Part D  - Refunds
"""

from typing import Optional
import pdfplumber
import re
from dataclasses import dataclass


@dataclass
class TDSEntry26AS:
    deductor_name: str
    deductor_tan: str
    section: str
    transaction_date: str
    amount_paid: float
    tds_deducted: float
    tds_deposited: float


@dataclass
class TaxPayment26AS:
    challan_number: str
    bsr_code: str
    date: str
    amount: float
    section: str  # "advance tax", "self assessment"


def parse_form_26as(file_path: str, password: Optional[str] = None) -> dict:
    """Parse Form 26AS PDF and extract TDS entries and tax payments."""
    tds_entries: list[TDSEntry26AS] = []
    tax_payments: list[TaxPayment26AS] = []

    open_kwargs = {}
    if password:
        open_kwargs["password"] = password

    try:
        with pdfplumber.open(file_path, **open_kwargs) as pdf:
            full_text = ""
            all_tables = []

            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
                tables = page.extract_tables() or []
                all_tables.extend(tables)

            # Verify it's a 26AS
            if "26as" not in full_text.lower() and "tax credit" not in full_text.lower() and "traces" not in full_text.lower():
                return {"error": "This does not appear to be a Form 26AS", "tds_entries": [], "tax_payments": []}

            # Parse tables
            for table in all_tables:
                if not table or len(table) < 2:
                    continue

                header_row = [str(c).lower().strip() if c else "" for c in table[0]]
                header_text = " ".join(header_row)

                # Part A1 - TDS details (from sources other than salary)
                if _is_tds_table(header_text, header_row):
                    col_map = _map_tds_columns(header_row)
                    if col_map:
                        for row in table[1:]:
                            entry = _parse_tds_row(row, col_map)
                            if entry:
                                tds_entries.append(entry)

                # Part C - Tax paid (advance tax / self assessment)
                elif _is_tax_payment_table(header_text, header_row):
                    col_map = _map_tax_payment_columns(header_row)
                    if col_map:
                        for row in table[1:]:
                            payment = _parse_tax_payment_row(row, col_map)
                            if payment:
                                tax_payments.append(payment)

    except Exception as e:
        return {"error": f"Error parsing 26AS: {str(e)}", "tds_entries": [], "tax_payments": []}

    return {
        "tds_entries": [_tds_to_dict(t) for t in tds_entries],
        "tax_payments": [_payment_to_dict(p) for p in tax_payments],
        "total_tds": round(sum(t.tds_deposited for t in tds_entries), 2),
        "total_advance_tax": round(sum(p.amount for p in tax_payments), 2),
    }


def _is_tds_table(header_text: str, headers: list[str]) -> bool:
    keywords = ["tan", "deductor", "section", "amount paid", "tds"]
    return sum(1 for kw in keywords if kw in header_text) >= 2


def _is_tax_payment_table(header_text: str, headers: list[str]) -> bool:
    keywords = ["challan", "bsr", "tax deposited", "amount"]
    return sum(1 for kw in keywords if kw in header_text) >= 2


def _map_tds_columns(headers: list[str]) -> Optional[dict]:
    col_map = {}
    for i, h in enumerate(headers):
        if "name" in h and "deductor" in h:
            col_map["name"] = i
        elif "tan" in h:
            col_map["tan"] = i
        elif "section" in h:
            col_map["section"] = i
        elif "date" in h and "transaction" in h:
            col_map["date"] = i
        elif "amount paid" in h or "amount credited" in h:
            col_map["amount_paid"] = i
        elif "deducted" in h and "tds" in h:
            col_map["tds_deducted"] = i
        elif "deposited" in h and "tds" in h:
            col_map["tds_deposited"] = i

    if "tan" in col_map and ("tds_deposited" in col_map or "tds_deducted" in col_map):
        return col_map
    return None


def _map_tax_payment_columns(headers: list[str]) -> Optional[dict]:
    col_map = {}
    for i, h in enumerate(headers):
        if "challan" in h:
            col_map["challan"] = i
        elif "bsr" in h:
            col_map["bsr"] = i
        elif "date" in h:
            col_map["date"] = i
        elif "amount" in h:
            col_map["amount"] = i
        elif "section" in h or "minor" in h:
            col_map["section"] = i

    if "amount" in col_map:
        return col_map
    return None


def _parse_amount(val: str) -> Optional[float]:
    if not val or not isinstance(val, str):
        return None
    cleaned = val.strip().replace(",", "").replace("INR", "").strip()
    if not cleaned or cleaned == "-":
        return None
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def _parse_tds_row(row: list, col_map: dict) -> Optional[TDSEntry26AS]:
    try:
        tan = str(row[col_map["tan"]]).strip() if "tan" in col_map and row[col_map["tan"]] else ""
        if not tan or len(tan) < 5:
            return None

        name = str(row[col_map.get("name", 0)]).strip() if "name" in col_map and row[col_map.get("name", 0)] else ""
        section = str(row[col_map.get("section", 0)]).strip() if "section" in col_map and row[col_map.get("section", 0)] else ""
        date = str(row[col_map.get("date", 0)]).strip() if "date" in col_map and row[col_map.get("date", 0)] else ""

        amount_paid = _parse_amount(str(row[col_map.get("amount_paid", -1)])) if "amount_paid" in col_map else 0.0
        tds_deducted = _parse_amount(str(row[col_map.get("tds_deducted", -1)])) if "tds_deducted" in col_map else 0.0
        tds_deposited = _parse_amount(str(row[col_map.get("tds_deposited", -1)])) if "tds_deposited" in col_map else tds_deducted

        if not amount_paid and not tds_deposited:
            return None

        return TDSEntry26AS(
            deductor_name=name,
            deductor_tan=tan,
            section=section,
            transaction_date=date,
            amount_paid=amount_paid or 0.0,
            tds_deducted=tds_deducted or 0.0,
            tds_deposited=tds_deposited or 0.0,
        )
    except (IndexError, TypeError):
        return None


def _parse_tax_payment_row(row: list, col_map: dict) -> Optional[TaxPayment26AS]:
    try:
        amount = _parse_amount(str(row[col_map["amount"]])) if row[col_map["amount"]] else None
        if not amount:
            return None

        challan = str(row[col_map.get("challan", 0)]).strip() if "challan" in col_map and row[col_map.get("challan", 0)] else ""
        bsr = str(row[col_map.get("bsr", 0)]).strip() if "bsr" in col_map and row[col_map.get("bsr", 0)] else ""
        date = str(row[col_map.get("date", 0)]).strip() if "date" in col_map and row[col_map.get("date", 0)] else ""
        section = str(row[col_map.get("section", 0)]).strip() if "section" in col_map and row[col_map.get("section", 0)] else "advance tax"

        return TaxPayment26AS(
            challan_number=challan, bsr_code=bsr, date=date,
            amount=amount, section=section,
        )
    except (IndexError, TypeError):
        return None


def _tds_to_dict(entry: TDSEntry26AS) -> dict:
    return {
        "deductor_name": entry.deductor_name,
        "deductor_tan": entry.deductor_tan,
        "section": entry.section,
        "transaction_date": entry.transaction_date,
        "amount_paid": entry.amount_paid,
        "tds_deducted": entry.tds_deducted,
        "tds_deposited": entry.tds_deposited,
    }


def _payment_to_dict(payment: TaxPayment26AS) -> dict:
    return {
        "challan_number": payment.challan_number,
        "bsr_code": payment.bsr_code,
        "date": payment.date,
        "amount": payment.amount,
        "section": payment.section,
    }

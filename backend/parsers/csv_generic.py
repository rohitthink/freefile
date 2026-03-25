from typing import Optional
import csv
import io
from .base import BankStatementParser, RawTransaction


class CSVGenericParser(BankStatementParser):
    bank_name = "CSV"

    def can_parse(self, text: str, tables: list) -> bool:
        return True  # Fallback parser, always says yes for CSV files

    def parse(self, file_path: str, password: Optional[str] = None) -> list[RawTransaction]:
        transactions = []

        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Try to detect delimiter
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(content[:2048])
        except csv.Error:
            dialect = csv.excel

        reader = csv.reader(io.StringIO(content), dialect)
        rows = list(reader)
        if not rows:
            return transactions

        # Find header row (first row with date-like and amount-like columns)
        header_idx = self._find_header_row(rows)
        if header_idx is None:
            return transactions

        headers = [h.strip().lower() for h in rows[header_idx]]
        col_map = self._map_columns(headers)
        if not col_map:
            return transactions

        for row in rows[header_idx + 1:]:
            if len(row) < len(headers):
                row.extend([""] * (len(headers) - len(row)))
            tx = self._parse_row(row, col_map)
            if tx:
                transactions.append(tx)

        return transactions

    def _find_header_row(self, rows: list) -> Optional[int]:
        for i, row in enumerate(rows[:10]):  # Check first 10 rows
            row_text = " ".join(str(c).lower() for c in row)
            if "date" in row_text and ("amount" in row_text or "debit" in row_text or "credit" in row_text or "withdrawal" in row_text or "deposit" in row_text):
                return i
        return None

    def _map_columns(self, headers: list[str]) -> Optional[dict]:
        col_map = {}
        for i, h in enumerate(headers):
            h = h.strip()
            if ("date" in h and "value" not in h and "date" not in col_map) or h == "date":
                col_map["date"] = i
            elif any(kw in h for kw in ["narration", "description", "particular", "remark", "detail"]):
                col_map["narration"] = i
            elif any(kw in h for kw in ["ref", "chq", "cheque", "utr"]):
                col_map["reference"] = i
            elif any(kw in h for kw in ["withdrawal", "debit", "dr"]):
                col_map["debit"] = i
            elif any(kw in h for kw in ["deposit", "credit", "cr"]) and "balance" not in h:
                col_map["credit"] = i
            elif "amount" in h and "amount" not in col_map:
                col_map["amount"] = i
            elif "balance" in h:
                col_map["balance"] = i

        if "date" not in col_map or ("narration" not in col_map):
            return None
        return col_map

    def _parse_row(self, row: list, col_map: dict) -> Optional[RawTransaction]:
        try:
            date_val = row[col_map["date"]].strip()
            parsed_date = self._parse_date(date_val, [])
            if not parsed_date:
                return None

            narration = row[col_map["narration"]].strip()
            if not narration:
                return None

            balance = self._parse_amount(row[col_map["balance"]]) if "balance" in col_map and col_map["balance"] < len(row) else None
            reference = row[col_map["reference"]].strip() if "reference" in col_map and col_map["reference"] < len(row) else None

            if "debit" in col_map and "credit" in col_map:
                debit = self._parse_amount(row[col_map["debit"]]) if col_map["debit"] < len(row) else None
                credit = self._parse_amount(row[col_map["credit"]]) if col_map["credit"] < len(row) else None
                if credit and credit > 0:
                    return RawTransaction(date=parsed_date, narration=narration, amount=credit, tx_type="credit", balance=balance, reference=reference)
                elif debit and debit > 0:
                    return RawTransaction(date=parsed_date, narration=narration, amount=debit, tx_type="debit", balance=balance, reference=reference)
            elif "amount" in col_map:
                amount = self._parse_amount(row[col_map["amount"]]) if col_map["amount"] < len(row) else None
                if amount:
                    tx_type = "credit" if amount > 0 else "debit"
                    return RawTransaction(date=parsed_date, narration=narration, amount=abs(amount), tx_type=tx_type, balance=balance, reference=reference)

            return None
        except (IndexError, TypeError):
            return None

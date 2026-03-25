from typing import Optional
import pdfplumber
from .base import BankStatementParser, RawTransaction


class KotakParser(BankStatementParser):
    bank_name = "Kotak"

    def can_parse(self, text: str, tables: list) -> bool:
        text_lower = text.lower()
        return "kotak" in text_lower

    def parse(self, file_path: str, password: Optional[str] = None) -> list[RawTransaction]:
        transactions = []
        open_kwargs = {}
        if password:
            open_kwargs["password"] = password

        with pdfplumber.open(file_path, **open_kwargs) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    header_idx = self._find_header_row(table)
                    if header_idx is None:
                        continue
                    headers = [str(h).strip().lower() if h else "" for h in table[header_idx]]
                    col_map = self._map_columns(headers)
                    if not col_map:
                        continue
                    for row in table[header_idx + 1:]:
                        tx = self._parse_row(row, col_map)
                        if tx:
                            transactions.append(tx)
        return transactions

    def _find_header_row(self, table: list) -> Optional[int]:
        for i, row in enumerate(table):
            row_text = " ".join(str(c).lower() for c in row if c)
            if "date" in row_text and ("debit" in row_text or "credit" in row_text or "amount" in row_text):
                return i
        return None

    def _map_columns(self, headers: list[str]) -> Optional[dict]:
        col_map = {}
        for i, h in enumerate(headers):
            if "date" in h and "date" not in col_map:
                col_map["date"] = i
            elif "description" in h or "particular" in h or "narration" in h:
                col_map["narration"] = i
            elif "debit" in h:
                col_map["debit"] = i
            elif "credit" in h:
                col_map["credit"] = i
            elif "balance" in h:
                col_map["balance"] = i
        if "date" in col_map and "narration" in col_map:
            return col_map
        return None

    def _parse_row(self, row: list, col_map: dict) -> Optional[RawTransaction]:
        try:
            date_val = str(row[col_map["date"]]).strip() if row[col_map["date"]] else ""
            parsed_date = self._parse_date(date_val, [])
            if not parsed_date:
                return None
            narration = str(row[col_map["narration"]]).strip() if row[col_map["narration"]] else ""
            if not narration:
                return None
            debit = self._parse_amount(str(row[col_map.get("debit", -1)])) if "debit" in col_map else None
            credit = self._parse_amount(str(row[col_map.get("credit", -1)])) if "credit" in col_map else None
            balance = self._parse_amount(str(row[col_map.get("balance", -1)])) if "balance" in col_map else None
            if credit and credit > 0:
                return RawTransaction(date=parsed_date, narration=narration, amount=credit, tx_type="credit", balance=balance)
            elif debit and debit > 0:
                return RawTransaction(date=parsed_date, narration=narration, amount=debit, tx_type="debit", balance=balance)
            return None
        except (IndexError, TypeError):
            return None

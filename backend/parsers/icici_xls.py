"""ICICI XLS (OLE2) bank statement parser.

ICICI provides .xls files in legacy OLE2 format. Uses xlrd to read.
Row 12 typically has headers; data rows follow. Multi-line remarks have
continuation rows where S No. is empty.
"""

from typing import Optional

import xlrd

from .base import BankStatementParser, RawTransaction


class ICICIXlsParser(BankStatementParser):
    bank_name = "ICICI"

    HEADER_KEYWORDS = ["value date", "transaction date", "transaction remarks",
                       "withdrawal amount", "deposit amount", "balance"]

    def can_parse(self, text: str, tables: list) -> bool:
        text_lower = text.lower()
        if "icici" in text_lower:
            return True
        matched = sum(1 for kw in self.HEADER_KEYWORDS if kw in text_lower)
        return matched >= 3

    def parse(self, file_path: str, password: Optional[str] = None) -> list[RawTransaction]:
        wb = xlrd.open_workbook(file_path)
        ws = wb.sheet_by_index(0)

        header_idx = self._find_header_row(ws)
        if header_idx is None:
            return []

        col_map = self._map_columns(ws, header_idx)
        if not col_map:
            return []

        # First pass: merge continuation rows (empty S No.) into previous row's remarks
        merged_rows = self._merge_continuation_rows(ws, header_idx, col_map)

        transactions: list[RawTransaction] = []
        for row_data in merged_rows:
            tx = self._parse_row(row_data, col_map, wb.datemode)
            if tx:
                transactions.append(tx)

        return transactions

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_header_row(self, ws: xlrd.sheet.Sheet) -> Optional[int]:
        """Find the header row by looking for key column names.
        Requires multiple header keywords in the same row to avoid matching filter rows."""
        for i in range(min(25, ws.nrows)):
            row_text = " ".join(str(ws.cell_value(i, j)).lower() for j in range(ws.ncols))
            has_remarks = "remark" in row_text or "narration" in row_text or "particular" in row_text
            has_amounts = "withdrawal" in row_text or "deposit" in row_text or "debit" in row_text
            has_date = "date" in row_text
            if has_remarks and has_amounts and has_date:
                return i
        return None

    def _map_columns(self, ws: xlrd.sheet.Sheet, header_idx: int) -> Optional[dict]:
        col_map: dict[str, int] = {}
        for j in range(ws.ncols):
            h = str(ws.cell_value(header_idx, j)).strip().lower()
            if "s no" in h or "sr" in h or "sl" in h:
                col_map["sno"] = j
            elif "value date" in h:
                col_map["date"] = j
            elif "transaction date" in h and "date" not in col_map:
                col_map["date"] = j
            elif "cheque" in h or "chq" in h:
                col_map["reference"] = j
            elif "remark" in h or "description" in h or "narration" in h or "particular" in h:
                col_map["narration"] = j
            elif "withdrawal" in h or "debit" in h:
                col_map["debit"] = j
            elif "deposit" in h or "credit" in h:
                col_map["credit"] = j
            elif "balance" in h:
                col_map["balance"] = j

        if "date" in col_map and "narration" in col_map:
            return col_map
        return None

    def _merge_continuation_rows(self, ws: xlrd.sheet.Sheet, header_idx: int,
                                  col_map: dict) -> list[dict]:
        """Read data rows, merging continuation rows (empty S No.) into the
        previous row's narration."""
        sno_col = col_map.get("sno")
        narr_col = col_map["narration"]
        rows: list[dict] = []

        for i in range(header_idx + 1, ws.nrows):
            # Read all cell values for this row
            row_vals = [ws.cell_value(i, j) for j in range(ws.ncols)]
            cell_types = [ws.cell_type(i, j) for j in range(ws.ncols)]

            # Check if this is a continuation row
            is_continuation = False
            if sno_col is not None:
                sno_val = str(row_vals[sno_col]).strip()
                if sno_val == "" or sno_val == "0" or sno_val == "0.0":
                    is_continuation = True

            if is_continuation and rows:
                # Append narration to previous row
                extra_narration = str(row_vals[narr_col]).strip()
                if extra_narration:
                    rows[-1]["narration"] = rows[-1]["narration"] + " " + extra_narration
            else:
                rows.append({
                    "values": row_vals,
                    "types": cell_types,
                    "narration": str(row_vals[narr_col]).strip() if narr_col < len(row_vals) else "",
                })

        return rows

    def _parse_row(self, row_data: dict, col_map: dict, datemode: int) -> Optional[RawTransaction]:
        try:
            row_vals = row_data["values"]
            cell_types = row_data["types"]

            # Parse date
            date_col = col_map["date"]
            date_val = row_vals[date_col]
            date_type = cell_types[date_col]
            parsed_date = None

            if date_type == xlrd.XL_CELL_DATE and date_val:
                try:
                    dt_tuple = xlrd.xldate_as_tuple(date_val, datemode)
                    from datetime import date
                    parsed_date = date(dt_tuple[0], dt_tuple[1], dt_tuple[2])
                except (ValueError, xlrd.xldate.XLDateError):
                    pass

            if not parsed_date:
                date_str = str(date_val).strip()
                # ICICI XLS uses comma-separated dates like "01,03,2026"
                if "," in date_str:
                    date_str = date_str.replace(",", "/")
                parsed_date = self._parse_date(date_str, [])

            if not parsed_date:
                return None

            narration = row_data["narration"]
            if not narration:
                return None

            debit = self._parse_cell_amount(row_vals[col_map["debit"]]) if "debit" in col_map else None
            credit = self._parse_cell_amount(row_vals[col_map["credit"]]) if "credit" in col_map else None
            balance = self._parse_cell_amount(row_vals[col_map["balance"]]) if "balance" in col_map else None
            reference = None
            if "reference" in col_map:
                ref_val = row_vals[col_map["reference"]]
                if ref_val:
                    reference = str(ref_val).strip() or None

            if credit and credit > 0:
                return RawTransaction(
                    date=parsed_date, narration=narration, amount=credit,
                    tx_type="credit", balance=balance, reference=reference,
                )
            elif debit and debit > 0:
                return RawTransaction(
                    date=parsed_date, narration=narration, amount=debit,
                    tx_type="debit", balance=balance, reference=reference,
                )
            return None
        except (IndexError, TypeError, ValueError):
            return None

    def _parse_cell_amount(self, value) -> Optional[float]:
        """Parse amount from cell - may be float or string like '4522.00'."""
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return round(float(value), 2) if value else None
        return self._parse_amount(str(value))

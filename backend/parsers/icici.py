from typing import Optional
import pdfplumber
import re
from .base import BankStatementParser, RawTransaction


class ICICIParser(BankStatementParser):
    bank_name = "ICICI"

    def can_parse(self, text: str, tables: list) -> bool:
        text_lower = text.lower()
        return "icici bank" in text_lower or "icicibank" in text_lower

    def parse(self, file_path: str, password: Optional[str] = None) -> list[RawTransaction]:
        transactions = []
        open_kwargs = {}
        if password:
            open_kwargs["password"] = password

        with pdfplumber.open(file_path, **open_kwargs) as pdf:
            # Try table extraction first
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

            # Fallback: text-based parsing if table extraction found nothing
            if len(transactions) == 0:
                transactions = self._parse_text_fallback(pdf)

        return transactions

    def _parse_text_fallback(self, pdf) -> list[RawTransaction]:
        """Text-based fallback for ICICI eStatements where narrations span multiple lines."""
        date_pattern = re.compile(r'^(\d{2}-\d{2}-\d{4})\b')
        amount_pattern = re.compile(r'[\d,]+\.\d{2}')

        # Collect all text lines across pages
        all_lines: list[str] = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                for line in text.split('\n'):
                    stripped = line.strip()
                    if stripped:
                        all_lines.append(stripped)

        # Group lines into transaction blocks: each block starts with a date line
        blocks: list[list[str]] = []
        for line in all_lines:
            if date_pattern.match(line):
                blocks.append([line])
            elif blocks:
                # Continuation line belongs to the previous transaction
                blocks[-1].append(line)

        transactions: list[RawTransaction] = []
        prev_balance: Optional[float] = None

        for block in blocks:
            full_text = ' '.join(block)

            # Extract the date from the first line
            date_match = date_pattern.match(block[0])
            if not date_match:
                continue
            parsed_date = self._parse_date(date_match.group(1), [])
            if not parsed_date:
                continue

            # Extract all amounts (comma-formatted decimals) from the full block text
            amounts = amount_pattern.findall(full_text)
            if len(amounts) < 2:
                continue

            # Last amount is balance, second-to-last is the transaction amount
            balance = self._parse_amount(amounts[-1])
            tx_amount = self._parse_amount(amounts[-2])
            if balance is None or tx_amount is None or tx_amount <= 0:
                prev_balance = balance
                continue

            # Build narration: text between the date and the amounts region
            # Remove the date prefix from the first line
            narration_parts = list(block)
            narration_parts[0] = date_pattern.sub('', narration_parts[0]).strip()
            # Remove amount values from the last line to get clean narration
            narration_text = ' '.join(narration_parts).strip()
            for amt_str in amounts:
                narration_text = narration_text.replace(amt_str, '', 1)
            narration_text = re.sub(r'\s{2,}', ' ', narration_text).strip()
            if not narration_text:
                narration_text = "Unknown"

            # Determine deposit vs withdrawal by comparing to previous balance
            if prev_balance is not None:
                tx_type = "credit" if balance > prev_balance else "debit"
            else:
                # No previous balance: check if there are separate deposit/withdrawal columns
                # Heuristic: if there are 3+ amounts, try positional logic
                # Otherwise default based on amount count pattern
                if len(amounts) >= 3:
                    # Typically: deposit amount, withdrawal amount, balance
                    # One of deposit/withdrawal will be the tx_amount
                    dep = self._parse_amount(amounts[-3])
                    if dep and dep == tx_amount:
                        tx_type = "credit"
                    else:
                        tx_type = "debit"
                else:
                    tx_type = "debit"

            transactions.append(RawTransaction(
                date=parsed_date,
                narration=narration_text,
                amount=tx_amount,
                tx_type=tx_type,
                balance=balance,
            ))
            prev_balance = balance

        return transactions

    def _find_header_row(self, table: list) -> Optional[int]:
        for i, row in enumerate(table):
            row_text = " ".join(str(c).lower() for c in row if c)
            if "date" in row_text and ("amount" in row_text or "debit" in row_text or "credit" in row_text):
                return i
        return None

    def _map_columns(self, headers: list[str]) -> Optional[dict]:
        col_map = {}
        for i, h in enumerate(headers):
            if "transaction date" in h or ("date" in h and "value" not in h and "date" not in col_map):
                col_map["date"] = i
            elif "description" in h or "particular" in h or "narration" in h:
                col_map["narration"] = i
            elif "cheque" in h or "ref" in h:
                col_map["reference"] = i
            elif "amount" in h and "amount" not in col_map:
                col_map["amount"] = i  # ICICI sometimes has single amount column with Cr/Dr
            elif "debit" in h or "withdrawal" in h:
                col_map["debit"] = i
            elif "credit" in h or "deposit" in h:
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

            balance = self._parse_amount(str(row[col_map.get("balance", -1)])) if "balance" in col_map else None
            reference = str(row[col_map.get("reference", -1)]).strip() if "reference" in col_map and row[col_map.get("reference", -1)] else None

            # ICICI may have single amount column with Cr/Dr suffix
            if "amount" in col_map and "debit" not in col_map:
                amount_str = str(row[col_map["amount"]]).strip() if row[col_map["amount"]] else ""
                is_credit = bool(re.search(r'cr\.?$', amount_str, re.IGNORECASE))
                amount = self._parse_amount(re.sub(r'\s*(cr|dr)\.?\s*$', '', amount_str, flags=re.IGNORECASE))
                if amount and amount > 0:
                    return RawTransaction(
                        date=parsed_date, narration=narration, amount=amount,
                        tx_type="credit" if is_credit else "debit",
                        balance=balance, reference=reference,
                    )
            else:
                debit = self._parse_amount(str(row[col_map.get("debit", -1)])) if "debit" in col_map else None
                credit = self._parse_amount(str(row[col_map.get("credit", -1)])) if "credit" in col_map else None
                if credit and credit > 0:
                    return RawTransaction(date=parsed_date, narration=narration, amount=credit, tx_type="credit", balance=balance, reference=reference)
                elif debit and debit > 0:
                    return RawTransaction(date=parsed_date, narration=narration, amount=debit, tx_type="debit", balance=balance, reference=reference)
            return None
        except (IndexError, TypeError):
            return None

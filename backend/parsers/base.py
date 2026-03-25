from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class RawTransaction:
    date: date
    narration: str
    amount: float
    tx_type: str  # "credit" or "debit"
    balance: Optional[float] = None
    reference: Optional[str] = None


class BankStatementParser(ABC):
    bank_name: str = "Unknown"

    @abstractmethod
    def can_parse(self, text: str, tables: list) -> bool:
        """Check if this parser can handle the given file content."""
        ...

    @abstractmethod
    def parse(self, file_path: str, password: Optional[str] = None) -> list[RawTransaction]:
        """Extract transactions from the statement."""
        ...

    def _parse_amount(self, value: str) -> Optional[float]:
        """Clean and parse an amount string."""
        if not value or not isinstance(value, str):
            return None
        cleaned = value.strip().replace(",", "").replace("INR", "").replace("Rs.", "").replace("Rs", "").strip()
        if not cleaned or cleaned == "-" or cleaned == "":
            return None
        try:
            return round(float(cleaned), 2)
        except ValueError:
            return None

    def _parse_date(self, value: str, formats: list[str]) -> Optional[date]:
        """Try multiple date formats."""
        from dateutil import parser as dateutil_parser
        if not value or not isinstance(value, str):
            return None
        value = value.strip()
        if not value:
            return None
        try:
            return dateutil_parser.parse(value, dayfirst=True).date()
        except (ValueError, TypeError):
            return None

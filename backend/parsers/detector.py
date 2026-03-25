from typing import Optional
import pdfplumber
from pathlib import Path

from .base import BankStatementParser
from .hdfc import HDFCParser
from .sbi import SBIParser
from .icici import ICICIParser
from .axis import AxisParser
from .kotak import KotakParser
from .csv_generic import CSVGenericParser

ALL_PDF_PARSERS: list[BankStatementParser] = [
    HDFCParser(),
    SBIParser(),
    ICICIParser(),
    AxisParser(),
    KotakParser(),
]


def detect_parser(file_path: str, password: Optional[str] = None) -> BankStatementParser:
    """Auto-detect which bank parser to use based on file content."""
    path = Path(file_path)

    if path.suffix.lower() in (".csv", ".tsv"):
        return CSVGenericParser()

    # PDF detection
    try:
        open_kwargs = {}
        if password:
            open_kwargs["password"] = password

        with pdfplumber.open(file_path, **open_kwargs) as pdf:
            # Extract text from first 2 pages for detection
            text = ""
            tables = []
            for page in pdf.pages[:2]:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
                tables.extend(page.extract_tables() or [])

            for parser in ALL_PDF_PARSERS:
                if parser.can_parse(text, tables):
                    return parser

    except Exception:
        pass

    # Fallback: try HDFC parser (most generic tabular format)
    return HDFCParser()

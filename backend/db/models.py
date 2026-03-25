from pydantic import BaseModel
from decimal import Decimal
from enum import Enum
from typing import Optional
from datetime import date


class TxType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class Category(str, Enum):
    PROFESSIONAL_INCOME = "professional_income"
    INTEREST_INCOME = "interest_income"
    DIVIDEND_INCOME = "dividend_income"
    RENTAL_INCOME = "rental_income"
    OTHER_INCOME = "other_income"
    RENT = "rent"
    INTERNET_PHONE = "internet_phone"
    SOFTWARE_SUBSCRIPTIONS = "software_subscriptions"
    EQUIPMENT = "equipment"
    TRAVEL = "travel"
    PROFESSIONAL_FEES = "professional_fees"
    INSURANCE = "insurance"
    OFFICE_SUPPLIES = "office_supplies"
    MEALS_ENTERTAINMENT = "meals_entertainment"
    PERSONAL = "personal"
    INVESTMENT = "investment"
    TAX_PAYMENT = "tax_payment"
    GST_PAYMENT = "gst_payment"
    TRANSFER = "transfer"
    UNCATEGORIZED = "uncategorized"


class TaxRegime(str, Enum):
    OLD = "old"
    NEW = "new"


class Transaction(BaseModel):
    id: Optional[int] = None
    fy: str
    bank_account_id: Optional[int] = None
    date: str
    narration: str
    amount: float
    tx_type: TxType
    balance: Optional[float] = None
    reference: Optional[str] = None
    category: str = "uncategorized"
    category_confirmed: bool = False
    source_file: Optional[str] = None


class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    category_confirmed: Optional[bool] = None


class BankAccount(BaseModel):
    id: Optional[int] = None
    bank_name: str
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    is_primary: bool = False


class Deduction(BaseModel):
    id: Optional[int] = None
    fy: str
    section: str
    description: Optional[str] = None
    amount: float


class TdsEntry(BaseModel):
    id: Optional[int] = None
    fy: str
    deductor_name: Optional[str] = None
    deductor_tan: Optional[str] = None
    amount_paid: Optional[float] = None
    tds_deducted: Optional[float] = None
    tds_deposited: Optional[float] = None
    section: Optional[str] = None


class FinancialYear(BaseModel):
    fy: str
    regime: TaxRegime = TaxRegime.NEW
    itr_form: str = "ITR-4"


class UploadResponse(BaseModel):
    bank_name: str
    transactions_count: int
    transactions: list[Transaction]
    duplicates_skipped: int = 0


class TaxResult(BaseModel):
    fy: str
    regime: str
    itr_form: str
    gross_professional_income: float
    gross_other_income: float
    gross_total_income: float
    deemed_income: Optional[float] = None  # ITR-4 only
    business_expenses: Optional[float] = None  # ITR-3 only
    total_deductions: float
    taxable_income: float
    tax_on_income: float
    surcharge: float
    cess: float
    total_tax: float
    tds_credit: float
    advance_tax_paid: float
    tax_payable: float
    tax_refund: float


class RegimeComparison(BaseModel):
    old_regime: TaxResult
    new_regime: TaxResult
    recommended: str
    savings: float

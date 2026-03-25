"""Keyword dictionaries for transaction categorization in Indian freelancer context."""

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "professional_income": [
        "razorpay", "paypal", "stripe", "wise", "upwork", "fiverr", "toptal",
        "freelancer", "invoice", "professional fee", "consulting fee",
        "client payment", "service charge",
    ],
    "interest_income": [
        "int on", "interest", "int.pd", "int paid", "fd int", "rd int",
        "interest on fd", "interest on rd", "saving interest",
        "int.on", "sweep interest",
    ],
    "dividend_income": [
        "dividend", "div paid", "interim dividend",
    ],
    "tax_payment": [
        "incometax", "income tax", "tds", "advance tax", "challan",
        "oltas", "tin-nsdl", "self assessment tax", "income-tax",
        "cit", "protest", "nsdl",
    ],
    "gst_payment": [
        "gst pmt", "gstn", "gst challan", "gst payment", "cgst", "sgst", "igst",
    ],
    "investment": [
        "groww", "zerodha", "kuvera", "kfintech", "cams",
        "mf-", "mutual fund", "sip", "nps", "ppf",
        "karvy", "mfutility", "bse star", "edelweiss",
        "smallcase", "coin", "et money", "paytm money",
    ],
    "rent": [
        "rent", "house rent", "landlord", "rental",
    ],
    "internet_phone": [
        "jio", "airtel", "vodafone", "vi ", "bsnl", "act fibernet",
        "hathway", "tata play", "broadband", "internet bill",
    ],
    "software_subscriptions": [
        "github", "aws", "amazon web", "google cloud", "gcp", "azure",
        "figma", "notion", "slack", "zoom", "adobe", "jetbrains",
        "canva", "spotify", "netflix", "hotstar", "youtube premium",
        "microsoft 365", "office 365", "dropbox", "vercel", "heroku",
        "digital ocean", "linode", "cloudflare",
    ],
    "insurance": [
        "lic", "max life", "hdfc life", "icici prudential", "sbi life",
        "star health", "niva bupa", "care health", "insurance",
        "premium", "policy", "mediclaim",
    ],
    "personal": [
        "atm", "cash withdrawal", "swiggy", "zomato", "amazon",
        "flipkart", "myntra", "bigbasket", "blinkit", "dunzo",
        "ola", "uber", "rapido",
    ],
    "transfer": [
        "self transfer", "own account", "ft-", "neft self",
        "imps self", "transfer to self",
    ],
}

# Large NEFT/RTGS credits are likely professional income
LARGE_CREDIT_THRESHOLD = 10000  # INR

# Small UPI debits are likely personal
SMALL_UPI_THRESHOLD = 5000  # INR

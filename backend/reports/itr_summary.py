"""Generate ITR summary PDF report."""

import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)


def generate_itr_summary_pdf(
    profile: dict,
    tax_result: dict,
    comparison: dict,
    income_summary: dict,
    deductions: list[dict],
    tds_entries: list[dict],
) -> bytes:
    """Generate a PDF summarizing the ITR computation."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=20 * mm, bottomMargin=20 * mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18, spaceAfter=6)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, textColor=colors.grey)
    heading_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceBefore=12, spaceAfter=6)
    normal = styles["Normal"]

    elements = []

    # Header
    elements.append(Paragraph("Income Tax Return Summary", title_style))
    fy = tax_result.get("fy", "2025-26")
    regime = tax_result.get("regime", "new").capitalize()
    itr_form = tax_result.get("itr_form", "ITR-4")
    elements.append(Paragraph(f"FY {fy} | {itr_form} | {regime} Regime", subtitle_style))
    elements.append(Spacer(1, 4 * mm))

    # Profile
    pan = profile.get("pan", "—")
    name = profile.get("name", "—")
    elements.append(Paragraph("Taxpayer Details", heading_style))
    profile_data = [
        ["Name", name, "PAN", pan],
        ["DOB", profile.get("dob", "—"), "Mobile", profile.get("mobile", "—")],
        ["Profession", profile.get("profession", "—"), "Email", profile.get("email", "—")],
    ]
    t = Table(profile_data, colWidths=[35 * mm, 55 * mm, 35 * mm, 55 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))

    # Income Summary
    elements.append(Paragraph("Income Summary", heading_style))
    total_income = income_summary.get("total_income", 0)
    total_expenses = income_summary.get("total_expenses", 0)
    income_data = [["Category", "Amount (INR)"]]
    for cat, data in income_summary.get("income_by_category", {}).items():
        income_data.append([cat.replace("_", " ").title(), f"{data['total']:,.0f}"])
    income_data.append(["Total Income", f"{total_income:,.0f}"])

    t = Table(income_data, colWidths=[100 * mm, 60 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))

    # Tax Computation
    elements.append(Paragraph("Tax Computation", heading_style))
    tr = tax_result
    tax_rows = [["Component", "Amount (INR)"]]
    tax_rows.append(["Gross Total Income", f"{tr.get('gross_total_income', 0):,.0f}"])
    if tr.get("deemed_income") is not None:
        tax_rows.append(["Deemed Income (44ADA @ 50%)", f"{tr['deemed_income']:,.0f}"])
    if tr.get("business_expenses") is not None:
        tax_rows.append(["Business Expenses", f"({tr['business_expenses']:,.0f})"])
    tax_rows.append(["Total Deductions", f"({tr.get('total_deductions', 0):,.0f})"])
    tax_rows.append(["Taxable Income", f"{tr.get('taxable_income', 0):,.0f}"])
    tax_rows.append(["Tax on Income", f"{tr.get('tax_on_income', 0):,.0f}"])
    if tr.get("rebate_87a", 0) > 0:
        tax_rows.append(["Rebate u/s 87A", f"({tr['rebate_87a']:,.0f})"])
    if tr.get("surcharge", 0) > 0:
        tax_rows.append(["Surcharge", f"{tr['surcharge']:,.0f}"])
    tax_rows.append(["Health & Education Cess (4%)", f"{tr.get('cess', 0):,.0f}"])
    tax_rows.append(["Total Tax Liability", f"{tr.get('total_tax', 0):,.0f}"])
    if tr.get("tds_credit", 0) > 0:
        tax_rows.append(["Less: TDS Credit", f"({tr['tds_credit']:,.0f})"])
    if tr.get("advance_tax_paid", 0) > 0:
        tax_rows.append(["Less: Advance Tax Paid", f"({tr['advance_tax_paid']:,.0f})"])

    if tr.get("tax_payable", 0) > 0:
        tax_rows.append(["Net Tax Payable", f"{tr['tax_payable']:,.0f}"])
    else:
        tax_rows.append(["Refund Due", f"{tr.get('tax_refund', 0):,.0f}"])

    t = Table(tax_rows, colWidths=[100 * mm, 60 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))

    # Regime comparison
    if comparison:
        elements.append(Paragraph("Regime Comparison", heading_style))
        rec = comparison.get("recommended", "new").capitalize()
        savings = comparison.get("savings", 0)
        old_tax = comparison.get("old_regime", {}).get("total_tax", 0)
        new_tax = comparison.get("new_regime", {}).get("total_tax", 0)
        comp_rows = [
            ["", "Old Regime", "New Regime"],
            ["Total Tax", f"{old_tax:,.0f}", f"{new_tax:,.0f}"],
            ["Recommendation", f"{rec} regime saves INR {savings:,.0f}", ""],
        ]
        t = Table(comp_rows, colWidths=[60 * mm, 50 * mm, 50 * mm])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("SPAN", (1, -1), (2, -1)),
            ("ALIGN", (1, -1), (2, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 4 * mm))

    # TDS Details
    if tds_entries:
        elements.append(Paragraph("TDS Credits", heading_style))
        tds_rows = [["Deductor", "TAN", "Section", "Amount Paid", "TDS"]]
        for t_entry in tds_entries:
            tds_rows.append([
                t_entry.get("deductor_name", "—")[:25],
                t_entry.get("deductor_tan", "—"),
                t_entry.get("section", "—"),
                f"{t_entry.get('amount_paid', 0):,.0f}",
                f"{t_entry.get('tds_deposited', 0):,.0f}",
            ])
        total_tds = sum(e.get("tds_deposited", 0) for e in tds_entries)
        tds_rows.append(["", "", "Total", "", f"{total_tds:,.0f}"])

        t = Table(tds_rows, colWidths=[40 * mm, 28 * mm, 22 * mm, 35 * mm, 35 * mm])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
            ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(t)

    # Deductions
    if deductions:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph("Deductions (Chapter VI-A)", heading_style))
        ded_rows = [["Section", "Description", "Amount"]]
        for d in deductions:
            ded_rows.append([d.get("section", ""), d.get("description", ""), f"{d.get('amount', 0):,.0f}"])
        total_ded = sum(d.get("amount", 0) for d in deductions)
        ded_rows.append(["", "Total", f"{total_ded:,.0f}"])

        t = Table(ded_rows, colWidths=[30 * mm, 90 * mm, 40 * mm])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
            ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(t)

    # Footer
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Generated by FreeFile | For reference only - verify with official ITR form before filing",
                              ParagraphStyle("Footer", parent=normal, fontSize=7, textColor=colors.grey, alignment=1)))

    doc.build(elements)
    return buffer.getvalue()

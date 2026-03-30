"""Capital gains tax computation engine for Indian income tax.

Tax rates (post Budget 2024, FY 2024-25 onwards):
- STCG u/s 111A: 20% (listed equity / equity MF)
- LTCG u/s 112A: 12.5% (listed equity / equity MF, exempt up to 1.25L)
- LTCG u/s 112: 12.5% (other assets like US stocks, no indexation)
- Speculative income: taxed at slab rate
- F&O (non-speculative business): taxed at slab rate

Loss set-off rules:
- STCL can offset STCG + LTCG
- LTCL can only offset LTCG
- Speculative loss only offsets speculative income
- F&O loss offsets any non-speculative income
"""

from .slabs import CESS_RATE


# Tax rates for capital gains (FY 2024-25 onwards)
STCG_111A_RATE = 0.20       # 20% on listed equity STCG
LTCG_112A_RATE = 0.125      # 12.5% on listed equity LTCG
LTCG_112A_EXEMPT = 125_000  # Exempt up to 1.25 lakh
LTCG_112_RATE = 0.125       # 12.5% on other LTCG (US stocks, etc.)


def compute_capital_gains(entries: list[dict], carry_forward_losses: list[dict] | None = None) -> dict:
    """
    Compute capital gains tax from parsed trade entries.

    Args:
        entries: List of trade dicts with keys:
            - gain_loss (float): Realized gain/loss amount
            - gain_type (str): One of STCG_111A, LTCG_112A, LTCG_112,
                               STCG_slab, speculative, fno_business
            - scrip_name (str): Name of the security
        carry_forward_losses: List of dicts with keys:
            - loss_type (str): Type of loss
            - remaining_amount (float): Amount of loss remaining
            - fy_of_loss (str): FY when loss was incurred
            - expires_fy (str): FY when loss expires (8 years from loss year)

    Returns:
        Dict with capital gains breakdown and tax computation.
    """
    # Aggregate gains/losses by type
    stcg_111a_gross = 0.0
    ltcg_112a_gross = 0.0
    ltcg_112_gross = 0.0
    stcg_slab_gross = 0.0
    speculative_gross = 0.0
    fno_gross = 0.0

    for entry in entries:
        gain = entry.get("gain_loss", 0.0) or 0.0
        gain_type = entry.get("gain_type", "")

        if gain_type == "STCG_111A":
            stcg_111a_gross += gain
        elif gain_type == "LTCG_112A":
            ltcg_112a_gross += gain
        elif gain_type == "LTCG_112":
            ltcg_112_gross += gain
        elif gain_type == "STCG_slab":
            stcg_slab_gross += gain
        elif gain_type == "speculative":
            speculative_gross += gain
        elif gain_type == "fno_business":
            fno_gross += gain

    # --- Apply loss set-off rules ---
    # Start with net values
    stcg_111a_net = stcg_111a_gross
    ltcg_112a_net = ltcg_112a_gross
    ltcg_112_net = ltcg_112_gross
    stcg_slab_net = stcg_slab_gross
    speculative_net = speculative_gross
    fno_net = fno_gross

    # Intra-head set-off: losses within capital gains
    # STCL can offset STCG + LTCG
    total_stcl = 0.0
    if stcg_111a_net < 0:
        total_stcl += abs(stcg_111a_net)
        stcg_111a_net = 0.0
    if stcg_slab_net < 0:
        total_stcl += abs(stcg_slab_net)
        stcg_slab_net = 0.0

    # LTCL can only offset LTCG
    total_ltcl = 0.0
    if ltcg_112a_net < 0:
        total_ltcl += abs(ltcg_112a_net)
        ltcg_112a_net = 0.0
    if ltcg_112_net < 0:
        total_ltcl += abs(ltcg_112_net)
        ltcg_112_net = 0.0

    # Set off STCL against remaining STCG first, then LTCG
    if total_stcl > 0:
        # Against STCG 111A
        if stcg_111a_net > 0:
            offset = min(total_stcl, stcg_111a_net)
            stcg_111a_net -= offset
            total_stcl -= offset
        # Against STCG slab
        if total_stcl > 0 and stcg_slab_net > 0:
            offset = min(total_stcl, stcg_slab_net)
            stcg_slab_net -= offset
            total_stcl -= offset
        # Against LTCG 112A
        if total_stcl > 0 and ltcg_112a_net > 0:
            offset = min(total_stcl, ltcg_112a_net)
            ltcg_112a_net -= offset
            total_stcl -= offset
        # Against LTCG 112
        if total_stcl > 0 and ltcg_112_net > 0:
            offset = min(total_stcl, ltcg_112_net)
            ltcg_112_net -= offset
            total_stcl -= offset

    # Set off LTCL against LTCG only
    if total_ltcl > 0:
        if ltcg_112a_net > 0:
            offset = min(total_ltcl, ltcg_112a_net)
            ltcg_112a_net -= offset
            total_ltcl -= offset
        if total_ltcl > 0 and ltcg_112_net > 0:
            offset = min(total_ltcl, ltcg_112_net)
            ltcg_112_net -= offset
            total_ltcl -= offset

    # Speculative loss only offsets speculative income (already net)
    speculative_loss_cf = 0.0
    if speculative_net < 0:
        speculative_loss_cf = abs(speculative_net)
        speculative_net = 0.0

    # F&O loss can offset any non-speculative income (handled in main engine)
    fno_loss_cf = 0.0
    if fno_net < 0:
        fno_loss_cf = abs(fno_net)
        fno_net = 0.0

    # --- Apply carry-forward losses ---
    cf_applied = {}
    if carry_forward_losses:
        for cfl in sorted(carry_forward_losses, key=lambda x: x.get("fy_of_loss", "")):
            loss_type = cfl.get("loss_type", "")
            remaining = cfl.get("remaining_amount", 0.0)
            if remaining <= 0:
                continue

            applied = 0.0
            if loss_type in ("STCG_111A", "STCG_slab", "STCL"):
                # STCL carry-forward can offset STCG + LTCG
                if stcg_111a_net > 0:
                    offset = min(remaining, stcg_111a_net)
                    stcg_111a_net -= offset
                    remaining -= offset
                    applied += offset
                if remaining > 0 and stcg_slab_net > 0:
                    offset = min(remaining, stcg_slab_net)
                    stcg_slab_net -= offset
                    remaining -= offset
                    applied += offset
                if remaining > 0 and ltcg_112a_net > 0:
                    offset = min(remaining, ltcg_112a_net)
                    ltcg_112a_net -= offset
                    remaining -= offset
                    applied += offset
                if remaining > 0 and ltcg_112_net > 0:
                    offset = min(remaining, ltcg_112_net)
                    ltcg_112_net -= offset
                    remaining -= offset
                    applied += offset

            elif loss_type in ("LTCG_112A", "LTCG_112", "LTCL"):
                # LTCL carry-forward only offsets LTCG
                if ltcg_112a_net > 0:
                    offset = min(remaining, ltcg_112a_net)
                    ltcg_112a_net -= offset
                    remaining -= offset
                    applied += offset
                if remaining > 0 and ltcg_112_net > 0:
                    offset = min(remaining, ltcg_112_net)
                    ltcg_112_net -= offset
                    remaining -= offset
                    applied += offset

            elif loss_type == "speculative":
                if speculative_net > 0:
                    offset = min(remaining, speculative_net)
                    speculative_net -= offset
                    remaining -= offset
                    applied += offset

            elif loss_type == "fno_business":
                # F&O carry-forward loss offsets non-speculative income
                if fno_net > 0:
                    offset = min(remaining, fno_net)
                    fno_net -= offset
                    remaining -= offset
                    applied += offset

            if applied > 0:
                cf_applied[cfl.get("fy_of_loss", "unknown")] = applied

    # --- Compute tax on each head ---
    # STCG 111A: 20%
    tax_stcg_111a = round(max(stcg_111a_net, 0) * STCG_111A_RATE, 2)

    # LTCG 112A: 12.5% with 1.25L exemption
    ltcg_112a_taxable = max(ltcg_112a_net - LTCG_112A_EXEMPT, 0)
    tax_ltcg_112a = round(ltcg_112a_taxable * LTCG_112A_RATE, 2)

    # LTCG 112: 12.5% (no exemption)
    tax_ltcg_112 = round(max(ltcg_112_net, 0) * LTCG_112_RATE, 2)

    # Speculative and F&O: taxed at slab rate (added to total income in main engine)
    # We return the net values so the main engine can add them to slab income

    total_cg_tax = round(tax_stcg_111a + tax_ltcg_112a + tax_ltcg_112, 2)

    # Cess on CG tax
    cg_cess = round(total_cg_tax * CESS_RATE, 2)

    # Losses to carry forward (8 years)
    losses_to_carry = []
    if total_stcl > 0:
        losses_to_carry.append({"loss_type": "STCL", "amount": round(total_stcl, 2)})
    if total_ltcl > 0:
        losses_to_carry.append({"loss_type": "LTCL", "amount": round(total_ltcl, 2)})
    if speculative_loss_cf > 0:
        losses_to_carry.append({"loss_type": "speculative", "amount": round(speculative_loss_cf, 2)})
    if fno_loss_cf > 0:
        losses_to_carry.append({"loss_type": "fno_business", "amount": round(fno_loss_cf, 2)})

    return {
        # Gross values
        "stcg_111a_gross": round(stcg_111a_gross, 2),
        "ltcg_112a_gross": round(ltcg_112a_gross, 2),
        "ltcg_112_gross": round(ltcg_112_gross, 2),
        "stcg_slab_gross": round(stcg_slab_gross, 2),
        "speculative_gross": round(speculative_gross, 2),
        "fno_gross": round(fno_gross, 2),

        # Net after set-off
        "stcg_111a": round(stcg_111a_net, 2),
        "ltcg_112a": round(ltcg_112a_net, 2),
        "ltcg_112a_exempt": min(ltcg_112a_net, LTCG_112A_EXEMPT) if ltcg_112a_net > 0 else 0,
        "ltcg_112a_taxable": round(ltcg_112a_taxable, 2),
        "ltcg_112": round(ltcg_112_net, 2),
        "stcg_slab": round(stcg_slab_net, 2),
        "speculative": round(speculative_net, 2),
        "fno_business": round(fno_net, 2),

        # Tax
        "tax_stcg_111a": tax_stcg_111a,
        "tax_ltcg_112a": tax_ltcg_112a,
        "tax_ltcg_112": tax_ltcg_112,
        "total_cg_tax": total_cg_tax,
        "cg_cess": cg_cess,
        "total_cg_tax_with_cess": round(total_cg_tax + cg_cess, 2),

        # Slab-rate income (to be added to total income in main engine)
        "income_at_slab_rate": round(stcg_slab_net + speculative_net + fno_net, 2),

        # Carry forward
        "losses_to_carry": losses_to_carry,
        "carry_forward_applied": cf_applied,
    }

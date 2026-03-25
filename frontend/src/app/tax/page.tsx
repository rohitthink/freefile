"use client";

import { useEffect, useState } from "react";
import { compareRegimes, getDeductions, saveDeduction, deleteDeduction, getAdvanceTaxSchedule, getTdsEntries, saveTdsEntry, getFYSettings, getTransactionSummary, getApiBase } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { RegimeComparison, Deduction, TdsEntry, FYSettings, TransactionSummary } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { DEDUCTION_SECTIONS } from "./deduction-sections";

const API = getApiBase();

const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export default function TaxPage() {
  const [comparison, setComparison] = useState<RegimeComparison | null>(null);
  const [fySettings, setFySettings] = useState<FYSettings | null>(null);
  const [txSummary, setTxSummary] = useState<TransactionSummary | null>(null);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [tdsEntries, setTdsEntries] = useState<TdsEntry[]>([]);
  const [advanceSchedule, setAdvanceSchedule] = useState<{ due_date: string; installment_amount: number; cumulative_amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [showTdsForm, setShowTdsForm] = useState(false);
  const [newDeduction, setNewDeduction] = useState({ section: "80C", description: "", amount: "" });
  const [newTds, setNewTds] = useState({ deductor_name: "", deductor_tan: "", amount_paid: "", tds_deposited: "", section: "194J" });

  // Validation state
  const [deductionErrors, setDeductionErrors] = useState<{ amount?: string }>({});
  const [tdsErrors, setTdsErrors] = useState<{ tds_deposited?: string; deductor_tan?: string; amount_paid?: string }>({});
  const [deductionTouched, setDeductionTouched] = useState<Record<string, boolean>>({});
  const [tdsTouched, setTdsTouched] = useState<Record<string, boolean>>({});

  // Validate deduction form reactively
  useEffect(() => {
    const errors: { amount?: string } = {};
    if (newDeduction.amount !== "") {
      const num = parseFloat(newDeduction.amount);
      if (isNaN(num) || num <= 0) errors.amount = "Amount must be greater than 0";
    }
    setDeductionErrors(errors);
  }, [newDeduction.amount]);

  // Validate TDS form reactively
  useEffect(() => {
    const errors: { tds_deposited?: string; deductor_tan?: string; amount_paid?: string } = {};
    if (newTds.tds_deposited !== "") {
      const num = parseFloat(newTds.tds_deposited);
      if (isNaN(num) || num <= 0) errors.tds_deposited = "TDS must be greater than 0";
    }
    if (newTds.amount_paid !== "") {
      const num = parseFloat(newTds.amount_paid);
      if (isNaN(num) || num <= 0) errors.amount_paid = "Amount must be greater than 0";
    }
    if (newTds.deductor_tan && !TAN_REGEX.test(newTds.deductor_tan)) {
      errors.deductor_tan = "TAN must be format AAAA00000A";
    }
    setTdsErrors(errors);
  }, [newTds.tds_deposited, newTds.deductor_tan, newTds.amount_paid]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comp, ded, tds, adv, fs, txs] = await Promise.all([
        compareRegimes("2025-26") as Promise<RegimeComparison>,
        getDeductions("2025-26") as Promise<{ deductions: Deduction[] }>,
        getTdsEntries("2025-26") as Promise<{ tds_entries: TdsEntry[] }>,
        getAdvanceTaxSchedule("2025-26") as Promise<{ schedule: typeof advanceSchedule }>,
        getFYSettings("2025-26") as Promise<FYSettings>,
        getTransactionSummary("2025-26") as Promise<TransactionSummary>,
      ]);
      setComparison(comp);
      setDeductions(ded.deductions);
      setTdsEntries(tds.tds_entries);
      setAdvanceSchedule(adv.schedule);
      setFySettings(fs);
      setTxSummary(txs);
    } catch {
      // No data
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddDeduction = async () => {
    setDeductionTouched({ amount: true });
    if (!newDeduction.amount) {
      setDeductionErrors({ amount: "Amount is required" });
      return;
    }
    const num = parseFloat(newDeduction.amount);
    if (isNaN(num) || num <= 0) {
      setDeductionErrors({ amount: "Amount must be greater than 0" });
      return;
    }
    await saveDeduction({
      fy: "2025-26",
      section: newDeduction.section,
      description: newDeduction.description,
      amount: num,
    });
    setNewDeduction({ section: "80C", description: "", amount: "" });
    setDeductionTouched({});
    setShowDeductionForm(false);
    loadData();
  };

  const handleDeleteDeduction = async (id: number) => {
    await deleteDeduction(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Tax Computation</h2>

      {/* Regime Comparison */}
      {comparison && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Old vs New Regime Comparison</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              comparison.recommended === "new" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {comparison.recommended === "new" ? "New Regime" : "Old Regime"} saves {formatCurrency(comparison.savings)}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600 font-medium">Component</th>
                <th className="text-right py-2 text-gray-600 font-medium">Old Regime</th>
                <th className="text-right py-2 text-gray-600 font-medium">New Regime</th>
              </tr>
            </thead>
            <tbody>
              <CompRow label="Gross Total Income" old={comparison.old_regime.gross_total_income} new_={comparison.new_regime.gross_total_income} />
              {comparison.old_regime.deemed_income !== null && (
                <CompRow label="Deemed Income (44ADA)" old={comparison.old_regime.deemed_income} new_={comparison.new_regime.deemed_income!} />
              )}
              {comparison.old_regime.business_expenses !== null && (
                <CompRow label="Business Expenses" old={comparison.old_regime.business_expenses} new_={comparison.new_regime.business_expenses!} />
              )}
              <CompRow label="Deductions" old={comparison.old_regime.total_deductions} new_={comparison.new_regime.total_deductions} />
              <CompRow label="Taxable Income" old={comparison.old_regime.taxable_income} new_={comparison.new_regime.taxable_income} bold />
              <CompRow label="Tax on Income" old={comparison.old_regime.tax_on_income} new_={comparison.new_regime.tax_on_income} />
              <CompRow label="Surcharge" old={comparison.old_regime.surcharge} new_={comparison.new_regime.surcharge} />
              <CompRow label="Cess" old={comparison.old_regime.cess} new_={comparison.new_regime.cess} />
              <CompRow label="Total Tax" old={comparison.old_regime.total_tax} new_={comparison.new_regime.total_tax} bold />
              <CompRow label="TDS + Advance Tax" old={comparison.old_regime.tds_credit + comparison.old_regime.advance_tax_paid} new_={comparison.new_regime.tds_credit + comparison.new_regime.advance_tax_paid} />
              <tr className="border-t-2 border-gray-300">
                <td className="py-2 font-bold text-gray-900">Net Payable</td>
                <td className={`text-right py-2 font-bold ${comparison.recommended === "old" ? "text-green-700" : "text-gray-900"}`}>
                  {comparison.old_regime.tax_payable > 0 ? formatCurrency(comparison.old_regime.tax_payable) : `-${formatCurrency(comparison.old_regime.tax_refund)}`}
                </td>
                <td className={`text-right py-2 font-bold ${comparison.recommended === "new" ? "text-green-700" : "text-gray-900"}`}>
                  {comparison.new_regime.tax_payable > 0 ? formatCurrency(comparison.new_regime.tax_payable) : `-${formatCurrency(comparison.new_regime.tax_refund)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ITR-3 Expenses Summary or ITR-4 Info */}
      {fySettings && fySettings.itr_form === "ITR-3" && txSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Expenses Summary (ITR-3)</h3>
          {(() => {
            const businessExpenses = Object.entries(txSummary.expense_by_category)
              .filter(([cat]) => EXPENSE_CATEGORIES.includes(cat))
              .sort(([, a], [, b]) => b.total - a.total);
            const totalBusinessExpenses = businessExpenses.reduce((sum, [, data]) => sum + data.total, 0);
            if (businessExpenses.length === 0) {
              return <p className="text-sm text-gray-500">No business expenses categorized yet. Categorize your transactions to see expense breakdown.</p>;
            }
            return (
              <div className="space-y-2">
                {businessExpenses.map(([cat, data]) => (
                  <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 capitalize">{cat.replace(/_/g, " ")}</span>
                      <span className="text-xs text-gray-400">{data.count} txns</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                  <span className="text-sm font-bold text-gray-900">Total Business Expenses</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(totalBusinessExpenses)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {fySettings && fySettings.itr_form === "ITR-4" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6 flex items-start gap-3">
          <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Presumptive Taxation (44ADA)</p>
            <p className="text-sm text-blue-700 mt-1">Under Section 44ADA, 50% of professional income is deemed as profit. No expense tracking needed for tax computation.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deductions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Deductions (Old Regime)</h3>
            <button onClick={() => setShowDeductionForm(!showDeductionForm)} className="text-sm text-gray-600 hover:text-gray-900">
              + Add
            </button>
          </div>

          {fySettings && fySettings.regime === "new" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 mb-4 flex items-start gap-2">
              <svg className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-800">New regime allows very limited deductions (standard deduction only). These deductions apply only under the old regime for comparison purposes.</p>
            </div>
          )}

          {showDeductionForm && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <select
                value={newDeduction.section}
                onChange={(e) => setNewDeduction({ ...newDeduction, section: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {DEDUCTION_SECTIONS.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.label} (max {s.limit ? formatCurrency(s.limit) : "No limit"})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDeduction.description}
                onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <div>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newDeduction.amount}
                  onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                  onBlur={() => setDeductionTouched((p) => ({ ...p, amount: true }))}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${deductionTouched.amount && deductionErrors.amount ? "border-red-400" : "border-gray-300"}`}
                />
                {deductionTouched.amount && deductionErrors.amount && <p className="text-xs text-red-500 mt-1">{deductionErrors.amount}</p>}
              </div>
              <button onClick={handleAddDeduction} className="w-full px-3 py-1.5 bg-gray-900 text-white rounded text-sm">Save</button>
            </div>
          )}

          {deductions.length === 0 ? (
            <p className="text-sm text-gray-500">No deductions added. Click + Add to claim deductions under old regime.</p>
          ) : (
            <div className="space-y-2">
              {deductions.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{d.section}</span>
                    {d.description && <span className="text-xs text-gray-500 ml-2">{d.description}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(d.amount)}</span>
                    <button onClick={() => handleDeleteDeduction(d.id!)} className="text-xs text-red-500 hover:text-red-700">x</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advance Tax Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Advance Tax Schedule</h3>
          {advanceSchedule.length === 0 ? (
            <p className="text-sm text-gray-500">No advance tax required (tax liability below 10,000 after TDS).</p>
          ) : (
            <div className="space-y-3">
              {advanceSchedule.map((item) => (
                <div key={item.due_date} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">By {item.due_date}</p>
                    <p className="text-xs text-gray-500">Cumulative: {formatCurrency(item.cumulative_amount)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(item.installment_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TDS Credits */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">TDS Credits (Form 26AS)</h3>
          <button onClick={() => setShowTdsForm(!showTdsForm)} className="text-sm text-gray-600 hover:text-gray-900">
            + Add TDS Entry
          </button>
        </div>

        {showTdsForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg grid grid-cols-2 gap-2">
            <input type="text" placeholder="Deductor Name" value={newTds.deductor_name}
              onChange={(e) => setNewTds({ ...newTds, deductor_name: e.target.value })}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm" />
            <div>
              <input type="text" placeholder="TAN" value={newTds.deductor_tan}
                onChange={(e) => setNewTds({ ...newTds, deductor_tan: e.target.value.toUpperCase() })}
                onBlur={() => setTdsTouched((p) => ({ ...p, deductor_tan: true }))}
                className={`w-full px-2 py-1.5 border rounded text-sm font-mono ${tdsTouched.deductor_tan && tdsErrors.deductor_tan ? "border-red-400" : "border-gray-300"}`} />
              {tdsTouched.deductor_tan && tdsErrors.deductor_tan && <p className="text-xs text-red-500 mt-1">{tdsErrors.deductor_tan}</p>}
            </div>
            <div>
              <input type="number" placeholder="Amount Paid/Credited" value={newTds.amount_paid}
                onChange={(e) => setNewTds({ ...newTds, amount_paid: e.target.value })}
                onBlur={() => setTdsTouched((p) => ({ ...p, amount_paid: true }))}
                className={`w-full px-2 py-1.5 border rounded text-sm ${tdsTouched.amount_paid && tdsErrors.amount_paid ? "border-red-400" : "border-gray-300"}`} />
              {tdsTouched.amount_paid && tdsErrors.amount_paid && <p className="text-xs text-red-500 mt-1">{tdsErrors.amount_paid}</p>}
            </div>
            <div>
              <input type="number" placeholder="TDS Deposited" value={newTds.tds_deposited}
                onChange={(e) => setNewTds({ ...newTds, tds_deposited: e.target.value })}
                onBlur={() => setTdsTouched((p) => ({ ...p, tds_deposited: true }))}
                className={`w-full px-2 py-1.5 border rounded text-sm ${tdsTouched.tds_deposited && tdsErrors.tds_deposited ? "border-red-400" : "border-gray-300"}`} />
              {tdsTouched.tds_deposited && tdsErrors.tds_deposited && <p className="text-xs text-red-500 mt-1">{tdsErrors.tds_deposited}</p>}
            </div>
            <select value={newTds.section} onChange={(e) => setNewTds({ ...newTds, section: e.target.value })}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
              <option value="194J">194J - Professional Fees</option>
              <option value="194C">194C - Contractor Payment</option>
              <option value="194H">194H - Commission</option>
              <option value="194A">194A - Interest (non-bank)</option>
              <option value="194I">194I - Rent</option>
              <option value="194O">194O - E-commerce</option>
            </select>
            <button onClick={async () => {
              setTdsTouched({ tds_deposited: true, deductor_tan: true, amount_paid: true });
              const errors: { tds_deposited?: string; deductor_tan?: string; amount_paid?: string } = {};
              if (!newTds.tds_deposited) {
                errors.tds_deposited = "TDS deposited is required";
              } else {
                const num = parseFloat(newTds.tds_deposited);
                if (isNaN(num) || num <= 0) errors.tds_deposited = "TDS must be greater than 0";
              }
              if (newTds.deductor_tan && !TAN_REGEX.test(newTds.deductor_tan)) {
                errors.deductor_tan = "TAN must be format AAAA00000A";
              }
              if (newTds.amount_paid) {
                const num = parseFloat(newTds.amount_paid);
                if (isNaN(num) || num <= 0) errors.amount_paid = "Amount must be greater than 0";
              }
              setTdsErrors(errors);
              if (Object.keys(errors).length > 0) return;

              await saveTdsEntry({
                fy: "2025-26", deductor_name: newTds.deductor_name, deductor_tan: newTds.deductor_tan,
                amount_paid: parseFloat(newTds.amount_paid) || 0, tds_deducted: parseFloat(newTds.tds_deposited) || 0,
                tds_deposited: parseFloat(newTds.tds_deposited) || 0, section: newTds.section,
              });
              setNewTds({ deductor_name: "", deductor_tan: "", amount_paid: "", tds_deposited: "", section: "194J" });
              setTdsTouched({});
              setShowTdsForm(false);
              loadData();
            }} className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm">Save</button>
          </div>
        )}

        {tdsEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No TDS entries. Add entries from your Form 26AS.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 text-gray-600 font-medium">Deductor</th>
                <th className="text-left py-2 text-gray-600 font-medium">Section</th>
                <th className="text-right py-2 text-gray-600 font-medium">Amount Paid</th>
                <th className="text-right py-2 text-gray-600 font-medium">TDS</th>
                <th className="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {tdsEntries.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <p className="text-gray-900">{t.deductor_name || "—"}</p>
                    <p className="text-xs text-gray-400">{t.deductor_tan || ""}</p>
                  </td>
                  <td className="py-2 text-gray-600">{t.section}</td>
                  <td className="py-2 text-right text-gray-700">{formatCurrency(t.amount_paid)}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(t.tds_deposited)}</td>
                  <td className="py-2">
                    <button onClick={async () => {
                      await fetch(`${API}/tax/tds/${t.id}`, { method: "DELETE" });
                      loadData();
                    }} className="text-xs text-red-500 hover:text-red-700">x</button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} className="py-2 font-semibold text-gray-900">Total TDS Credit</td>
                <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(tdsEntries.reduce((sum, t) => sum + t.tds_deposited, 0))}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Export */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            window.open(`${API}/export?fy=2025-26`, "_blank");
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          Export Data (JSON)
        </button>
      </div>
    </div>
  );
}

function CompRow({ label, old, new_, bold }: { label: string; old: number; new_: number; bold?: boolean }) {
  return (
    <tr className="border-b border-gray-100">
      <td className={`py-2 ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</td>
      <td className={`text-right py-2 ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>{formatCurrency(old)}</td>
      <td className={`text-right py-2 ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>{formatCurrency(new_)}</td>
    </tr>
  );
}

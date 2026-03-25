"use client";

import { useEffect, useState } from "react";
import { getTransactionSummary, computeTax, compareRegimes, getFYSettings, getApiBase } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { TransactionSummary, TaxResult, RegimeComparison, FYSettings } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function Dashboard() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [tax, setTax] = useState<TaxResult | null>(null);
  const [comparison, setComparison] = useState<RegimeComparison | null>(null);
  const [fySettings, setFySettings] = useState<FYSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, t, c, fs] = await Promise.all([
          getTransactionSummary("2025-26") as Promise<TransactionSummary>,
          computeTax("2025-26") as Promise<TaxResult>,
          compareRegimes("2025-26") as Promise<RegimeComparison>,
          getFYSettings("2025-26") as Promise<FYSettings>,
        ]);
        setSummary(s);
        setTax(t);
        setComparison(c);
        setFySettings(fs);
      } catch {
        // No data yet
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const hasData = summary && summary.total_income > 0;

  // Prepare chart data
  const monthlyData = summary
    ? Object.entries(summary.monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: month.split("-").pop(),
          income: Math.round(data.income),
          expenses: Math.round(data.expenses),
        }))
    : [];

  const incomePieData = summary
    ? Object.entries(summary.income_by_category).map(([cat, data]) => ({
        name: cat.replace(/_/g, " "),
        value: Math.round(data.total),
      }))
    : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No data yet</h3>
          <p className="mt-2 text-sm text-gray-500">Upload your bank statements to get started.</p>
          <a href="/upload" className="mt-4 inline-block px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">
            Upload Statement
          </a>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card title="Total Income" value={formatCurrency(summary!.total_income)} color="green" />
            <Card title="Total Expenses" value={formatCurrency(summary!.total_expenses)} color="red" />
            <Card title="Tax Payable" value={tax ? formatCurrency(tax.tax_payable) : "--"} color="orange" />
            <Card title="Effective Rate" value={tax && tax.gross_total_income > 0 ? `${((tax.total_tax / tax.gross_total_income) * 100).toFixed(1)}%` : "--"} color="blue" />
          </div>

          {/* Regime recommendation banner */}
          {comparison && comparison.savings > 0 && (
            <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between ${
              comparison.recommended === "new" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"
            }`}>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {comparison.recommended === "new" ? "New" : "Old"} tax regime saves you {formatCurrency(comparison.savings)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Old: {formatCurrency(comparison.old_regime.tax_payable)} vs New: {formatCurrency(comparison.new_regime.tax_payable)}
                </p>
              </div>
              <a href="/tax" className="text-sm font-medium text-gray-700 hover:text-gray-900 underline">
                View details →
              </a>
            </div>
          )}

          {/* Download PDF Report */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => window.open(`${getApiBase()}/report/pdf?fy=2025-26`, "_blank")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Report
            </button>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Income vs Expenses Bar Chart */}
            {monthlyData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Income Sources Pie Chart */}
            {incomePieData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Income Sources</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      label={(props) => {
                        const name = props.name ?? "";
                        const percent = props.percent ?? 0;
                        return `${name} ${(percent * 100).toFixed(0)}%`;
                      }}
                      labelLine={false}
                    >
                      {incomePieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => <span className="text-xs text-gray-600 capitalize">{value}</span>}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tax Breakdown + Category Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tax Breakdown ({tax?.regime === "new" ? "New" : "Old"} Regime)</h3>
              {tax && (
                <div className="space-y-2">
                  <Row label="Gross Income" value={formatCurrency(tax.gross_total_income)} />
                  {tax.deemed_income !== null && <Row label="Deemed Income (44ADA)" value={formatCurrency(tax.deemed_income)} />}
                  {tax.business_expenses !== null && <Row label="Business Expenses" value={`-${formatCurrency(tax.business_expenses)}`} />}
                  <Row label="Deductions" value={`-${formatCurrency(tax.total_deductions)}`} />
                  <Row label="Taxable Income" value={formatCurrency(tax.taxable_income)} bold />
                  <Row label="Tax on Income" value={formatCurrency(tax.tax_on_income)} />
                  {tax.surcharge > 0 && <Row label="Surcharge" value={formatCurrency(tax.surcharge)} />}
                  <Row label="Cess (4%)" value={formatCurrency(tax.cess)} />
                  <Row label="Total Tax" value={formatCurrency(tax.total_tax)} bold />
                  {tax.tds_credit > 0 && <Row label="TDS Credit" value={`-${formatCurrency(tax.tds_credit)}`} />}
                  {tax.advance_tax_paid > 0 && <Row label="Advance Tax Paid" value={`-${formatCurrency(tax.advance_tax_paid)}`} />}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    {tax.tax_payable > 0 ? (
                      <Row label="Tax Payable" value={formatCurrency(tax.tax_payable)} bold />
                    ) : (
                      <Row label="Refund Due" value={formatCurrency(tax.tax_refund)} bold />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              {summary && Object.keys(summary.expense_by_category).length > 0 ? (
                Object.entries(summary.expense_by_category)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cat, data]) => (
                    <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 capitalize">{cat.replace(/_/g, " ")}</span>
                        <span className="text-xs text-gray-400">{data.count} txns</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(data.total)}</span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-500">No categorized expenses yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50",
    blue: "border-blue-200 bg-blue-50",
  };
  return (
    <div className={`rounded-xl border p-6 ${colors[color] || "bg-white border-gray-200"}`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}

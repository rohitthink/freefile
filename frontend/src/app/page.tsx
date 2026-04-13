"use client";

import { useEffect, useState, useRef } from "react";
import {
  getTransactionSummary,
  computeTax,
  compareRegimes,
  getFYSettings,
  getApiBase,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type {
  TransactionSummary,
  TaxResult,
  RegimeComparison,
  FYSettings,
} from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
];

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    const startVal = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value]);

  return (
    <span>
      {prefix}
      {new Intl.NumberFormat("en-IN").format(display)}
    </span>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [tax, setTax] = useState<TaxResult | null>(null);
  const [comparison, setComparison] = useState<RegimeComparison | null>(null);
  const [fySettings, setFySettings] = useState<FYSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const userName = useAppStore((s) => s.userName);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const hasData = summary && summary.total_income > 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = mounted && userName ? userName.split(" ")[0] : "";

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
    <div className="animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
<h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-200">
          {greeting()}
          {displayName ? `, ${displayName}` : ""}
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          FY 2025-26 | {fySettings?.regime === "old" ? "Old" : "New"} Regime |{" "}
          {fySettings?.itr_form || "ITR-4"}
        </p>
      </div>

      {!hasData ? (
        <div className="glass-card rounded-2xl p-16 text-center max-w-lg mx-auto animate-slide-up">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">No data yet</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Upload your bank statements to see your income, expenses, and tax
            calculations.
          </p>
          <a
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Upload Statement
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 stagger-children">
            <StatCard
              title="Total Income"
              value={summary!.total_income}
              icon={<TrendingUp className="w-5 h-5" />}
              gradient="from-emerald-500 to-green-600"
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-600"
            />
            <StatCard
              title="Total Expenses"
              value={summary!.total_expenses}
              icon={<TrendingDown className="w-5 h-5" />}
              gradient="from-rose-500 to-red-600"
              iconBg="bg-rose-500/10"
              iconColor="text-rose-600"
            />
            <StatCard
              title="Tax Payable"
              value={tax ? tax.tax_payable : 0}
              icon={<Calculator className="w-5 h-5" />}
              gradient="from-sky-500 to-blue-600"
              iconBg="bg-sky-500/10"
              iconColor="text-sky-600"
            />
            <StatCard
              title="Effective Rate"
              value={
                tax && tax.gross_total_income > 0
                  ? Math.round(
                      (tax.total_tax / tax.gross_total_income) * 100 * 10
                    ) / 10
                  : 0
              }
              suffix="%"
              icon={<FileText className="w-5 h-5" />}
              gradient="from-blue-500 to-blue-600"
              iconBg="bg-blue-500/10"
              iconColor="text-blue-600"
              noPrefix
            />
          </div>

          {/* Regime recommendation */}
          {comparison && comparison.savings > 0 && (
            <div className="glass-card rounded-2xl p-5 mb-6 flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Switch to{" "}
                    {comparison.recommended === "new" ? "New" : "Old"} Regime to
                    save {formatCurrency(comparison.savings)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Old: {formatCurrency(comparison.old_regime.tax_payable)} vs
                    New: {formatCurrency(comparison.new_regime.tax_payable)}
                  </p>
                </div>
              </div>
              <a
                href="/tax"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Details
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Upload Statement", href: "/upload", icon: Upload },
              { label: "View Transactions", href: "/transactions", icon: FileText },
              { label: "Capital Gains", href: "/capital-gains", icon: TrendingUp },
              {
                label: "Download Report",
                href: "#",
                icon: FileText,
                onClick: () =>
                  window.open(
                    `${getApiBase()}/report/pdf?fy=2025-26`,
                    "_blank"
                  ),
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  onClick={action.onClick}
                  className="glass-card rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.02] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {monthlyData.length > 0 && (
              <div className="glass-card rounded-2xl p-6 animate-slide-up">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Monthly Income vs Expenses
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} barGap={2}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 100000
                          ? `${(v / 100000).toFixed(0)}L`
                          : v >= 1000
                            ? `${(v / 1000).toFixed(0)}K`
                            : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        fontSize: 13,
                      }}
                    />
                    <Bar
                      dataKey="income"
                      fill="#22c55e"
                      radius={[6, 6, 0, 0]}
                      name="Income"
                    />
                    <Bar
                      dataKey="expenses"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                      name="Expenses"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {incomePieData.length > 0 && (
              <div className="glass-card rounded-2xl p-6 animate-slide-up">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Income Sources
                </h3>
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
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-slate-600 capitalize">
                          {value}
                        </span>
                      )}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tax Breakdown + Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Tax Breakdown (
                {tax?.regime === "new" ? "New" : "Old"} Regime)
              </h3>
              {tax && (
                <div className="space-y-2.5">
                  <TaxRow
                    label="Gross Income"
                    value={formatCurrency(tax.gross_total_income)}
                  />
                  {tax.deemed_income !== null && (
                    <TaxRow
                      label="Deemed Income (44ADA)"
                      value={formatCurrency(tax.deemed_income)}
                    />
                  )}
                  {tax.business_expenses !== null && (
                    <TaxRow
                      label="Business Expenses"
                      value={`-${formatCurrency(tax.business_expenses)}`}
                    />
                  )}
                  <TaxRow
                    label="Deductions"
                    value={`-${formatCurrency(tax.total_deductions)}`}
                  />
                  <TaxRow
                    label="Taxable Income"
                    value={formatCurrency(tax.taxable_income)}
                    bold
                  />
                  <TaxRow
                    label="Tax on Income"
                    value={formatCurrency(tax.tax_on_income)}
                  />
                  {tax.surcharge > 0 && (
                    <TaxRow
                      label="Surcharge"
                      value={formatCurrency(tax.surcharge)}
                    />
                  )}
                  <TaxRow
                    label="Cess (4%)"
                    value={formatCurrency(tax.cess)}
                  />
                  <TaxRow
                    label="Total Tax"
                    value={formatCurrency(tax.total_tax)}
                    bold
                  />
                  {tax.tds_credit > 0 && (
                    <TaxRow
                      label="TDS Credit"
                      value={`-${formatCurrency(tax.tds_credit)}`}
                    />
                  )}
                  {tax.advance_tax_paid > 0 && (
                    <TaxRow
                      label="Advance Tax Paid"
                      value={`-${formatCurrency(tax.advance_tax_paid)}`}
                    />
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    {tax.tax_payable > 0 ? (
                      <TaxRow
                        label="Tax Payable"
                        value={formatCurrency(tax.tax_payable)}
                        bold
                      />
                    ) : (
                      <TaxRow
                        label="Refund Due"
                        value={formatCurrency(tax.tax_refund)}
                        bold
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Expense Breakdown
              </h3>
              {summary &&
              Object.keys(summary.expense_by_category).length > 0 ? (
                Object.entries(summary.expense_by_category)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cat, data]) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 capitalize">
                          {cat.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {data.count} txns
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(data.total)}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-slate-500">
                  No categorized expenses yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  iconBg,
  iconColor,
  suffix,
  noPrefix,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  iconColor: string;
  suffix?: string;
  noPrefix?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {noPrefix ? (
          <>
            <AnimatedNumber value={value} />
            {suffix}
          </>
        ) : (
          <>
            <AnimatedNumber value={value} prefix="₹" />
            {suffix}
          </>
        )}
      </p>
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
    </div>
  );
}

function TaxRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-600"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}
      >
        {value}
      </span>
    </div>
  );
}

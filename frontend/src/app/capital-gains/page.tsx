"use client";

import { useEffect, useState } from "react";
import { getCapitalGains } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CapitalGainsSummary } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  AlertCircle,
  Upload,
  ArrowRight,
} from "lucide-react";

type SortField = "symbol" | "gain" | "sell_date" | "sell_value";
type SortDir = "asc" | "desc";

export default function CapitalGainsPage() {
  const [data, setData] = useState<CapitalGainsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortField, setSortField] = useState<SortField>("gain");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function load() {
      try {
        const result = (await getCapitalGains("2025-26")) as CapitalGainsSummary;
        setData(result);
      } catch {
        setError("No capital gains data found. Upload your trading reports first.");
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
          Capital Gains
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          FY 2025-26 capital gains from equity, F&O, and other investments.
        </p>
        <div className="glass-card rounded-2xl p-16 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            No capital gains data
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Upload your trading P&L reports from Zerodha, Groww, or INDmoney to
            see your capital gains breakdown.
          </p>
          <a
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Upload Trading Report
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "STCG 111A",
      value: data.stcg_111a,
      desc: "Listed equity (15%)",
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "LTCG 112A",
      value: data.ltcg_112a,
      desc: "Listed equity (12.5%)",
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "LTCG 112",
      value: data.ltcg_112,
      desc: "Other assets (20%)",
      color: "from-purple-500 to-violet-600",
    },
    {
      label: "STCG Slab",
      value: data.stcg_slab,
      desc: "At slab rate",
      color: "from-amber-500 to-orange-600",
    },
    {
      label: "F&O",
      value: data.fno,
      desc: "Business income",
      color: "from-rose-500 to-red-600",
    },
    {
      label: "Speculative",
      value: data.speculative,
      desc: "Intraday trading",
      color: "from-cyan-500 to-blue-600",
    },
  ];

  const sortedTrades = [...(data.trades || [])].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "symbol") return mul * a.symbol.localeCompare(b.symbol);
    if (sortField === "gain") return mul * (a.gain - b.gain);
    if (sortField === "sell_date")
      return mul * a.sell_date.localeCompare(b.sell_date);
    if (sortField === "sell_value")
      return mul * (a.sell_value - b.sell_value);
    return 0;
  });

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
        Capital Gains
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        FY 2025-26 capital gains from equity, F&O, and other investments.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 stagger-children">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="glass-card rounded-2xl p-4 hover:scale-[1.02] transition-all"
          >
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p
              className={`text-lg font-bold mt-1 ${card.value >= 0 ? "text-gray-900" : "text-red-600"}`}
            >
              {formatCurrency(card.value)}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">{card.desc}</p>
            <div
              className={`mt-2 h-0.5 rounded-full bg-gradient-to-r ${card.color} opacity-50`}
            />
          </div>
        ))}
      </div>

      {/* Dividends */}
      {data.dividends > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Dividend Income: {formatCurrency(data.dividends)}
            </p>
            <p className="text-xs text-gray-500">
              Taxable under &quot;Income from Other Sources&quot;
            </p>
          </div>
        </div>
      )}

      {/* Loss Set-off & Carry Forward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.keys(data.loss_setoff).length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Loss Set-off
            </h3>
            <div className="space-y-2">
              {Object.entries(data.loss_setoff).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(Math.abs(value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(data.carry_forward).length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue-500" />
              Carry-Forward Losses
            </h3>
            <div className="space-y-2">
              {Object.entries(data.carry_forward).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trades Table */}
      {sortedTrades.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 pb-3">
            <h3 className="font-semibold text-gray-900">
              Individual Trades ({sortedTrades.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort("symbol")}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      Symbol
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy Date
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort("sell_date")}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      Sell Date
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy Value
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSort("sell_value")}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 ml-auto"
                    >
                      Sell Value
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <button
                      onClick={() => toggleSort("gain")}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 ml-auto"
                    >
                      Gain/Loss
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((trade, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          trade.type.includes("LTCG")
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(trade.buy_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(trade.sell_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(trade.buy_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(trade.sell_value)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-medium ${
                        trade.gain >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {trade.gain >= 0 ? "+" : ""}
                      {formatCurrency(trade.gain)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

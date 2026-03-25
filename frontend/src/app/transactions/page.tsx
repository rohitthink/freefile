"use client";

import { useEffect, useState } from "react";
import { getTransactions, updateTransaction, bulkUpdateTransactions } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", tx_type: "", search: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter.category) params.category = filter.category;
      if (filter.tx_type) params.tx_type = filter.tx_type;
      if (filter.search) params.search = filter.search;
      const res = await getTransactions("2025-26", params) as { transactions: Transaction[]; total: number };
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch {
      // Error loading
    }
    setLoading(false);
  };

  useEffect(() => { loadTransactions(); }, [filter.category, filter.tx_type]);

  const handleCategoryChange = async (id: number, category: string) => {
    await updateTransaction(id, { category, category_confirmed: true });
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, category, category_confirmed: true } : tx))
    );
    setEditingId(null);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((tx) => tx.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkCategory("");
  };

  const handleBulkUpdate = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const updates = Array.from(selectedIds).map((id) => ({ id, category: bulkCategory }));
      await bulkUpdateTransactions(updates);
      await loadTransactions();
      clearSelection();
    } catch {
      // Error during bulk update
    }
    setBulkUpdating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <span className="text-sm text-gray-500">{total} transactions</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filter.tx_type}
          onChange={(e) => setFilter({ ...filter, tx_type: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="credit">Credits (Income)</option>
          <option value="debit">Debits (Expenses)</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search narration..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && loadTransactions()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button onClick={loadTransactions} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">
          Search
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} transaction{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">Select category...</option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleBulkUpdate}
            disabled={!bulkCategory || bulkUpdating}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkUpdating ? "Updating..." : "Update Category"}
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
          >
            Clear Selection
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mb-4">Tip: Confirmed categories (green) create auto-categorization rules for future imports.</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No transactions found. <a href="/upload" className="underline">Upload a statement</a> to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.size === transactions.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Narration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(tx.id) ? "bg-gray-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={tx.narration}>{tx.narration}</td>
                  <td className="px-4 py-3">
                    {editingId === tx.id ? (
                      <select
                        defaultValue={tx.category}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      >
                        {Object.entries(CATEGORIES).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(tx.id)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.category_confirmed
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {CATEGORIES[tx.category] || tx.category}
                      </button>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                    tx.tx_type === "credit" ? "text-green-700" : "text-red-600"
                  }`}>
                    {tx.tx_type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

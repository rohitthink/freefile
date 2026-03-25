"use client";

import { useEffect, useState } from "react";
import { getCategoryOverrides, addCategoryOverride, deleteCategoryOverride } from "@/lib/api";
import { CATEGORIES } from "@/lib/types";

interface Override {
  narration_pattern: string;
  category: string;
}

export default function CategoriesPage() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const loadOverrides = async () => {
    setLoading(true);
    try {
      const res = await getCategoryOverrides();
      setOverrides(res.overrides);
    } catch {
      setError("Failed to load overrides");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const handleAdd = async () => {
    if (!newPattern.trim() || !newCategory) {
      setError("Both pattern and category are required");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await addCategoryOverride(newPattern.trim(), newCategory);
      setNewPattern("");
      setNewCategory("");
      await loadOverrides();
    } catch {
      setError("Failed to add override");
    }
    setAdding(false);
  };

  const handleDelete = async (pattern: string) => {
    try {
      await deleteCategoryOverride(pattern);
      setOverrides((prev) => prev.filter((o) => o.narration_pattern !== pattern));
    } catch {
      setError("Failed to delete override");
    }
  };

  const filtered = search
    ? overrides.filter(
        (o) =>
          o.narration_pattern.toLowerCase().includes(search.toLowerCase()) ||
          (CATEGORIES[o.category] || o.category).toLowerCase().includes(search.toLowerCase())
      )
    : overrides;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Category Overrides</h2>
        <span className="text-sm text-gray-500">{overrides.length} rules</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Override rules automatically assign categories to transactions whose narration matches a pattern.
      </p>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Add Rule Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Rule</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Narration pattern (e.g. &quot;razorpay payment&quot;)"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">Select category...</option>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Rule"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {overrides.length === 0
              ? "No override rules yet. Add one above, or confirm a category on a transaction to create one automatically."
              : "No rules match your filter."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Narration Pattern</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.narration_pattern} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-mono text-xs">{o.narration_pattern}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {CATEGORIES[o.category] || o.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(o.narration_pattern)}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
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

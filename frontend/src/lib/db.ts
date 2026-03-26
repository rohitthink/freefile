/**
 * On-device data layer abstraction.
 *
 * Provides a unified interface for data access that works on both web (via the
 * existing Python API) and native mobile (via Capacitor SQLite, to be added).
 *
 * Usage:
 *   const dl = getDataLayer();
 *   const { transactions } = await dl.getTransactions('2025-26');
 */

import type {
  Transaction,
  Deduction,
  TdsEntry,
  FYSettings,
  TransactionSummary,
} from "./types";
import * as api from "./api";
import { isNativePlatform } from "./platform";

// ---------------------------------------------------------------------------
// DataLayer interface
// ---------------------------------------------------------------------------

/** Interface that both web (API) and native (SQLite) implementations fulfill. */
export interface DataLayer {
  // Transactions
  getTransactions(
    fy: string,
    params?: Record<string, string>,
  ): Promise<{ transactions: Transaction[]; total: number }>;
  insertTransactions(
    transactions: Omit<Transaction, "id">[],
  ): Promise<{ count: number }>;
  updateTransaction(
    id: number,
    data: { category?: string; category_confirmed?: boolean },
  ): Promise<void>;
  bulkUpdateTransactions(
    updates: { id: number; category: string }[],
  ): Promise<{ count: number }>;
  getTransactionSummary(fy: string): Promise<TransactionSummary>;

  // Tax data
  getDeductions(fy: string): Promise<{ deductions: Deduction[] }>;
  saveDeduction(deduction: {
    fy: string;
    section: string;
    description?: string;
    amount: number;
  }): Promise<void>;
  deleteDeduction(id: number): Promise<void>;
  getTdsEntries(fy: string): Promise<{ tds_entries: TdsEntry[] }>;
  saveTdsEntry(entry: Record<string, unknown>): Promise<void>;
  deleteTdsEntry(id: number): Promise<void>;

  // Settings
  getFYSettings(fy: string): Promise<FYSettings>;
  updateFYSettings(settings: FYSettings): Promise<void>;

  // Profile
  getProfile(): Promise<Record<string, unknown>>;
  updateProfile(profile: Record<string, unknown>): Promise<void>;

  // Category overrides
  getCategoryOverrides(): Promise<{
    overrides: { narration_pattern: string; category: string }[];
  }>;
  addCategoryOverride(pattern: string, category: string): Promise<void>;
  deleteCategoryOverride(pattern: string): Promise<void>;

  // Export
  exportData(fy: string): Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Web implementation — delegates every call to the existing Python API
// ---------------------------------------------------------------------------

class WebDataLayer implements DataLayer {
  async getTransactions(
    fy: string,
    params?: Record<string, string>,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    return api.getTransactions(fy, params) as Promise<{
      transactions: Transaction[];
      total: number;
    }>;
  }

  async insertTransactions(
    _transactions: Omit<Transaction, "id">[],
  ): Promise<{ count: number }> {
    // On web the upload endpoint handles insertion; direct insert is not
    // exposed via the REST API. This is a no-op placeholder so the interface
    // is satisfied — native will use SQLite INSERT directly.
    throw new Error(
      "insertTransactions is not supported on web. Use the upload endpoint.",
    );
  }

  async updateTransaction(
    id: number,
    data: { category?: string; category_confirmed?: boolean },
  ): Promise<void> {
    await api.updateTransaction(id, data);
  }

  async bulkUpdateTransactions(
    updates: { id: number; category: string }[],
  ): Promise<{ count: number }> {
    return api.bulkUpdateTransactions(updates) as Promise<{ count: number }>;
  }

  async getTransactionSummary(fy: string): Promise<TransactionSummary> {
    return api.getTransactionSummary(fy) as Promise<TransactionSummary>;
  }

  // -- Tax data -------------------------------------------------------------

  async getDeductions(fy: string): Promise<{ deductions: Deduction[] }> {
    return api.getDeductions(fy) as Promise<{ deductions: Deduction[] }>;
  }

  async saveDeduction(deduction: {
    fy: string;
    section: string;
    description?: string;
    amount: number;
  }): Promise<void> {
    await api.saveDeduction(deduction);
  }

  async deleteDeduction(id: number): Promise<void> {
    await api.deleteDeduction(id);
  }

  async getTdsEntries(fy: string): Promise<{ tds_entries: TdsEntry[] }> {
    return api.getTdsEntries(fy) as Promise<{ tds_entries: TdsEntry[] }>;
  }

  async saveTdsEntry(entry: Record<string, unknown>): Promise<void> {
    await api.saveTdsEntry(entry);
  }

  async deleteTdsEntry(_id: number): Promise<void> {
    // The current REST API does not expose a TDS delete endpoint.
    // TODO: Add DELETE /api/tax/tds/:id to the backend, then wire here.
    throw new Error("deleteTdsEntry is not yet implemented on the web API.");
  }

  // -- Settings -------------------------------------------------------------

  async getFYSettings(fy: string): Promise<FYSettings> {
    return api.getFYSettings(fy) as Promise<FYSettings>;
  }

  async updateFYSettings(settings: FYSettings): Promise<void> {
    await api.updateFYSettings(settings);
  }

  // -- Profile --------------------------------------------------------------

  async getProfile(): Promise<Record<string, unknown>> {
    // Profile endpoints exist in the backend but aren't yet in api.ts.
    // Use fetchAPI directly via the api base URL.
    const base = api.getApiBase();
    const res = await fetch(`${base}/profile`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json() as Promise<Record<string, unknown>>;
  }

  async updateProfile(profile: Record<string, unknown>): Promise<void> {
    const base = api.getApiBase();
    const res = await fetch(`${base}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error("Failed to update profile");
  }

  // -- Category overrides ---------------------------------------------------

  async getCategoryOverrides(): Promise<{
    overrides: { narration_pattern: string; category: string }[];
  }> {
    return api.getCategoryOverrides();
  }

  async addCategoryOverride(
    pattern: string,
    category: string,
  ): Promise<void> {
    await api.addCategoryOverride(pattern, category);
  }

  async deleteCategoryOverride(pattern: string): Promise<void> {
    await api.deleteCategoryOverride(pattern);
  }

  // -- Export ---------------------------------------------------------------

  async exportData(fy: string): Promise<Record<string, unknown>> {
    const base = api.getApiBase();
    const res = await fetch(`${base}/tax/export?fy=${fy}`);
    if (!res.ok) throw new Error("Failed to export data");
    return res.json() as Promise<Record<string, unknown>>;
  }
}

// ---------------------------------------------------------------------------
// Native (Capacitor SQLite) implementation — placeholder
// ---------------------------------------------------------------------------

class NativeDataLayer implements DataLayer {
  // TODO: Initialize Capacitor SQLite plugin
  // import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
  // private sqlite: SQLiteConnection;
  // private db: SQLiteDBConnection;

  // TODO: On init, run the same schema as backend/db/database.py (CREATE TABLE IF NOT EXISTS ...)

  async getTransactions(
    _fy: string,
    _params?: Record<string, string>,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    // TODO: SELECT * FROM transactions WHERE fy = ? with pagination/filters
    throw new Error("NativeDataLayer not yet implemented");
  }

  async insertTransactions(
    _transactions: Omit<Transaction, "id">[],
  ): Promise<{ count: number }> {
    // TODO: Batch INSERT INTO transactions (...)
    throw new Error("NativeDataLayer not yet implemented");
  }

  async updateTransaction(
    _id: number,
    _data: { category?: string; category_confirmed?: boolean },
  ): Promise<void> {
    // TODO: UPDATE transactions SET category = ?, category_confirmed = ? WHERE id = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async bulkUpdateTransactions(
    _updates: { id: number; category: string }[],
  ): Promise<{ count: number }> {
    // TODO: Batch UPDATE in a transaction
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getTransactionSummary(_fy: string): Promise<TransactionSummary> {
    // TODO: Aggregate queries for income/expense by category and month
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getDeductions(_fy: string): Promise<{ deductions: Deduction[] }> {
    // TODO: SELECT * FROM deductions WHERE fy = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async saveDeduction(_deduction: {
    fy: string;
    section: string;
    description?: string;
    amount: number;
  }): Promise<void> {
    // TODO: INSERT OR REPLACE INTO deductions
    throw new Error("NativeDataLayer not yet implemented");
  }

  async deleteDeduction(_id: number): Promise<void> {
    // TODO: DELETE FROM deductions WHERE id = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getTdsEntries(_fy: string): Promise<{ tds_entries: TdsEntry[] }> {
    // TODO: SELECT * FROM tds_entries WHERE fy = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async saveTdsEntry(_entry: Record<string, unknown>): Promise<void> {
    // TODO: INSERT OR REPLACE INTO tds_entries
    throw new Error("NativeDataLayer not yet implemented");
  }

  async deleteTdsEntry(_id: number): Promise<void> {
    // TODO: DELETE FROM tds_entries WHERE id = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getFYSettings(_fy: string): Promise<FYSettings> {
    // TODO: SELECT * FROM financial_years WHERE fy = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async updateFYSettings(_settings: FYSettings): Promise<void> {
    // TODO: INSERT OR REPLACE INTO financial_years
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getProfile(): Promise<Record<string, unknown>> {
    // TODO: SELECT * FROM profile WHERE id = 1
    throw new Error("NativeDataLayer not yet implemented");
  }

  async updateProfile(_profile: Record<string, unknown>): Promise<void> {
    // TODO: UPDATE profile SET ... WHERE id = 1
    throw new Error("NativeDataLayer not yet implemented");
  }

  async getCategoryOverrides(): Promise<{
    overrides: { narration_pattern: string; category: string }[];
  }> {
    // TODO: SELECT * FROM category_overrides
    throw new Error("NativeDataLayer not yet implemented");
  }

  async addCategoryOverride(
    _pattern: string,
    _category: string,
  ): Promise<void> {
    // TODO: INSERT OR REPLACE INTO category_overrides
    throw new Error("NativeDataLayer not yet implemented");
  }

  async deleteCategoryOverride(_pattern: string): Promise<void> {
    // TODO: DELETE FROM category_overrides WHERE narration_pattern = ?
    throw new Error("NativeDataLayer not yet implemented");
  }

  async exportData(_fy: string): Promise<Record<string, unknown>> {
    // TODO: Gather all tables for the FY into a single JSON object
    throw new Error("NativeDataLayer not yet implemented");
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _instance: DataLayer | null = null;

/** Returns the appropriate DataLayer for the current platform. */
export function getDataLayer(): DataLayer {
  if (!_instance) {
    _instance = isNativePlatform() ? new NativeDataLayer() : new WebDataLayer();
  }
  return _instance;
}

export function getApiBase(): string {
  if (typeof window !== "undefined" && (window as any).__FREEFILE_API_BASE__) {
    return (window as any).__FREEFILE_API_BASE__;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
}

const API_BASE = getApiBase();

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API error");
  }
  return res.json();
}

// Upload
export async function uploadStatement(file: File, fy: string, password?: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("fy", fy);
  if (password) form.append("password", password);

  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Upload failed");
  }
  return res.json();
}

// Transactions
export async function getTransactions(fy: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ fy, ...params });
  return fetchAPI(`/transactions?${query}`);
}

export async function updateTransaction(id: number, data: { category?: string; category_confirmed?: boolean }) {
  const query = new URLSearchParams();
  if (data.category) query.set("category", data.category);
  if (data.category_confirmed !== undefined) query.set("category_confirmed", String(data.category_confirmed));
  return fetchAPI(`/transactions/${id}?${query}`, { method: "PUT" });
}

export async function bulkUpdateTransactions(updates: { id: number; category: string }[]) {
  return fetchAPI("/transactions/bulk-update", { method: "PUT", body: JSON.stringify(updates) });
}

export async function getTransactionSummary(fy: string) {
  return fetchAPI(`/transactions/summary?fy=${fy}`);
}

// Tax
export async function computeTax(fy: string) {
  return fetchAPI(`/tax/compute?fy=${fy}`);
}

export async function compareRegimes(fy: string) {
  return fetchAPI(`/tax/compare?fy=${fy}`);
}

export async function getAdvanceTaxSchedule(fy: string) {
  return fetchAPI(`/tax/advance-schedule?fy=${fy}`);
}

export async function getDeductions(fy: string) {
  return fetchAPI(`/tax/deductions?fy=${fy}`);
}

export async function saveDeduction(deduction: { fy: string; section: string; description?: string; amount: number }) {
  return fetchAPI("/tax/deductions", { method: "POST", body: JSON.stringify(deduction) });
}

export async function deleteDeduction(id: number) {
  return fetchAPI(`/tax/deductions/${id}`, { method: "DELETE" });
}

export async function getTdsEntries(fy: string) {
  return fetchAPI(`/tax/tds?fy=${fy}`);
}

export async function saveTdsEntry(entry: Record<string, unknown>) {
  return fetchAPI("/tax/tds", { method: "POST", body: JSON.stringify(entry) });
}

// Category Overrides
export async function getCategoryOverrides() {
  return fetchAPI<{ overrides: { narration_pattern: string; category: string }[] }>("/category-overrides");
}

export async function addCategoryOverride(pattern: string, category: string) {
  return fetchAPI("/category-overrides", {
    method: "POST",
    body: JSON.stringify({ narration_pattern: pattern, category }),
  });
}

export async function deleteCategoryOverride(pattern: string) {
  return fetchAPI(`/category-overrides/${encodeURIComponent(pattern)}`, { method: "DELETE" });
}

// Settings
export async function getFYSettings(fy: string) {
  return fetchAPI(`/settings/fy?fy=${fy}`);
}

export async function updateFYSettings(settings: { fy: string; regime: string; itr_form: string }) {
  return fetchAPI("/settings/fy", { method: "PUT", body: JSON.stringify(settings) });
}

// Profile
export async function getProfile() {
  return fetchAPI<Record<string, string | number | null>>("/profile");
}

export async function saveProfile(profile: { name: string; pan: string; email: string }) {
  return fetchAPI("/profile", { method: "PUT", body: JSON.stringify(profile) });
}

// Trading reports
export async function uploadTradingReport(file: File, source: string, fy: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("source", source);
  form.append("fy", fy);

  const res = await fetch(`${getApiBase()}/upload/trading`, { method: "POST", body: form });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Upload failed");
  }
  return res.json();
}

// Capital Gains
export async function getCapitalGains(fy: string) {
  return fetchAPI(`/tax/capital-gains?fy=${fy}`);
}

"use client";

import { useState } from "react";
import { uploadStatement, getApiBase } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ bank_name: string; transactions_count: number; duplicates_skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [fileSizeError, setFileSizeError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateAndSetFile = (f: File | null) => {
    setFileSizeError("");
    if (f && f.size > MAX_FILE_SIZE) {
      setFileSizeError(`File size (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await uploadStatement(file, "2025-26", password || undefined);
      setResult(res);
      setFile(null);
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Bank Statement</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
            ${dragOver ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400"}`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <svg className="mx-auto h-10 w-10 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {file ? (
            <p className="text-sm font-medium text-gray-900">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Drag & drop your bank statement here</p>
              <p className="text-xs text-gray-400 mt-1">PDF or CSV from HDFC, SBI, ICICI, Axis, Kotak</p>
            </>
          )}
          <input
            id="file-input"
            type="file"
            accept=".pdf,.csv,.tsv"
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
          />
        </div>

        {fileSizeError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{fileSizeError}</p>
          </div>
        )}

        {/* Password field for encrypted PDFs */}
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">PDF Password (if encrypted)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank if not encrypted"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="mt-4 w-full px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Parsing...
            </span>
          ) : (
            "Upload & Parse"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              Parsed {result.transactions_count} transactions from {result.bank_name}
            </p>
            {result.duplicates_skipped > 0 && (
              <p className="text-xs text-green-600 mt-1">{result.duplicates_skipped} duplicate transactions skipped</p>
            )}
            <a href="/transactions" className="text-sm text-green-700 underline mt-2 block">View transactions →</a>
          </div>
        )}
      </div>

      {/* Form 26AS Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl mt-8">
        <h3 className="font-semibold text-gray-900 mb-2">Import Form 26AS</h3>
        <p className="text-sm text-gray-500 mb-4">Upload your Form 26AS PDF from TRACES to auto-import TDS credits.</p>

        <Form26ASUploader />
      </div>

      {/* Supported banks */}
      <div className="mt-8 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Supported Banks</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {["HDFC", "SBI", "ICICI", "Axis", "Kotak"].map((bank) => (
            <div key={bank} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <span className="text-sm font-medium text-gray-700">{bank}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">CSV exports from any bank are also supported.</p>
      </div>

      {/* Download PDF report */}
      <div className="mt-8 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Reports</h3>
        <button
          onClick={() => window.open(`${getApiBase()}/report/pdf?fy=2025-26`, "_blank")}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download ITR Summary PDF
        </button>
      </div>
    </div>
  );
}

function Form26ASUploader() {
  const [file26, setFile26] = useState<File | null>(null);
  const [password26, setPassword26] = useState("");
  const [loading26, setLoading26] = useState(false);
  const [result26, setResult26] = useState<{ tds_imported: number; total_tds: number } | null>(null);
  const [error26, setError26] = useState("");

  const handleUpload26 = async () => {
    if (!file26) return;
    setLoading26(true);
    setError26("");
    setResult26(null);

    const form = new FormData();
    form.append("file", file26);
    form.append("fy", "2025-26");
    if (password26) form.append("password", password26);

    try {
      const res = await fetch(`${getApiBase()}/upload/26as`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult26(data);
      setFile26(null);
    } catch (err: unknown) {
      setError26(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading26(false);
  };

  return (
    <div>
      <div className="flex gap-3">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile26(e.target.files?.[0] || null)}
          className="flex-1 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
        />
        <input
          type="password"
          value={password26}
          onChange={(e) => setPassword26(e.target.value)}
          placeholder="PDF password"
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={handleUpload26}
          disabled={!file26 || loading26}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {loading26 ? "..." : "Import"}
        </button>
      </div>

      {error26 && <p className="text-sm text-red-700 mt-2">{error26}</p>}
      {result26 && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Imported {result26.tds_imported} TDS entries (Total TDS: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(result26.total_tds)})
          </p>
          <a href="/tax" className="text-sm text-green-700 underline mt-1 block">View TDS entries →</a>
        </div>
      )}
    </div>
  );
}

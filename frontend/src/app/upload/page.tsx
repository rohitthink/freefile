"use client";

import { useState } from "react";
import { uploadStatement, uploadTradingReport, getApiBase } from "@/lib/api";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Download,
  ArrowRight,
  X,
} from "lucide-react";

type TabType = "bank" | "form26as" | "trading";

const TRADING_SOURCES = [
  { value: "zerodha", label: "Zerodha" },
  { value: "groww", label: "Groww" },
  { value: "indmoney", label: "INDmoney" },
  { value: "other", label: "Other" },
];

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>("bank");

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
        Upload
      </h2>
      <p className="text-slate-500 text-sm mb-8">
        Import your financial documents to compute your taxes.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-blue-50 rounded-2xl max-w-md mb-8">
        {([
          { key: "bank" as TabType, label: "Bank Statement" },
          { key: "form26as" as TabType, label: "Form 26AS" },
          { key: "trading" as TabType, label: "Trading Reports" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "bank" && <BankUploader />}
      {activeTab === "form26as" && <Form26ASUploader />}
      {activeTab === "trading" && <TradingUploader />}

      {/* Supported banks */}
      <div className="mt-10 max-w-2xl">
        <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
          Supported Banks
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {["HDFC", "SBI", "ICICI", "Axis", "Kotak"].map((bank) => (
            <div
              key={bank}
              className="glass-card rounded-xl p-3 text-center hover:scale-[1.03] transition-transform"
            >
              <span className="text-sm font-medium text-slate-700">{bank}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          CSV exports from any bank are also supported.
        </p>
      </div>

      {/* Download PDF report */}
      <div className="mt-8 max-w-2xl">
        <button
          onClick={() =>
            window.open(`${getApiBase()}/report/pdf?fy=2025-26`, "_blank")
          }
          className="glass-card rounded-2xl px-5 py-3 text-sm text-slate-700 hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download ITR Summary PDF
        </button>
      </div>
    </div>
  );
}

function BankUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [results, setResults] = useState<
    { bank_name: string; transactions_count: number; duplicates_skipped: number }[]
  >([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileSizeErrors, setFileSizeErrors] = useState<string[]>([]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateAndAddFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const errors: string[] = [];
    const valid: File[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      if (f.size > MAX_FILE_SIZE) {
        errors.push(
          `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit`
        );
      } else {
        valid.push(f);
      }
    }
    setFileSizeErrors(errors);
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setResults([]);

    const allResults: typeof results = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
      try {
        const res = await uploadStatement(
          files[i],
          "2025-26",
          password || undefined
        );
        allResults.push(res);
      } catch (err: unknown) {
        errors.push(
          `${files[i].name}: ${err instanceof Error ? err.message : "Upload failed"}`
        );
      }
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
    if (allResults.length > 0) {
      setResults(allResults);
    }

    setFiles([]);
    setPassword("");
    setUploadProgress("");
    setLoading(false);
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith(".pdf"))
      return <FileText className="w-5 h-5 text-red-500" />;
    if (name.endsWith(".xlsx") || name.endsWith(".xls"))
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="max-w-2xl">
      <div className="glass-card rounded-2xl p-8">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
            ${
              dragOver
                ? "border-blue-400 bg-blue-50/50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          {dragOver && (
            <div className="absolute inset-0 rounded-2xl drop-zone-active opacity-20" />
          )}

          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Drag & drop your bank statements
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, CSV, TSV, or Excel from HDFC, SBI, ICICI, Axis, Kotak
          </p>

          <input
            id="file-input"
            type="file"
            accept=".pdf,.csv,.tsv,.xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => {
              validateAndAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {getFileIcon(f.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {f.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(f.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileSizeErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
            {fileSizeErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{err}</p>
              </div>
            ))}
          </div>
        )}

        {/* Password */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            PDF Password (if encrypted) — applies to all PDFs
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank if not encrypted"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || loading}
          className="mt-4 w-full px-4 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {uploadProgress}
            </span>
          ) : (
            `Upload & Parse${files.length > 1 ? ` (${files.length} files)` : ""}`
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Success */}
        {results.length > 0 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Parsed{" "}
                  {results.reduce((sum, r) => sum + r.transactions_count, 0)}{" "}
                  transactions from {results.length} file
                  {results.length > 1 ? "s" : ""}
                </p>
                {results.map((r, i) => (
                  <p key={i} className="text-xs text-emerald-600 mt-1">
                    {r.bank_name}: {r.transactions_count} transactions
                    {r.duplicates_skipped > 0 &&
                      ` (${r.duplicates_skipped} duplicates skipped)`}
                  </p>
                ))}
                <a
                  href="/transactions"
                  className="text-sm text-emerald-700 font-medium mt-2 inline-flex items-center gap-1"
                >
                  View transactions
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Form26ASUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tds_imported: number;
    total_tds: number;
  } | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("fy", "2025-26");
    if (password) form.append("password", password);

    try {
      const res = await fetch(`${getApiBase()}/upload/26as`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="glass-card rounded-2xl p-8">
        <h3 className="font-semibold text-slate-900 mb-2">
          Import Form 26AS
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Upload your Form 26AS PDF from TRACES to auto-import TDS credits.
        </p>

        <div className="flex gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 text-sm file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:bg-blue-50 file:text-slate-700 hover:file:bg-blue-100 file:transition-colors file:cursor-pointer"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PDF password"
            className="w-36 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-all"
          >
            {loading ? "..." : "Import"}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {result && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-800">
                Imported {result.tds_imported} TDS entries (Total TDS:{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(result.total_tds)}
                )
              </p>
            </div>
            <a
              href="/tax"
              className="text-sm text-emerald-700 font-medium mt-2 inline-flex items-center gap-1"
            >
              View TDS entries
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function TradingUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("zerodha");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    trades_imported: number;
    source: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await uploadTradingReport(file, source, "2025-26");
      setResult(res);
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="glass-card rounded-2xl p-8">
        <h3 className="font-semibold text-slate-900 mb-2">
          Import Trading Report
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Upload your P&L report or tax statement from your broker for capital
          gains computation.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              Broker
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TRADING_SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                    source === s.value
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-slate-600 hover:bg-blue-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              P&L Report / Tax Statement
            </label>
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:bg-blue-50 file:text-slate-700 hover:file:bg-blue-100 file:transition-colors file:cursor-pointer"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full px-4 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </span>
            ) : (
              "Upload & Process"
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-800">
                Imported {result.trades_imported} trades from {result.source}
              </p>
            </div>
            <a
              href="/capital-gains"
              className="text-sm text-emerald-700 font-medium mt-2 inline-flex items-center gap-1"
            >
              View Capital Gains
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { getApiBase } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const API = getApiBase();

interface Step {
  step: string;
  detail: string;
}

const STEP_LABELS: Record<string, string> = {
  launching_browser: "Launching Browser",
  navigating: "Opening Portal",
  entering_pan: "Entering PAN",
  waiting_for_login: "Waiting for Login",
  navigating_efile: "Navigating to e-File",
  selecting_form: "Selecting ITR Form",
  filling_income: "Filling Income",
  filling_deductions: "Filling Deductions",
  income_filled: "Income Filled",
  deductions_filled: "Deductions Filled",
  review: "Review Required",
  everification: "E-Verification",
  completed: "Completed",
  error: "Error",
  stopped: "Stopped",
};

export default function FilingPage() {
  const [pan, setPan] = useState("");
  const [ay, setAy] = useState("2026-27");
  const [status, setStatus] = useState("idle");
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load PAN from profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`${API}/profile`);
        const data = await res.json();
        if (data.pan) setPan(data.pan);
      } catch {
        // Profile not available
      }
    }
    loadProfile();
  }, []);

  // Poll for status updates
  useEffect(() => {
    if (status === "idle" || status === "completed" || status === "error" || status === "stopped") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/filing/status`);
        const data = await res.json();
        setStatus(data.status);
        setWaitingFor(data.waiting_for);
        setSteps(data.steps || []);

        if (data.status === "completed" || data.status === "error" || data.status === "stopped") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Connection error
      }
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const handlePanBlur = () => {
    if (pan && !PAN_REGEX.test(pan)) {
      setError("PAN must be format AAAAA0000A (5 letters, 4 digits, 1 letter)");
    } else if (pan) {
      setError("");
    }
  };

  const handleStart = async () => {
    if (!pan || !PAN_REGEX.test(pan)) {
      setError("PAN must be format AAAAA0000A (5 letters, 4 digits, 1 letter)");
      return;
    }
    setLoading(true);
    setError("");
    setSteps([]);

    try {
      const res = await fetch(`${API}/filing/start?pan=${pan}&assessment_year=${ay}&fy=2025-26`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStatus("starting");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start filing");
    }
    setLoading(false);
  };

  const handleSignal = async (signal: string) => {
    try {
      await fetch(`${API}/filing/signal?signal=${signal}`, { method: "POST" });
    } catch {
      // Error sending signal
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API}/filing/stop`, { method: "POST" });
      setStatus("stopped");
    } catch {
      // Error stopping
    }
  };

  const isRunning = !["idle", "completed", "error", "stopped"].includes(status);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">File ITR</h2>

      {/* Start Form */}
      {!isRunning && (
        <div className="bg-card rounded-xl border border-gray-200 p-6 max-w-lg mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Portal Automation</h3>
          <p className="text-sm text-gray-500 mb-4">
            This will open a browser window and navigate the income tax portal.
            You will need to enter your password and OTP manually.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Number</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => { setPan(e.target.value.toUpperCase()); if (error) setError(""); }}
                onBlur={handlePanBlur}
                maxLength={10}
                placeholder="ABCDE1234F"
                className={`w-full px-3 py-2 border rounded-lg text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-gray-900 ${error ? "border-red-400" : "border-gray-300"}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment Year</label>
              <select
                value={ay}
                onChange={(e) => setAy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-card"
              >
                <option value="2026-27">AY 2026-27 (FY 2025-26)</option>
                <option value="2025-26">AY 2025-26 (FY 2024-25)</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={loading || !pan}
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Starting..." : "Start Filing"}
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/60 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-300 ">
              <strong>Security:</strong> Your password is never stored or transmitted through this app.
              You enter it directly in the portal browser window.
            </p>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      {(isRunning || steps.length > 0) && (
        <div className="bg-card rounded-xl border border-gray-200 p-6 max-w-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filing Progress</h3>
            {isRunning && (
              <button onClick={handleStop} className="text-xs text-red-600 hover:text-red-800">
                Stop
              </button>
            )}
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  i === steps.length - 1 && isRunning
                    ? "bg-blue-500 animate-pulse"
                    : step.step === "error" ? "bg-red-500"
                    : step.step === "completed" ? "bg-green-500"
                    : "bg-gray-300"
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {STEP_LABELS[step.step] || step.step}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons based on waitingFor */}
          {waitingFor === "otp_login" && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Enter your password and OTP in the browser window</p>
              <p className="text-xs text-blue-600 mb-3">Once you&apos;re logged in and see the dashboard, click the button below.</p>
              <button
                onClick={() => handleSignal("login_complete")}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                I&apos;m Logged In - Continue
              </button>
            </div>
          )}

          {waitingFor === "nav_complete" && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">Navigate to the ITR filing page manually</p>
              <p className="text-xs text-yellow-600 mb-3">Go to e-File → Income Tax Returns → File ITR</p>
              <button
                onClick={() => handleSignal("nav_complete")}
                className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
              >
                I&apos;m on the ITR Page - Continue
              </button>
            </div>
          )}

          {waitingFor === "review" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-2">Review all filled fields in the browser</p>
              <p className="text-xs text-green-600 mb-3">Make sure all income, deduction, and tax amounts are correct before submitting.</p>
              <button
                onClick={() => handleSignal("review")}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Everything Looks Good - Submit
              </button>
            </div>
          )}

          {waitingFor === "otp_everify" && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800 font-medium mb-2">Complete e-verification in the browser</p>
              <p className="text-xs text-purple-600 mb-3">Use Aadhaar OTP, net banking, or DSC to e-verify your return.</p>
              <button
                onClick={() => handleSignal("otp_everify")}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                E-Verification Done
              </button>
            </div>
          )}

          {status === "completed" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">ITR filed successfully!</p>
              <p className="text-xs text-green-600 mt-1">Save your acknowledgement number from the portal.</p>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="bg-card rounded-xl border border-gray-200 p-6 max-w-lg">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">How it works</h3>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 ">
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">1.</span> Opens a real browser window to incometax.gov.in</li>
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">2.</span> Enters your PAN, you enter password + OTP</li>
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">3.</span> Navigates to ITR filing and selects your form</li>
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">4.</span> Auto-fills income, deductions, and tax fields</li>
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">5.</span> You review everything before submission</li>
          <li className="flex gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">6.</span> You complete e-verification (Aadhaar OTP)</li>
        </ol>
      </div>
    </div>
  );
}

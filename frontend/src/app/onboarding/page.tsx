"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { saveProfile, updateFYSettings } from "@/lib/api";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";

const TOTAL_STEPS = 5;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const { setUserName, setOnboarded, setRegime, setItrForm, setFY } =
    useAppStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);

  // Form data
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [email, setEmail] = useState("");
  const [fy, setLocalFY] = useState("2025-26");
  const [regime, setLocalRegime] = useState<"old" | "new">("new");
  const [itrForm, setLocalItrForm] = useState<"ITR-3" | "ITR-4">("ITR-4");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);

  const goNext = () => {
    if (step === 1) {
      const newErrors: Record<string, string> = {};
      if (!name.trim()) newErrors.name = "Name is required";
      if (!pan) newErrors.pan = "PAN is required";
      else if (!PAN_REGEX.test(pan))
        newErrors.pan = "Format: ABCDE1234F";
      if (email && !EMAIL_REGEX.test(email))
        newErrors.email = "Invalid email";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
    }

    if (animating) return;
    setAnimating(true);
    setDirection("left");
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      setAnimating(false);
    }, 300);
  };

  const goBack = () => {
    if (animating || step === 0) return;
    setAnimating(true);
    setDirection("right");
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setAnimating(false);
    }, 300);
  };

  const finish = async () => {
    try {
      await saveProfile({ name, pan, email });
    } catch {
      // API may not be running yet, store locally
    }
    try {
      await updateFYSettings({ fy, regime, itr_form: itrForm });
    } catch {
      // same
    }

    setUserName(name);
    setFY(fy);
    setRegime(regime);
    setItrForm(itrForm);
    setOnboarded(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("freefile_onboarded", "true");
    }

    router.push("/");
  };

  const animClass = animating
    ? direction === "left"
      ? "animate-slide-left"
      : "animate-slide-right"
    : "animate-fade-in";

  return (
    <div
      className={`min-h-screen onboarding-bg flex flex-col items-center justify-center p-6 transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Step content */}
      <div className="w-full max-w-lg">
        <div key={step} className={animClass}>
          {step === 0 && <WelcomeStep onNext={goNext} />}
          {step === 1 && (
            <DetailsStep
              name={name}
              setName={setName}
              pan={pan}
              setPan={setPan}
              email={email}
              setEmail={setEmail}
              errors={errors}
            />
          )}
          {step === 2 && (
            <FYStep
              fy={fy}
              setFY={setLocalFY}
              regime={regime}
              setRegime={setLocalRegime}
            />
          )}
          {step === 3 && (
            <ITRStep itrForm={itrForm} setItrForm={setLocalItrForm} />
          )}
          {step === 4 && <ReadyStep name={name} />}
        </div>
      </div>

      {/* Navigation */}
      {step > 0 && (
        <div className="mt-12 flex items-center gap-4">
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/60 hover:text-white transition-colors rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === TOTAL_STEPS - 1 && (
            <button
              onClick={finish}
              className="flex items-center gap-2 px-10 py-3.5 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Progress dots */}
      <div className="mt-8 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step
                ? "w-8 bg-white"
                : i < step
                  ? "w-1.5 bg-white/50"
                  : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center">
      <div
        className={`transition-all duration-1000 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
          FreeFile
        </h1>
        <p
          className={`mt-4 text-xl text-white/60 font-light transition-all duration-1000 delay-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          Tax filing made effortless.
        </p>
        <div
          className={`mt-2 text-sm text-white/30 transition-all duration-1000 delay-700 ${show ? "opacity-100" : "opacity-0"}`}
        >
          Local-first. Privacy-focused. Built for Indian freelancers.
        </div>
      </div>
      <div
        className={`mt-16 transition-all duration-700 delay-1000 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <button
          onClick={onNext}
          className="px-10 py-4 bg-white text-black text-base font-semibold rounded-2xl hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

function DetailsStep({
  name,
  setName,
  pan,
  setPan,
  email,
  setEmail,
  errors,
}: {
  name: string;
  setName: (v: string) => void;
  pan: string;
  setPan: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Your Details</h2>
      <p className="text-white/50 text-sm mb-8">
        We need a few details to set up your ITR filing.
      </p>
      <div className="space-y-5">
        <OnboardingInput
          label="Full Name"
          value={name}
          onChange={setName}
          placeholder="As on PAN card"
          error={errors.name}
        />
        <OnboardingInput
          label="PAN Number"
          value={pan}
          onChange={(v) => setPan(v.toUpperCase())}
          placeholder="ABCDE1234F"
          maxLength={10}
          mono
          error={errors.pan}
        />
        <OnboardingInput
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          type="email"
          error={errors.email}
        />
      </div>
    </div>
  );
}

function FYStep({
  fy,
  setFY,
  regime,
  setRegime,
}: {
  fy: string;
  setFY: (v: string) => void;
  regime: "old" | "new";
  setRegime: (v: "old" | "new") => void;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">Financial Year</h2>
      <p className="text-white/50 text-sm mb-8">
        Choose your filing year and tax regime.
      </p>

      <div className="mb-6">
        <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
          Financial Year
        </label>
        <div className="grid grid-cols-2 gap-3">
          {["2025-26", "2024-25"].map((y) => (
            <button
              key={y}
              onClick={() => setFY(y)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                fy === y
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <p className="font-semibold text-sm">FY {y}</p>
              <p className="text-xs mt-1 opacity-60">
                AY {parseInt(y.split("-")[0]) + 1}-
                {parseInt(y.split("-")[1]) + 1}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
          Tax Regime
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRegime("new")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              regime === "new"
                ? "border-indigo-500 bg-indigo-500/10 text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <p className="font-semibold text-sm">New Regime</p>
            <p className="text-xs mt-2 opacity-60 leading-relaxed">
              Lower tax rates
              <br />
              Fewer deductions
              <br />
              Default for most
            </p>
          </button>
          <button
            onClick={() => setRegime("old")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              regime === "old"
                ? "border-indigo-500 bg-indigo-500/10 text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <p className="font-semibold text-sm">Old Regime</p>
            <p className="text-xs mt-2 opacity-60 leading-relaxed">
              Higher tax rates
              <br />
              HRA, 80C, 80D etc.
              <br />
              Good if high deductions
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

function ITRStep({
  itrForm,
  setItrForm,
}: {
  itrForm: "ITR-3" | "ITR-4";
  setItrForm: (v: "ITR-3" | "ITR-4") => void;
}) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-2">ITR Form</h2>
      <p className="text-white/50 text-sm mb-8">
        Choose the ITR form that fits your situation.
      </p>

      <div className="space-y-4">
        <button
          onClick={() => setItrForm("ITR-4")}
          className={`w-full p-5 rounded-2xl border text-left transition-all ${
            itrForm === "ITR-4"
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                itrForm === "ITR-4"
                  ? "bg-indigo-500 text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              4
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">
                ITR-4 (Presumptive Income)
              </p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                For freelancers under Rs 75L turnover.
                <br />
                50% deemed income under 44ADA.
                <br />
                Simple and most common for freelancers.
              </p>
            </div>
            {itrForm === "ITR-4" && (
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </button>

        <button
          onClick={() => setItrForm("ITR-3")}
          className={`w-full p-5 rounded-2xl border text-left transition-all ${
            itrForm === "ITR-3"
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                itrForm === "ITR-3"
                  ? "bg-indigo-500 text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              3
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">
                ITR-3 (Full P&L Accounting)
              </p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Full profit & loss accounting.
                <br />
                Carry forward business losses.
                <br />
                For turnover above Rs 75L or if you want to claim all expenses.
              </p>
            </div>
            {itrForm === "ITR-3" && (
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function ReadyStep({ name }: { name: string }) {
  const [showCheck, setShowCheck] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center">
      <div
        className={`transition-all duration-700 ${showCheck ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
      >
        <div className="mx-auto w-20 h-20 mb-8">
          <svg viewBox="0 0 52 52" className="w-full h-full">
            <circle
              className="checkmark-circle"
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
            <path
              className="checkmark-check"
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <h2
        className={`text-3xl font-bold text-white mb-3 transition-all duration-700 delay-300 ${showCheck ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        You&apos;re all set{name ? `, ${name.split(" ")[0]}` : ""}!
      </h2>
      <p
        className={`text-white/50 text-sm transition-all duration-700 delay-500 ${showCheck ? "opacity-100" : "opacity-0"}`}
      >
        Upload your bank statements and start filing your ITR.
      </p>
    </div>
  );
}

function OnboardingInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  mono,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  mono?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-4 py-3.5 bg-white/5 border rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
          mono ? "font-mono tracking-wider uppercase" : ""
        } ${error ? "border-red-500/50" : "border-white/10"}`}
      />
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

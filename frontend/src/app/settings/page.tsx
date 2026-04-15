"use client";

import { useEffect, useState } from "react";
import { getFYSettings, updateFYSettings, getApiBase } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { FYSettings } from "@/lib/types";
import { Check, User, AlertCircle } from "lucide-react";

const API = getApiBase();

interface Profile {
  pan: string;
  name: string;
  dob: string;
  father_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  email: string;
  profession: string;
}

const EMPTY_PROFILE: Profile = {
  pan: "",
  name: "",
  dob: "",
  father_name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  mobile: "",
  email: "",
  profession: "freelancer",
};

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9]{10}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

type ProfileErrors = Partial<Record<keyof Profile, string>>;

function validateProfile(p: Profile): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!p.name.trim()) errors.name = "Name is required";
  if (!p.pan) errors.pan = "PAN is required";
  else if (!PAN_REGEX.test(p.pan)) errors.pan = "PAN must be format AAAAA0000A";
  if (!p.dob) errors.dob = "Date of birth is required";
  if (!p.father_name.trim()) errors.father_name = "Father's name is required";
  if (p.mobile && !MOBILE_REGEX.test(p.mobile))
    errors.mobile = "Mobile must be exactly 10 digits";
  if (p.email && !EMAIL_REGEX.test(p.email))
    errors.email = "Invalid email format";
  if (p.pincode && !PINCODE_REGEX.test(p.pincode))
    errors.pincode = "PIN code must be exactly 6 digits";
  return errors;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FYSettings>({
    fy: "2025-26",
    regime: "new",
    itr_form: "ITR-4",
  });
 
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [savedFY, setSavedFY] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [isDark, setDarkMode] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof Profile, boolean>>
  >({});
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const { setUserName, setRegime, setItrForm } = useAppStore();

  useEffect(() => {


  if (localStorage.getItem("theme") === "dark") {
    setDarkMode(true);
    document.documentElement.classList.add("dark");
  } else if (localStorage.getItem("theme") === "light") {
 
    setDarkMode(false);
    document.documentElement.classList.remove("dark");
  } else {
    const ColorsystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    ColorsystemDark ? setDarkMode(true) : setDarkMode(false);
  }
    getFYSettings("2025-26")
      .then((s) => setSettings(s as FYSettings))
      .catch(() => setLoadError("Could not load FY settings. Is the backend running?"));
    fetch(`${API}/profile`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load profile");
        return r.json();
      })
      .then((p) => {
        if (p && typeof p === "object") {
          // Convert null values to empty strings
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(p)) {
            if (k in EMPTY_PROFILE) {
              cleaned[k] = v != null ? String(v) : "";
            }
          }
          setProfile({ ...EMPTY_PROFILE, ...cleaned });
        }
      })
      .catch(() => setLoadError("Could not load profile. Is the backend running?"));
  }, []);

  const handleBlur = (field: keyof Profile) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validate only touched fields
    const fieldErrors = validateProfile(profile);
    setErrors((prev) => ({
      ...prev,
      [field]: fieldErrors[field],
    }));
  };

  const handleSaveFY = async () => {
    try {
      await updateFYSettings(settings);
      setRegime(settings.regime);
      setItrForm(settings.itr_form);
      setSavedFY(true);
      setTimeout(() => setSavedFY(false), 2000);
    } catch {
      setSaveError("Failed to save FY settings");
      setTimeout(() => setSaveError(""), 3000);
    }
  };

  const switchTheme = () => {
  const Theme = !isDark;

  setDarkMode(Theme);

  localStorage.setItem("theme", Theme ? "dark" : "light");

  document.documentElement.classList.toggle("dark", Theme);
  console.log("HTML classes:", document.documentElement.className);
};

  const handleSaveProfile = async () => {
    // Mark all fields as touched
    const allTouched: Partial<Record<keyof Profile, boolean>> = {};
    for (const key of Object.keys(profile) as (keyof Profile)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    const validationErrors = validateProfile(profile);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await fetch(`${API}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setUserName(profile.name);
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    } catch {
      setSaveError("Failed to save profile");
      setTimeout(() => setSaveError(""), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
      Settings
    </h2>

    <p className="text-slate-500  text-sm mb-8">
      Manage your profile, tax regime, and ITR form preferences.
    </p>

      {loadError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 max-w-4xl">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{loadError}</p>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 max-w-4xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Profile */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-800" />
            </div>
            <h3 className="font-semibold text-foreground">Your Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Full Name"
                value={profile.name}
                onChange={(v) => setProfile({ ...profile, name: v })}
                error={touched.name ? errors.name : undefined}
                onBlur={() => handleBlur("name")}
              />
              <Field
                label="PAN"
                value={profile.pan}
                onChange={(v) =>
                  setProfile({ ...profile, pan: v.toUpperCase() })
                }
                maxLength={10}
                mono
                error={touched.pan ? errors.pan : undefined}
                onBlur={() => handleBlur("pan")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Date of Birth"
                value={profile.dob}
                onChange={(v) => setProfile({ ...profile, dob: v })}
                type="date"
                error={touched.dob ? errors.dob : undefined}
                onBlur={() => handleBlur("dob")}
              />
              <Field
                label="Father's Name"
                value={profile.father_name}
                onChange={(v) =>
                  setProfile({ ...profile, father_name: v })
                }
                error={
                  touched.father_name ? errors.father_name : undefined
                }
                onBlur={() => handleBlur("father_name")}
              />
            </div>
            <Field
              label="Address"
              value={profile.address}
              onChange={(v) => setProfile({ ...profile, address: v })}
            />
            <div className="grid grid-cols-3 gap-3">
              <Field
                label="City"
                value={profile.city}
                onChange={(v) => setProfile({ ...profile, city: v })}
              />
              <Field
                label="State"
                value={profile.state}
                onChange={(v) => setProfile({ ...profile, state: v })}
              />
              <Field
                label="PIN Code"
                value={profile.pincode}
                onChange={(v) => setProfile({ ...profile, pincode: v })}
                maxLength={6}
                error={touched.pincode ? errors.pincode : undefined}
                onBlur={() => handleBlur("pincode")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Mobile"
                value={profile.mobile}
                onChange={(v) => setProfile({ ...profile, mobile: v })}
                maxLength={10}
                error={touched.mobile ? errors.mobile : undefined}
                onBlur={() => handleBlur("mobile")}
              />
              <Field
                label="Email"
                value={profile.email}
                onChange={(v) => setProfile({ ...profile, email: v })}
                type="email"
                error={touched.email ? errors.email : undefined}
                onBlur={() => handleBlur("email")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Profession
              </label>
              <select
                value={profile.profession}
                onChange={(e) =>
                  setProfile({ ...profile, profession: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-card border border-slate-200 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="freelancer">
                  Freelancer / Independent Contractor
                </option>
                <option value="consultant">Consultant</option>
                <option value="doctor">Doctor</option>
                <option value="lawyer">Lawyer / Advocate</option>
                <option value="ca">Chartered Accountant</option>
                <option value="engineer">Engineer</option>
                <option value="architect">Architect</option>
                <option value="interior_designer">Interior Designer</option>
                <option value="company_secretary">Company Secretary</option>
                <option value="other">Other Professional</option>
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {savedProfile ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Saved!
                </span>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>

        {/* FY Settings */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-5">
              Financial Year
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Financial Year
                </label>
                <select
                  value={settings.fy}
                  onChange={(e) =>
                    setSettings({ ...settings, fy: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-card border border-slate-200 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="2025-26">FY 2025-26 (AY 2026-27)</option>
                  <option value="2024-25">FY 2024-25 (AY 2025-26)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  Tax Regime
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["new", "old"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        setSettings({ ...settings, regime: r })
                      }
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        settings.regime === r
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)]"
                      }`}
                    >
                      <p className="font-medium text-sm text-foreground">
                        {r === "new" ? "New" : "Old"} Regime
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r === "new"
                          ? "Lower rates, fewer deductions"
                          : "Higher rates, more deductions"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">
                  ITR Form
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["ITR-4", "Presumptive (44ADA)"],
                      ["ITR-3", "Regular (Books)"],
                    ] as const
                  ).map(([form, desc]) => (
                    <button
                      key={form}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          itr_form: form as "ITR-3" | "ITR-4",
                        })
                      }
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        settings.itr_form === form
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)]"
                      }`}
                    >
                      <p className="font-medium text-sm text-foreground">
                        {form}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveFY}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {savedFY ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Saved!
                  </span>
                ) : (
                  "Save FY Settings"
                )}
              </button>
            </div>
          </div>

       <div className="glass-card rounded-2xl p-6">
  <h3 className="font-semibold text-foreground mb-2">
    Theme
  </h3>

  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-600 dark:text-slate-200">
      {isDark ? "Dark Mode" : "Light Mode"}
    </span>

    <button
      onClick={switchTheme}
      className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
        isDark ? "bg-slate-600" : "bg-slate-300"
      }`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  </div>
</div>

          
            <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-foreground  mb-2">
              About FreeFile
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-200">
              Local-first ITR filing app for Indian freelancers.
            </p>
            <p className="text-xs text-slate-400  mt-2">
              All data stored locally. Nothing sent to any server.
            </p>
          </div>

          
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  mono,
  error,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  mono?: boolean;
  error?: string;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        onBlur={onBlur}
        className={`w-full px-4 py-2.5 bg-card border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          mono ? "font-mono tracking-wider uppercase" : ""
        } ${error ? "border-red-400" : "border-slate-200"}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

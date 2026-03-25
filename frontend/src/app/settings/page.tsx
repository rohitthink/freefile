"use client";

import { useEffect, useState } from "react";
import { getFYSettings, updateFYSettings, getApiBase } from "@/lib/api";
import type { FYSettings } from "@/lib/types";

const API = getApiBase();

interface Profile {
  pan: string; name: string; dob: string; father_name: string;
  address: string; city: string; state: string; pincode: string;
  mobile: string; email: string; profession: string;
}

const EMPTY_PROFILE: Profile = {
  pan: "", name: "", dob: "", father_name: "",
  address: "", city: "", state: "", pincode: "",
  mobile: "", email: "", profession: "freelancer",
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
  if (p.mobile && !MOBILE_REGEX.test(p.mobile)) errors.mobile = "Mobile must be exactly 10 digits";
  if (p.email && !EMAIL_REGEX.test(p.email)) errors.email = "Invalid email format";
  if (p.pincode && !PINCODE_REGEX.test(p.pincode)) errors.pincode = "PIN code must be exactly 6 digits";
  return errors;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FYSettings>({ fy: "2025-26", regime: "new", itr_form: "ITR-4" });
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [savedFY, setSavedFY] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Profile, boolean>>>({});

  useEffect(() => {
    getFYSettings("2025-26").then((s) => setSettings(s as FYSettings)).catch(() => {});
    fetch(`${API}/profile`).then(r => r.json()).then(p => {
      setProfile({ ...EMPTY_PROFILE, ...p });
    }).catch(() => {});
  }, []);

  // Revalidate whenever profile changes (but only show errors for touched fields)
  useEffect(() => {
    setErrors(validateProfile(profile));
  }, [profile]);

  const handleBlur = (field: keyof Profile) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSaveFY = async () => {
    await updateFYSettings(settings);
    setSavedFY(true);
    setTimeout(() => setSavedFY(false), 2000);
  };

  const handleSaveProfile = async () => {
    // Touch all fields to show all errors
    const allTouched: Partial<Record<keyof Profile, boolean>> = {};
    for (const key of Object.keys(profile) as (keyof Profile)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    const validationErrors = validateProfile(profile);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    await fetch(`${API}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Profile</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })}
                error={touched.name ? errors.name : undefined} onBlur={() => handleBlur("name")} />
              <Field label="PAN" value={profile.pan} onChange={(v) => setProfile({ ...profile, pan: v.toUpperCase() })} maxLength={10} mono
                error={touched.pan ? errors.pan : undefined} onBlur={() => handleBlur("pan")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of Birth" value={profile.dob} onChange={(v) => setProfile({ ...profile, dob: v })} type="date"
                error={touched.dob ? errors.dob : undefined} onBlur={() => handleBlur("dob")} />
              <Field label="Father's Name" value={profile.father_name} onChange={(v) => setProfile({ ...profile, father_name: v })}
                error={touched.father_name ? errors.father_name : undefined} onBlur={() => handleBlur("father_name")} />
            </div>
            <Field label="Address" value={profile.address} onChange={(v) => setProfile({ ...profile, address: v })} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" value={profile.city} onChange={(v) => setProfile({ ...profile, city: v })} />
              <Field label="State" value={profile.state} onChange={(v) => setProfile({ ...profile, state: v })} />
              <Field label="PIN Code" value={profile.pincode} onChange={(v) => setProfile({ ...profile, pincode: v })} maxLength={6}
                error={touched.pincode ? errors.pincode : undefined} onBlur={() => handleBlur("pincode")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mobile" value={profile.mobile} onChange={(v) => setProfile({ ...profile, mobile: v })} maxLength={10}
                error={touched.mobile ? errors.mobile : undefined} onBlur={() => handleBlur("mobile")} />
              <Field label="Email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} type="email"
                error={touched.email ? errors.email : undefined} onBlur={() => handleBlur("email")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Profession</label>
              <select value={profile.profession} onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="freelancer">Freelancer / Independent Contractor</option>
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
            <button onClick={handleSaveProfile} disabled={hasErrors}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {savedProfile ? "Saved!" : "Save Profile"}
            </button>
          </div>
        </div>

        {/* FY Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Financial Year</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Financial Year</label>
                <select value={settings.fy} onChange={(e) => setSettings({ ...settings, fy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="2025-26">FY 2025-26 (AY 2026-27)</option>
                  <option value="2024-25">FY 2024-25 (AY 2025-26)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Regime</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["new", "old"] as const).map((r) => (
                    <button key={r} onClick={() => setSettings({ ...settings, regime: r })}
                      className={`p-3 border rounded-lg text-sm text-left ${settings.regime === r ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                      <p className="font-medium">{r === "new" ? "New" : "Old"} Regime</p>
                      <p className="text-xs text-gray-500 mt-1">{r === "new" ? "Lower rates, fewer deductions" : "Higher rates, more deductions"}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ITR Form</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["ITR-4", "Presumptive (44ADA)"], ["ITR-3", "Regular (Books)"]] as const).map(([form, desc]) => (
                    <button key={form} onClick={() => setSettings({ ...settings, itr_form: form as "ITR-3" | "ITR-4" })}
                      className={`p-3 border rounded-lg text-sm text-left ${settings.itr_form === form ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                      <p className="font-medium">{form}</p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveFY}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                {savedFY ? "Saved!" : "Save FY Settings"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">About FreeFile</h3>
            <p className="text-sm text-gray-600">Local-first ITR filing app for Indian freelancers.</p>
            <p className="text-xs text-gray-400 mt-2">All data stored locally. Nothing sent to any server.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", maxLength, mono, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; maxLength?: number; mono?: boolean;
  error?: string; onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} onBlur={onBlur}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${mono ? "font-mono tracking-wider uppercase" : ""} ${error ? "border-red-400" : "border-gray-300"}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

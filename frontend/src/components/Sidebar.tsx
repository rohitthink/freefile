"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Upload,
  List,
  Tag,
  Calculator,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/capital-gains", label: "Capital Gains", icon: TrendingUp },
  { href: "/filing", label: "File ITR", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const userName = useAppStore((s) => s.userName);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = mounted && userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "FF";

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#111] flex items-center px-4 z-30 md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {open ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <Menu className="w-5 h-5 text-white" />
          )}
        </button>
        <span className="ml-3 font-bold text-white text-sm tracking-wide">
          FreeFile
        </span>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`w-64 bg-[#111] flex flex-col fixed h-full z-20 transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo + User */}
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">
            FreeFile
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-wide">
            ITR Filing for Freelancers
          </p>
        </div>

        {/* User avatar */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {mounted && userName ? userName : "User"}
              </p>
              <p className="text-xs text-gray-500">FY 2025-26</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-2 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 mb-0.5 text-sm rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-white/10 text-white font-medium shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      active
                        ? "text-indigo-400"
                        : "text-gray-500 group-hover:text-gray-300"
                    }`}
                  />
                  {active && (
                    <div className="absolute -left-1 -top-1 w-7 h-7 bg-indigo-500/20 rounded-full blur-md" />
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <p className="text-[11px] text-gray-600 text-center">
            Local-only | All data on-device
          </p>
        </div>
      </nav>
    </>
  );
}

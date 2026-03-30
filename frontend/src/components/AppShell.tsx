"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAppStore } from "@/lib/store";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarded = useAppStore((s) => s.onboarded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted (avoids hydration mismatch with localStorage)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const isOnboarding = pathname === "/onboarding";

  // If not onboarded and not on onboarding page, redirect
  if (!onboarded && !isOnboarding) {
    // Use window.location for initial redirect to avoid layout flash
    if (typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
    return null;
  }

  // Onboarding page: no sidebar
  if (isOnboarding) {
    return <>{children}</>;
  }

  // Main app with sidebar
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 page-transition">
        {children}
      </main>
    </div>
  );
}

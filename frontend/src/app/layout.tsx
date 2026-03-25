import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreeFile - ITR Filing for Freelancers",
  description: "Upload bank statements, compute tax, and file ITR locally",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-gray-50">
        <ToastProvider>
          <Sidebar />
          {/* Mobile: no left margin; Desktop: sidebar margin */}
          <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}

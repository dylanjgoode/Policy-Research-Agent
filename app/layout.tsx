import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Innovation Arbitrage Engine",
  description: "Discover high-value innovation policies from peer economies for Ireland",
};

function Nav() {
  return (
    <nav className="border-b border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-semibold text-[var(--text-primary)] tracking-tight">
            Innovation Arbitrage Engine
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/research"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Research
            </Link>
            <Link
              href="/policies"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Policies
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Nav />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}

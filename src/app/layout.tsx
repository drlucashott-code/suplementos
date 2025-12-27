import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* =========================
   METADATA
   ========================= */
export const metadata: Metadata = {
  title: "Suplementos — custo-benefício",
  description:
    "Compare suplementos pelo melhor custo-benefício com base em dados reais da Amazon.",
};

/* =========================
   VIEWPORT (Next 16+)
   ========================= */
export const viewport = {
  colorScheme: "light",
};

/* =========================
   ROOT LAYOUT
   ========================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Força modo claro (Safari iOS / mobile) */}
        <meta name="color-scheme" content="light" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* 🔔 Toasts globais */}
        <Toaster position="top-right" />

        {/* 📊 Google Analytics */}
        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}

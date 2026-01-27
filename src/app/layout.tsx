import type { Metadata, Viewport } from "next";
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
   METADATA (SEO & Aba)
   ========================= */
export const metadata: Metadata = {
  title: "amazonpicks — O melhor preço em suplementos",
  description:
    "Compare suplementos pelo melhor custo-benefício com base em dados reais da Amazon.",
  robots: {
    index: true,
    follow: true,
  },
  authors: [{ name: "amazonpicks" }],
  keywords: ["suplementos", "creatina", "whey protein", "amazon", "melhor preço", "custo-benefício"],
};

/* =========================
   VIEWPORT
   ========================= */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
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
        
        {/* 🚀 OTIMIZAÇÃO DE CONEXÃO (LCP) 
            Prepara o navegador para baixar as imagens da Amazon antes mesmo 
            do CSS terminar de carregar, ganhando milissegundos preciosos. */}
        <link rel="preconnect" href="https://m.media-amazon.com" />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* 🔔 Toasts globais para feedback ao usuário */}
        <Toaster position="top-right" />

        {/* 📊 Google Analytics 
            Configurado para carregar sem bloquear a renderização inicial. */}
        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}
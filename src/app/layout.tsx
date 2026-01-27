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
  keywords: [
    "suplementos", 
    "creatina", 
    "whey protein", 
    "amazon", 
    "melhor preço", 
    "custo-benefício", 
    "comparador de suplementos"
  ],
  manifest: "/site.webmanifest",
};

/* =========================
   VIEWPORT
   ========================= */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Essencial para o score de Acessibilidade (Zoom)
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
        
        {/* 🚀 OTIMIZAÇÃO CRÍTICA DE CONEXÃO (LCP) 
            O crossOrigin="anonymous" resolve o aviso de 'Preconnect to required origins'
            que persiste mesmo quando o link básico está presente. */}
        <link 
          rel="preconnect" 
          href="https://m.media-amazon.com" 
          crossOrigin="anonymous" 
        />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
        
        {/* Fallback para o segundo domínio de CDN da Amazon */}
        <link 
          rel="preconnect" 
          href="https://images-na.ssl-images-amazon.com" 
          crossOrigin="anonymous" 
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* 🔔 Toasts globais para feedback de ações */}
        <Toaster position="top-right" />

        {/* 📊 Google Analytics 
            Injetado via afterInteractive (padrão da lib) para não competir 
            por recursos com a renderização das imagens dos produtos. */}
        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}
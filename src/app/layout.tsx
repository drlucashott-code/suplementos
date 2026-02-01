import type { Metadata, Viewport } from "next";
import { Suspense } from "react"; 
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

// 🚀 Otimização de Fontes
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* =========================
   METADATA (SEO & Indexação)
   ========================= */
export const metadata: Metadata = {
  metadataBase: new URL('https://amazonpicks.vercel.app'), // 🚀 ADICIONADO PARA FUNCIONAR O ÍCONE NO WHATSAPP
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
    "comparador de suplementos",
  ],
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://amazonpicks.vercel.app",
  },
  openGraph: {
    title: "amazonpicks — O melhor preço em suplementos",
    description: "Compare suplementos pelo melhor custo-benefício com base em dados reais da Amazon.",
    url: "https://amazonpicks.vercel.app",
    siteName: "amazonpicks",
    locale: "pt_BR",
    type: "website",
  },
};

/* =========================
   VIEWPORT (UX & Acessibilidade)
   ========================= */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
        <meta name="color-scheme" content="light" />

        {/* 🚀 HANDSHAKE TLS ANTECIPADO */}
        <link
          rel="preconnect"
          href="https://m.media-amazon.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />

        <link
          rel="preconnect"
          href="https://images-na.ssl-images-amazon.com"
          crossOrigin="anonymous"
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          {children}
        </Suspense>

        <Toaster position="top-right" />

        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}
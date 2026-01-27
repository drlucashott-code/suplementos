import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

// Configuração de fontes com display swap para evitar layout shift
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
};

/* =========================
   VIEWPORT (UX & Acessibilidade)
   ========================= */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Permite zoom para acessibilidade sem penalizar o SEO
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
        {/* Força o modo claro em dispositivos mobile para evitar conflitos de cores */}
        <meta name="color-scheme" content="light" />

        {/* 🚀 OTIMIZAÇÃO CRÍTICA DE CONEXÃO (LCP) 
            O crossOrigin="anonymous" é obrigatório para que o navegador valide 
            o handshake TLS com o CDN da Amazon antes mesmo de baixar as imagens. */}
        [Image of browser preconnect and prefetch mechanism]
        <link
          rel="preconnect"
          href="https://m.media-amazon.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />

        {/* Fallback para o segundo domínio de entrega de mídia da Amazon */}
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

        {/* 🔔 Feedback visual (Toast notifications) */}
        <Toaster position="top-right" />

        {/* 📊 Google Analytics 
            Carregado de forma não-bloqueante para priorizar a renderização do conteúdo. */}
        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}
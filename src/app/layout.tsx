import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

// 🚀 Otimização de Fontes: display 'swap' garante que o texto apareça antes da fonte carregar 100%
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
  // 🔗 Canonical URL ajuda a evitar conteúdo duplicado no Google
  alternates: {
    canonical: "https://amazonpicks.vercel.app",
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
  maximumScale: 5, // Essencial para o score 100 de Acessibilidade
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
        {/* Força o modo claro para evitar que o Dark Mode do sistema quebre o contraste planejado */}
        <meta name="color-scheme" content="light" />

        {/* 🚀 HANDSHAKE TLS ANTECIPADO:
            O crossOrigin="anonymous" resolve o aviso de 'Preconnect to required origins'. 
            O navegador agora valida a conexão com a Amazon no milissegundo zero. */}
        <link
          rel="preconnect"
          href="https://m.media-amazon.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />

        {/* CDN secundário da Amazon para garantir cobertura total de imagens */}
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

        {/* 🔔 Feedback visual de ações (Toast) */}
        <Toaster position="top-right" />

        {/* 📊 Google Analytics: 
            Estratégia afterInteractive para não competir com o LCP da página. */}
        <GoogleAnalytics gaId="G-CLEY1YQ80S" />
      </body>
    </html>
  );
}
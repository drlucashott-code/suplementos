import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* =========================
     CONFIGURAÇÕES DE IMAGEM
     ========================= */
  images: {
    // 🚀 Suporte a formatos modernos (AVIF é ~20% menor que WebP)
    formats: ['image/avif', 'image/webp'],
    
    // ⚡ Cache agressivo para imagens externas (Amazon)
    // Isso evita que a Vercel re-processe a mesma imagem várias vezes.
    minimumCacheTTL: 31536000, // 1 ano em segundos

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/**', // 👈 Alterado para /** para cobrir todas as pastas
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ir-br.amazon-adsystem.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-amazon.com',
        pathname: '/**',
      },
    ],
  },

  /* =========================
     PERFORMANCE & SEGURANÇA
     ========================= */
  reactStrictMode: true,
  
  // 🛡️ Remove o cabeçalho X-Powered-By (Segurança e -0.1kb de payload)
  poweredByHeader: false,

  // 🏗️ Otimização do Compilador (Turbo/SWC)
  compiler: {
    // Remove console.log em produção para um bundle mais limpo
    removeConsole: process.env.NODE_ENV === 'production',
  },

  /* =========================
     PROXIES & REDIRECTS (Opcional)
     ========================= */
  // Se precisar de redirecionamentos futuros para SEO, adicione aqui.
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* =========================
      OTIMIZAÇÃO DE PACOTES (FIX)
     ========================= */
  // 🚀 SOLUÇÃO PARA O ERRO 'ApiClient':
  // O amazon-paapi usa um sistema de módulos antigo que confunde o Turbopack.
  // Isso força o Next.js a carregar o pacote puramente pelo Node.js no servidor.
  serverExternalPackages: ['amazon-paapi'],

  /* =========================
      CONFIGURAÇÕES DE IMAGEM
     ========================= */
  images: {
    // 🚀 Otimização de Formatos de Próxima Geração:
    formats: ['image/avif', 'image/webp'],
    
    // ⚡ Política de Cache Agressiva (1 ano):
    minimumCacheTTL: 31536000,

    // 🌐 Permissões de Origens Remotas (Amazon CDNs):
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/**', 
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
  
  // 🛡️ Segurança: Remove 'X-Powered-By'
  poweredByHeader: false,

  // 🏗️ Otimização do Compilador (SWC):
  compiler: {
    // Remove console.logs em produção para melhorar o TBT (Total Blocking Time).
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  /* =========================
      EXPERIMENTAL & TREE SHAKING
     ========================= */
  experimental: {
    // Tree shaking agressivo para a Lucide Icons.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
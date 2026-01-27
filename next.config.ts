import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* =========================
      CONFIGURAÇÕES DE IMAGEM
     ========================= */
  images: {
    // 🚀 Otimização de Formatos de Próxima Geração:
    // O AVIF é a tecnologia de ponta atual, sendo até 20% mais leve que o WebP.
    // O Next.js tentará servir AVIF primeiro; se o navegador não suportar, envia WebP.
    formats: ['image/avif', 'image/webp'],
    
    // ⚡ Política de Cache Agressiva:
    // Força o cache por 1 ano (31536000 segundos) para recursos externos.
    // Isso elimina o aviso "Serve static assets with an efficient cache policy".
    minimumCacheTTL: 31536000,

    // 🌐 Permissões de Origens Remotas (Amazon CDNs):
    // Usamos '/**' para garantir compatibilidade com qualquer estrutura de pastas da Amazon.
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
  // Ativa o Strict Mode para detectar ciclos de renderização desnecessários.
  reactStrictMode: true,
  
  // 🛡️ Segurança:
  // Remove o cabeçalho 'X-Powered-By: Next.js' do payload, o que é uma boa prática
  // de segurança e economiza alguns bytes em cada requisição HTTP.
  poweredByHeader: false,

  // 🏗️ Otimização do Compilador (SWC):
  compiler: {
    // Limpa o bundle de produção removendo todos os console.log.
    // Isso melhora a nota de 'Total Blocking Time' (TBT) em dispositivos mobile.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  /* =========================
      OTIMIZAÇÃO DE PACOTES
     ========================= */
  experimental: {
    // Garante que o Next.js importe apenas os ícones utilizados da Lucide, 
    // em vez de carregar a biblioteca inteira no bundle do cliente.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
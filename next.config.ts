import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* =========================
      CONFIGURAÇÕES DE IMAGEM
     ========================= */
  images: {
    // 🚀 Otimização de Formatos:
    // O AVIF é até 20% mais leve que o WebP, reduzindo drasticamente o LCP.
    formats: ['image/avif', 'image/webp'],
    
    // ⚡ Política de Cache Eficiente:
    // Resolve o aviso do Google "Serve static assets with an efficient cache policy".
    // 31536000 segundos = 1 ano.
    minimumCacheTTL: 31536000,

    // 🌐 Permissões de Origens Remotas:
    // Configurado com '/**' para garantir que qualquer subdiretório da Amazon seja aceito.
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
  // Mantém o modo estrito para identificar vazamentos de memória ou efeitos colaterais.
  reactStrictMode: true,
  
  // 🛡️ Segurança e Payload:
  // Remove o cabeçalho 'X-Powered-By' para dificultar a identificação da stack e economizar bytes.
  poweredByHeader: false,

  // 🏗️ Otimização do Compilador:
  compiler: {
    // Limpa o bundle de produção removendo console.logs.
    // Isso reduz o TBT (Total Blocking Time) em dispositivos mobile.
    removeConsole: process.env.NODE_ENV === 'production',
  },

  /* =========================
      EXPERIMENTAL (Opcional)
     ========================= */
  // experimental: {
  //   // Otimiza o carregamento de pacotes de ícones grandes como lucide-react
  //   optimizePackageImports: ['lucide-react'],
  // },
};

export default nextConfig;
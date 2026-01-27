import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'ir-br.amazon-adsystem.com',
        pathname: '/**',
      },
    ],
  },
  /* Outras opções de configuração podem ser adicionadas aqui */
};

export default nextConfig;
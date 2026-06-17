// src/lib/amazonImageLoader.ts
//
// Loader custom para o <Image> do next/image (passado via prop `loader`).
//
// Por que existe: ao remover `unoptimized` dos <Image>, as imagens de produto
// passaram a ser servidas pelo otimizador da Vercel (/_next/image), que estourou
// a cota do plano e passou a responder 402
// (X-Vercel-Error: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) — imagens quebradas.
//
// Este loader devolve a imagem direto do CDN da própria Amazon, que já
// redimensiona on-the-fly pelo token de tamanho (._SL{n}_.), preservando
// lazy-load e srcset responsivo do next/image SEM consumir cota da Vercel.
//
// Usado como prop (`loader={amazonImageLoader}`) e não via images.loaderFile
// porque o loaderFile global não é aplicado de forma confiável aqui
// (resolução de caminho no Turbopack/Windows) — a prop é resolvida direto pelo
// next/image, sem depender desse alias.
//
// Imagens que não são da Amazon (banners locais, placeholder) são devolvidas
// como estão e carregam direto, também sem passar pelo otimizador.
export default function amazonImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes("media-amazon.com")) return src;
  // Substitui o token de tamanho (ex.: ._SL500_.) pela largura que o
  // next/image pediu para esta entrada do srcset. Mesma regex de
  // getOptimizedAmazonUrl. Se não houver token, devolve sem alteração
  // (a imagem ainda carrega no tamanho original — nunca quebra).
  return src.replace(/\._[A-Z0-9]+_\./, `._SL${width}_.`);
}

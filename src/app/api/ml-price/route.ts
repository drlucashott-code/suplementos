import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Converte qualquer URL do ML em URL CANÔNICA DE SCRAPING
 */
function toScrapingUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl);

    // Caso 1: link afiliado
    if (url.pathname.includes("redirect-afiliado")) {
      const real = url.searchParams.get("url");
      if (real) {
        return toScrapingUrl(decodeURIComponent(real));
      }
    }

    // Caso 2: formato de compra /MLB-6204289
    const mlbMatch = url.pathname.match(
      /MLB-(\d+)/i
    );

    if (mlbMatch) {
      return `https://www.mercadolivre.com.br/p/MLB${mlbMatch[1]}`;
    }

    // Caso 3: já está no formato correto
    if (url.pathname.includes("/p/MLB")) {
      return inputUrl;
    }

    return inputUrl;
  } catch {
    return inputUrl;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inputUrl = searchParams.get("url");

  if (!inputUrl) {
    return NextResponse.json(
      { error: "URL não informada" },
      { status: 400 }
    );
  }

  const scrapingUrl = toScrapingUrl(inputUrl);

  try {
    const res = await fetch(scrapingUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Falha ao carregar página" },
        { status: 502 }
      );
    }

    const html = await res.text();

    const priceMatch = html.match(
      /"price"\s*:\s*([\d.]+)/i
    );

    if (!priceMatch) {
      return NextResponse.json(
        { error: "Preço não encontrado" },
        { status: 404 }
      );
    }

    const price = Number(priceMatch[1]);

    if (!price || isNaN(price)) {
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      price,
      source: "html",
      scrapingUrl,
    });
  } catch (err) {
    console.error("Erro proxy ML:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

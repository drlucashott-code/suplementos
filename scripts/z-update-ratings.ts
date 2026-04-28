import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient({
  log: ["error"],
});

const REQUEST_DELAY_MIN_MS = 4500;
const REQUEST_DELAY_MAX_MS = 9000;
const RETRY_DELAY_MIN_MS = 20000;
const RETRY_DELAY_MAX_MS = 45000;
const MAX_CONSECUTIVE_ERRORS = 3;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleepWithJitter(min: number, max: number) {
  await sleep(randomBetween(min, max));
}

type RatingResult =
  | {
      rating: number | null;
      count: number | null;
      status: "success" | "not_found";
    }
  | {
      rating: null;
      count: null;
      status: "no_rating" | "error" | "blocked";
    };

type RatingTarget = {
  id: string;
  asin: string;
  name: string;
  source: "dynamic" | "tracked";
};

function getFirstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).first().text().trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function getFirstAttr(
  $: cheerio.CheerioAPI,
  selectors: Array<{ selector: string; attr: string }>
) {
  for (const entry of selectors) {
    const value = $(entry.selector).first().attr(entry.attr)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function isBlockedResponse(html: string) {
  const normalized = html.toLowerCase();

  return [
    "validatecaptcha",
    "not a robot",
    "digite os caracteres que voce ve abaixo",
    "digite os caracteres que você vê abaixo",
    "insira os caracteres que voce ve abaixo",
    "insira os caracteres que você vê abaixo",
    "sorry, we just need to make sure you're not a robot",
    "enter the characters you see below",
    "automated access to amazon data",
  ].some((signal) => normalized.includes(signal));
}

function hasProductPageSignals($: cheerio.CheerioAPI) {
  return Boolean(
    getFirstText($, [
      "#productTitle",
      "[data-feature-name='title'] h1",
      "#title",
    ]) ||
      getFirstAttr($, [{ selector: "#dp", attr: "data-asin" }]) ||
      getFirstText($, ["#centerCol", "#ppd"])
  );
}

async function fetchAmazonRatings(asin: string): Promise<RatingResult> {
  const url = `https://www.amazon.com.br/dp/${asin}`;

  try {
    const { data } = await axios.get<string>(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
      timeout: 15000,
    });

    if (typeof data !== "string" || data.trim() === "") {
      return { rating: null, count: null, status: "error" };
    }

    if (isBlockedResponse(data)) {
      return { rating: null, count: null, status: "blocked" };
    }

    const $ = cheerio.load(data);

    const ratingText =
      getFirstAttr($, [{ selector: "#acrPopover", attr: "title" }]) ||
      getFirstText($, [
        "[data-hook='average-star-rating'] .a-icon-alt",
        "[data-hook='rating-out-of-text']",
        "#acrPopover .a-icon-alt",
        "span.a-icon-alt",
      ]);

    const rating = ratingText
      ? parseFloat(ratingText.split(" ")[0].replace(",", "."))
      : null;

    const countRaw = getFirstText($, [
      "#acrCustomerReviewText",
      "[data-hook='total-review-count']",
      "#acrCustomerReviewLink",
    ]);
    const count = countRaw ? parseInt(countRaw.replace(/[^0-9]/g, ""), 10) : null;

    if (rating === null && count === null) {
      if (!hasProductPageSignals($)) {
        console.warn(`  [warn] HTML suspeito para ${asin}. Tratando como possivel bloqueio.`);
        return { rating: null, count: null, status: "blocked" };
      }

      console.warn(`  [warn] Nenhuma avaliacao encontrada no HTML do ASIN ${asin}.`);
      return { rating: null, count: null, status: "no_rating" };
    }

    return { rating, count, status: "success" };
  } catch (error: unknown) {
    const msg = (error as Error).message;

    if (msg.includes("404")) {
      return { rating: null, count: null, status: "not_found" };
    }

    console.error(`  [error] Erro no ASIN ${asin}: ${msg}`);
    return { rating: null, count: null, status: "error" };
  }
}

async function processProduct(product: RatingTarget) {
  console.log(
    `[check] [${product.source}] [${product.asin}] - Processando: ${product.name.substring(0, 45)}...`
  );

  const result = await fetchAmazonRatings(product.asin);
  const now = new Date();

  if (result.status === "success") {
    if (product.source === "dynamic") {
      await prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: result.rating ?? undefined,
          ratingCount: result.count ?? undefined,
          ratingsUpdatedAt: now,
        },
      });
    } else {
      await prisma.siteTrackedAmazonProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: result.rating ?? undefined,
          ratingCount: result.count ?? undefined,
          ratingsUpdatedAt: now,
        },
      });
    }

    console.log(`  [ok] Sucesso: ${result.rating} estrela(s) | ${result.count} reviews`);
    return "success" as const;
  }

  if (result.status === "not_found") {
    if (product.source === "dynamic") {
      await prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: null,
          ratingCount: null,
          ratingsUpdatedAt: now,
        },
      });
    } else {
      await prisma.siteTrackedAmazonProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: null,
          ratingCount: null,
          ratingsUpdatedAt: now,
        },
      });
    }

    console.log("  [warn] Produto nao encontrado (404). Marcado como checado.");
    return "not_found" as const;
  }

  if (result.status === "no_rating") {
    if (product.source === "dynamic") {
      await prisma.dynamicProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: null,
          ratingCount: null,
          ratingsUpdatedAt: now,
        },
      });
    } else {
      await prisma.siteTrackedAmazonProduct.update({
        where: { id: product.id },
        data: {
          ratingAverage: null,
          ratingCount: null,
          ratingsUpdatedAt: now,
        },
      });
    }

    console.log("  [warn] Produto sem avaliacoes. Marcado como checado.");
    return "no_rating" as const;
  }

  if (result.status === "blocked") {
    console.log("  [warn] Sinal forte de bloqueio detectado. Encerrando a rodada.");
    return "blocked" as const;
  }

  console.log("  [warn] Erro temporario. Vai para fila de nova tentativa.");
  return "error" as const;
}

async function main() {
  const asinArg = process.argv
    .map((value) => value.trim().toUpperCase())
    .find((value) => value.startsWith("--ASIN="));
  const singleAsin = asinArg?.split("=")[1];

  if (singleAsin) {
    const [dynamicProduct, trackedProduct] = await Promise.all([
      prisma.dynamicProduct.findUnique({
        where: { asin: singleAsin },
        select: { id: true, asin: true, name: true },
      }),
      prisma.siteTrackedAmazonProduct.findUnique({
        where: { asin: singleAsin },
        select: { id: true, asin: true, name: true },
      }),
    ]);

    const products: RatingTarget[] = [
      ...(dynamicProduct ? [{ ...dynamicProduct, source: "dynamic" as const }] : []),
      ...(trackedProduct ? [{ ...trackedProduct, source: "tracked" as const }] : []),
    ];

    if (products.length === 0) {
      console.log(`[error] ASIN ${singleAsin} nao encontrado em DynamicProduct.`);
      return;
    }

    console.log(`[target] Modo teste por ASIN: ${singleAsin}`);
    for (const product of products) {
      await processProduct(product);
    }
    return;
  }

  const sessentaDiasAtras = new Date();
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

  const [dynamicProducts, trackedProducts] = await Promise.all([
    prisma.dynamicProduct.findMany({
      where: {
        OR: [
          { ratingsUpdatedAt: null },
          {
            AND: [
              { ratingsUpdatedAt: { lt: sessentaDiasAtras } },
              {
                NOT: {
                  AND: [{ ratingAverage: null }, { ratingCount: null }],
                },
              },
            ],
          },
        ],
      },
      select: { id: true, asin: true, name: true, ratingsUpdatedAt: true, createdAt: true },
      orderBy: [{ ratingsUpdatedAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.siteTrackedAmazonProduct.findMany({
      where: {
        OR: [
          { ratingsUpdatedAt: null },
          {
            AND: [
              { ratingsUpdatedAt: { lt: sessentaDiasAtras } },
              {
                NOT: {
                  AND: [{ ratingAverage: null }, { ratingCount: null }],
                },
              },
            ],
          },
        ],
      },
      select: { id: true, asin: true, name: true, ratingsUpdatedAt: true, createdAt: true },
      orderBy: [{ ratingsUpdatedAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const products: RatingTarget[] = [
    ...dynamicProducts.map((product) => ({ ...product, source: "dynamic" as const })),
    ...trackedProducts.map((product) => ({ ...product, source: "tracked" as const })),
  ]
    .sort((a, b) => {
      const aDate = a.ratingsUpdatedAt?.getTime() ?? a.createdAt.getTime();
      const bDate = b.ratingsUpdatedAt?.getTime() ?? b.createdAt.getTime();
      return aDate - bDate;
    })
    .map(({ ratingsUpdatedAt, createdAt, ...product }) => product);

  if (products.length === 0) {
    console.log(
      "[ok] Tudo em dia. Nenhum produto precisa de atualizacao de rating no momento."
    );
    return;
  }

  console.log(`\n[start] Iniciando atualizacao de fila para ${products.length} produtos...`);

  let atualizados = 0;
  let consecutiveErrors = 0;
  const retryQueue: RatingTarget[] = [];

  for (const product of products) {
    const status = await processProduct(product);

    if (status === "blocked") {
      console.log(
        "\n[stop] Rodada interrompida por suspeita de bloqueio. O script foi encerrado para proteger o IP."
      );
      return;
    }

    if (status === "success") {
      atualizados++;
      consecutiveErrors = 0;
    } else if (status === "error") {
      retryQueue.push(product);
      consecutiveErrors += 1;
    } else {
      consecutiveErrors = 0;
    }

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.log(
        `\n[stop] ${consecutiveErrors} erros consecutivos detectados. Encerrando a rodada para evitar bloqueio.`
      );
      return;
    }

    await sleepWithJitter(REQUEST_DELAY_MIN_MS, REQUEST_DELAY_MAX_MS);
  }

  if (retryQueue.length > 0) {
    console.log(`\n[retry] Nova tentativa para ${retryQueue.length} produtos com erro...`);
    await sleepWithJitter(RETRY_DELAY_MIN_MS, RETRY_DELAY_MAX_MS);

    let retryConsecutiveErrors = 0;

    for (const product of retryQueue) {
      const status = await processProduct(product);

      if (status === "blocked") {
        console.log(
          "\n[stop] Bloqueio detectado durante a fila de retry. Encerrando a rodada."
        );
        return;
      }

      if (status === "success") {
        atualizados++;
        retryConsecutiveErrors = 0;
      } else if (status === "error") {
        retryConsecutiveErrors += 1;
      } else {
        retryConsecutiveErrors = 0;
      }

      if (retryConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(
          `\n[stop] ${retryConsecutiveErrors} erros consecutivos detectados no retry. Encerrando para evitar bloqueio.`
        );
        return;
      }

      await sleepWithJitter(REQUEST_DELAY_MIN_MS, REQUEST_DELAY_MAX_MS);
    }
  }

  console.log(
    `\n[done] Sincronizacao concluida. Total de produtos atualizados nesta rodada: ${atualizados}`
  );
}

main()
  .catch((e) => console.error("[fatal] Erro fatal:", e))
  .finally(async () => await prisma.$disconnect());

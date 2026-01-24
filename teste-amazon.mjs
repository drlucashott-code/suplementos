import axios from "axios";
import * as cheerio from "cheerio";

async function testarAmazon(asin) {
  console.log(`\n🔍 Buscando dados para o ASIN: ${asin}...`);
  
  const url = `https://www.amazon.com.br/dp/${asin}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Device-Memory": "8"
      },
    });

    const $ = cheerio.load(data);

    // Seletores específicos para Amazon Brasil
    const ratingRaw = $("span.a-icon-alt").first().text(); 
    const countRaw = $("#acrCustomerReviewText").first().text();

    // Limpeza dos dados
    const rating = ratingRaw ? ratingRaw.split(" ")[0].replace(",", ".") : "Não encontrado";
    const count = countRaw ? countRaw.replace(/[^0-9]/g, "") : "Não encontrado";

    if (rating === "Não" && count === "Não") {
      console.log("❌ Amazon bloqueou a requisição ou os seletores mudaram.");
    } else {
      console.log("✅ SUCESSO!");
      console.log(`⭐ Estrelas: ${rating}`);
      console.log(`💬 Avaliações: ${count}`);
    }

  } catch (error) {
    console.error("⚠️ ERRO:", error.message);
    if (error.response?.status === 503) {
      console.log("DICA: A Amazon detectou o bot (Erro 503).");
    }
  }
}

// Testando com a Creatina da Max Titanium
testarAmazon("B07DVJC66X");
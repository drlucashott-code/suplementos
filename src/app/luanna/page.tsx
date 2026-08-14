"use client";

import { useMemo, useState } from "react";
import products from "@/data/luannaBeautyProducts.json";

type Product = (typeof products)[number];

export default function LuannaPage() {
  const [rating, setRating] = useState("");
  const [reviews, setReviews] = useState("");
  const [rank, setRank] = useState("");
  const [sold, setSold] = useState("");
  const [discount, setDiscount] = useState("");
  const visible = useMemo(() => products.filter((p) =>
    (!rating || (p.rating ?? 0) >= Number(rating.replace(",", "."))) &&
    (!reviews || (p.reviews ?? 0) >= Number(reviews)) &&
    (!rank || (p.rank ?? Infinity) <= Number(rank)) &&
    (!sold || (p.monthlySold ?? 0) >= Number(sold)) &&
    (!discount || p.discount >= Number(discount.replace(",", ".")))), [rating, reviews, rank, sold, discount]);
  const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  const compact = (n: number | null) => n === null ? "—" : new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const reset = () => { setRating(""); setReviews(""); setRank(""); setSold(""); setDiscount(""); };
  return <main style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 16px 48px" }}>
    <p style={{ color: "#087a62", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Seleção temporária · Beleza</p>
    <h1 style={{ fontSize: 36, margin: "4px 0" }}>100 ofertas para revisão</h1>
    <p style={{ color: "#52616a", maxWidth: 850 }}>Preços confirmados pela Creators. A referência é a menor média válida entre Amazon e Buy Box, comparando 30 e 90 dias.</p>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, padding: 16, margin: "22px 0", border: "1px solid #dce4e5", borderRadius: 12, background: "white" }}>
      <Filter label="Nota mínima" value={rating} setValue={setRating} placeholder="4,5" />
      <Filter label="Mín. avaliações" value={reviews} setValue={setReviews} placeholder="100" />
      <Filter label="Rank médio máximo" value={rank} setValue={setRank} placeholder="5.000" />
      <Filter label="Vendas/mês mín." value={sold} setValue={setSold} placeholder="500" />
      <Filter label="Desconto mín. (%)" value={discount} setValue={setDiscount} placeholder="25" />
      <button onClick={reset} style={{ border: 0, borderRadius: 8, padding: "10px 14px", background: "#ddf3ed", color: "#075f4c", fontWeight: 800, cursor: "pointer" }}>Limpar</button>
    </section>
    <strong>{visible.length} produtos visíveis</strong>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 14, marginTop: 16 }}>
      {visible.map((p, index) => <a key={p.asin} href={`https://www.amazon.com.br/dp/${p.asin}`} target="_blank" rel="noreferrer" style={{ display: "block", position: "relative", overflow: "hidden", border: "1px solid #dce4e5", borderRadius: 12, background: "white", padding: 14, color: "#17202a", textDecoration: "none" }}>
        <b style={{ position: "absolute", top: 8, left: 8, background: "#17202a", color: "white", borderRadius: 999, padding: "4px 7px", fontSize: 12 }}>#{index + 1}</b>
        <div style={{ height: 180, display: "grid", placeItems: "center", overflow: "hidden" }}>{p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}</div>
        <b style={{ display: "block", color: "#b42318", fontSize: 20 }}>-{p.discount.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b>
        <strong style={{ fontSize: 22 }}>{money(p.currentPrice)}</strong>
        <small style={{ display: "block", color: "#5f6f78", marginTop: 4 }}>Média {p.period}d ({p.source}): <s>{money(p.averagePrice)}</s></small>
        <h2 style={{ fontSize: 14, lineHeight: 1.35, minHeight: 58 }}>{p.title}</h2>
        <small style={{ color: "#5f6f78" }}>{p.brand}</small>
        <p style={{ fontSize: 12, lineHeight: 1.7 }}><b>Economia</b> {money(p.savings)}<br /><b>Avaliações</b> {p.rating?.toFixed(1) ?? "—"} ★ ({compact(p.reviews)})<br /><b>Vendas/mês</b> {compact(p.monthlySold)} · <b>Rank</b> {compact(p.rank)}</p>
        <small style={{ color: "#087a62", fontWeight: 700 }}>{p.asin} · Abrir na Amazon ↗</small>
      </a>)}
    </section>
  </main>;
}

function Filter({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder: string }) {
  return <label style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 700, color: "#52616a" }}>{label}<input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} style={{ border: "1px solid #bac8ca", borderRadius: 8, padding: 10 }} /></label>;
}

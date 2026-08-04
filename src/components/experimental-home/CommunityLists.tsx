"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bookmark, ChevronRight, ListPlus, MessageCircle, Share2, Users } from "lucide-react";
import amazonImageLoader from "@/lib/amazonImageLoader";
import { buildPublicListPath } from "@/lib/siteSocial";
import type { ExperimentalPublicList } from "./types";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function listPath(list: ExperimentalPublicList) {
  return list.ownerUsername
    ? buildPublicListPath(list.ownerUsername, list.slug)
    : `/listas/${list.slug}`;
}

function track(event: string, list: ExperimentalPublicList) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({
    event,
    home_version: "experimental_amazon_mobile",
    list_slug: list.slug,
  });
}

async function shareList(list: ExperimentalPublicList) {
  const url = new URL(listPath(list), window.location.origin).toString();
  track("share_experimental_home_list", list);
  try {
    if (navigator.share) {
      await navigator.share({ title: list.title, text: `Veja esta lista no AmazonPicks: ${list.title}`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  } catch {
    // Cancelar o compartilhamento nativo não deve gerar um erro de interface.
  }
}

function ListCard({ list, featured = false }: { list: ExperimentalPublicList; featured?: boolean }) {
  const images = list.previewImages.filter(Boolean).slice(0, 3);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#D5D9D9] bg-white shadow-[0_2px_8px_rgba(15,17,17,0.06)] transition hover:border-[#AAB7B8] hover:shadow-[0_8px_22px_rgba(15,17,17,0.10)]">
      <Link href={listPath(list)} onClick={() => track("click_experimental_home_list", list)} className="group block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#007185]">
        <div className="relative grid h-[128px] grid-cols-3 gap-px bg-[#E3E6E6]">
          {featured ? (
            <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-[#FFF3CD] px-2 py-1 text-[10px] font-bold text-[#7A5200] shadow-sm">
              <Bookmark className="h-3 w-3 fill-current" /> Mais salva
            </span>
          ) : null}
          {images.length > 0 ? (
            images.map((src, index) => (
              <div key={`${list.slug}-${index}`} className="relative bg-[#F7F8F8]">
                <Image loader={amazonImageLoader} src={src} alt="" fill sizes="120px" className="object-contain p-2" />
              </div>
            ))
          ) : (
            <div className="col-span-3 grid place-items-center bg-[#F7F8F8] text-[#879596]">
              <ListPlus className="h-8 w-8" />
            </div>
          )}
          {images.length > 0 && images.length < 3
            ? Array.from({ length: 3 - images.length }).map((_, index) => (
                <div key={`empty-${index}`} className="grid place-items-center bg-[#F7F8F8] text-[#C7CDCD]">
                  <ListPlus className="h-5 w-5" />
                </div>
              ))
            : null}
        </div>
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[17px] font-bold leading-5 text-[#0F1111] group-hover:text-[#C7511F]">{list.title}</h3>
            <span className="shrink-0 rounded-full bg-[#E7F4F5] px-2 py-1 text-[10px] font-bold text-[#005F6B]">
              {list.itemsCount} itens
            </span>
          </div>
          {list.description ? <p className="mt-2 line-clamp-2 text-[12px] leading-4 text-[#565959]">{list.description}</p> : null}
          <div className="mt-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#232F3E] text-[10px] font-bold text-white">{getInitials(list.ownerDisplayName)}</span>
            <span className="min-w-0 truncate text-[12px] text-[#565959]">por <strong className="font-semibold text-[#0F1111]">{list.ownerDisplayName}</strong></span>
          </div>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-between border-t border-[#EAEEEE] px-4 py-3 text-[11px] text-[#565959]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Pessoas que salvaram"><Bookmark className="h-3.5 w-3.5" /> {list.savedCount}</span>
          <span className="flex items-center gap-1" title="Comentários"><MessageCircle className="h-3.5 w-3.5" /> {list.commentsCount}</span>
        </div>
        <button type="button" onClick={() => void shareList(list)} className="flex items-center gap-1 font-semibold text-[#007185] hover:text-[#C7511F]" aria-label={`Compartilhar ${list.title}`}>
          <Share2 className="h-3.5 w-3.5" /> Compartilhar
        </button>
      </div>
    </article>
  );
}

export function CommunityLists({ publicLists }: { publicLists: ExperimentalPublicList[] }) {
  return (
    <section id="listas" aria-labelledby="listas-title" className="bg-white">
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-10 lg:py-11">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#8B5D00]">
              <Users className="h-4 w-4" />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Escolhas de pessoas reais</p>
            </div>
            <h2 id="listas-title" className="mt-2 text-[25px] font-bold leading-tight tracking-[-0.02em] text-[#0F1111] sm:text-[32px]">
              Listas da comunidade
            </h2>
          </div>
          <Link href="/listas" className="hidden shrink-0 items-center gap-1 text-[14px] font-bold text-[#007185] hover:text-[#C7511F] sm:flex">
            Explorar listas <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {publicLists.length > 0 ? (
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0 xl:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {publicLists.map((list, index) => (
              <div key={list.slug} className="w-[82vw] max-w-[330px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                <ListCard list={list} featured={index === 0 && list.savedCount > 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#D5D9D9] bg-[#F7F8F8] px-6 py-9 text-center">
            <ListPlus className="mx-auto h-7 w-7 text-[#879596]" />
            <p className="mt-3 text-[15px] font-bold text-[#0F1111]">A próxima boa lista pode ser a sua.</p>
            <p className="mt-1 text-[13px] text-[#565959]">Agrupe produtos úteis e publique para a comunidade.</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/listas" className="flex items-center justify-center gap-2 rounded-full border border-[#D5D9D9] px-5 py-2.5 text-[13px] font-bold text-[#0F1111] hover:bg-[#F7F8F8]">
            Explorar todas <ArrowRight className="h-4 w-4 text-[#007185]" />
          </Link>
          <Link href="/minha-conta/listas" className="flex items-center justify-center gap-2 rounded-full bg-[#FFD814] px-5 py-2.5 text-[13px] font-bold text-[#0F1111] shadow-sm hover:bg-[#F7CA00]">
            <ListPlus className="h-4 w-4" /> Criar minha lista
          </Link>
        </div>
      </div>
    </section>
  );
}

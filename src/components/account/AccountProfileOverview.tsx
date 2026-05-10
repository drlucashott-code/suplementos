"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Heart,
  MessageCircle,
  Package,
  Tag,
} from "lucide-react";
import { buildPublicListPath } from "@/lib/siteSocial";
import type { SiteNotificationItem } from "@/lib/siteNotifications";
import {
  accountBodyClass,
  accountKickerClass,
  accountSectionClass,
  accountSecondaryButtonClass,
  accountTertiaryLinkClass,
} from "@/components/account/accountUi";

type RecentListPreview = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  itemsCount: number;
  updatedAt: string;
};

type RecentCommentPreview = {
  id: string;
  body: string;
  createdAt: string;
  productId: string;
  productName: string;
};

type AccountProfileOverviewProps = {
  user: {
    id: string;
    email: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    isEmailVerified: boolean;
  };
  profileStats: {
    memberSince: string;
    commentsCount: number;
    commentReactionsCount: number;
    listsCount: number;
    publicListsCount: number;
  };
  recentNotifications: SiteNotificationItem[];
  recentLists: RecentListPreview[];
  recentComments: RecentCommentPreview[];
};

type HubTab = "activities" | "comments" | "interactions";

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function getNotificationIcon(type: string) {
  const className = "h-4 w-4";
  switch (type) {
    case "favorite_price_drop":
    case "monitored_price_drop":
      return <Tag className={className} />;
    case "favorite_back_in_stock":
    case "monitored_back_in_stock":
      return <Package className={className} />;
    case "list_comment":
    case "comment_reply":
    case "list_comment_liked":
    case "list_comment_replied":
    case "comment_liked":
    case "comment_replied":
      return <MessageCircle className={className} />;
    default:
      return <Bell className={className} />;
  }
}

function isActivityNotification(type: string) {
  return [
    "favorite_price_drop",
    "monitored_price_drop",
    "favorite_back_in_stock",
    "monitored_back_in_stock",
  ].includes(type);
}

function isCommentNotification(type: string) {
  return ["list_comment", "comment_reply"].includes(type);
}

function isInteractionNotification(type: string) {
  return ["list_comment_liked", "list_comment_replied", "comment_liked", "comment_replied"].includes(
    type
  );
}

function HubCard({
  href,
  icon,
  title,
  body,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-[10px] border border-[#D5D9D9] bg-white px-3 py-3 transition hover:border-[#C9D5E4] hover:bg-[#FCFCFD]"
    >
      <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F3F4F6] text-[#344054]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-[#0F1111]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-6 text-[#565959]">{body}</p>
        {meta ? <p className="mt-1 text-[11px] font-semibold text-[#98A2B3]">{meta}</p> : null}
      </div>
    </Link>
  );
}

function CompactListCard({
  userUsername,
  list,
}: {
  userUsername: string | null;
  list: RecentListPreview;
}) {
  const href = list.isPublic && userUsername ? buildPublicListPath(userUsername, list.slug) : "/minha-conta/listas";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[10px] border border-[#D5D9D9] bg-white p-4 transition hover:border-[#C9D5E4] hover:bg-[#FCFCFD]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-[#0F1111]">{list.title}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[#565959]">
            {list.description || "Lista pronta para acompanhar produtos com mais contexto."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold ${
            list.isPublic ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#F2F4F7] text-[#475467]"
          }`}
        >
          {list.isPublic ? "Pública" : "Privada"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-[11px] font-semibold text-[#667085]">
        <div className="flex items-center justify-between gap-3">
          <span>{list.itemsCount} produto{list.itemsCount === 1 ? "" : "s"}</span>
          <span>{formatRelativeTime(list.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#EAECF0] pt-2">
          <span>{list.isPublic ? "Compartilhável" : "Privada"}</span>
          <span className="inline-flex items-center gap-1 text-[#2162A1] transition group-hover:underline">
            Abrir
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AccountProfileOverview({
  user,
  profileStats,
  recentNotifications,
  recentLists,
  recentComments,
}: AccountProfileOverviewProps) {
  const [tab, setTab] = useState<HubTab>("activities");

  const activityNotifications = recentNotifications.filter((notification) =>
    isActivityNotification(notification.type)
  );
  const commentNotifications = recentNotifications.filter((notification) =>
    isCommentNotification(notification.type)
  );
  const interactionNotifications = recentNotifications.filter((notification) =>
    isInteractionNotification(notification.type)
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`${accountSectionClass} overflow-hidden`}>
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName || "Perfil"}
                  width={96}
                  height={96}
                  className="h-18 w-18 rounded-full border border-[#D5D9D9] object-cover shadow-[0_1px_3px_rgba(15,17,17,0.08)] sm:h-20 sm:w-20"
                  unoptimized
                />
              ) : (
                <div className="flex h-18 w-18 items-center justify-center rounded-full border border-[#D5D9D9] bg-[#9F43BF] text-2xl font-black text-white shadow-[0_1px_3px_rgba(15,17,17,0.08)] sm:h-20 sm:w-20 sm:text-3xl">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className={accountKickerClass}>Minha conta</p>
              <h1 className="mt-2 truncate text-[26px] font-black leading-tight text-[#0F1111] sm:text-[32px]">
                {user.displayName}
              </h1>
              <p className="mt-1 text-[14px] font-semibold text-[#667085]">
                @{user.username || "sem-username"}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-[#EAECF0] pt-4 text-[13px] text-[#565959]">
            <div className="flex items-center justify-between gap-3">
              <span>Membro desde</span>
              <span className="font-semibold text-[#0F1111]">{formatDate(profileStats.memberSince)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Listas criadas</span>
              <span className="font-semibold text-[#0F1111]">{profileStats.listsCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Alertas recentes</span>
              <span className="font-semibold text-[#0F1111]">{activityNotifications.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Comentários</span>
              <span className="font-semibold text-[#0F1111]">{profileStats.commentsCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Reações</span>
              <span className="font-semibold text-[#0F1111]">{profileStats.commentReactionsCount}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-[#EAECF0] pt-4">
            <p className={accountKickerClass}>Acesso rápido</p>
            <div className="mt-3 grid gap-2">
              <Link href="/minha-conta/listas" className={accountSecondaryButtonClass + " w-full justify-center"}>
                Minhas listas
              </Link>
              <Link href="/notificacoes" className={accountSecondaryButtonClass + " w-full justify-center"}>
                Notificações
              </Link>
              <Link
                href="/minha-conta/configuracoes"
                className={accountSecondaryButtonClass + " w-full justify-center"}
              >
                Configurações
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <section className={`${accountSectionClass} overflow-hidden`}>
        <div className="border-b border-[#EAECF0] px-4 py-4 sm:px-5 md:px-6">
          <div className="flex flex-col gap-2">
            <p className={accountKickerClass}>Hub da conta</p>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[22px] font-black leading-tight text-[#0F1111] sm:text-[24px]">
                  Atividade recente
                </h2>
                <p className={`${accountBodyClass} mt-1 max-w-2xl`}>
                  Acompanhe listas, comentários e alertas úteis em um lugar mais compacto e direto.
                </p>
              </div>
              <Link href="/notificacoes" className={accountTertiaryLinkClass}>
                Ver central
              </Link>
            </div>
          </div>

          <div className="mt-4 border-b border-[#D5D9D9]">
            <div className="-mb-px flex gap-5 overflow-x-auto">
              {(
                [
                  ["activities", "Atividades"],
                  ["comments", "Comentários"],
                  ["interactions", "Interações"],
                ] as Array<[HubTab, string]>
              ).map(([value, label]) => {
                const active = tab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`border-b-2 px-0 pb-2.5 text-[14px] font-semibold transition ${
                      active
                        ? "border-[#2162A1] text-[#0F1111]"
                        : "border-transparent text-[#667085] hover:text-[#0F1111]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5 md:p-6">
          {tab === "activities" ? (
            <>
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className={accountKickerClass}>Suas listas recentes</p>
                    <h3 className="mt-1 text-[18px] font-black text-[#0F1111]">Últimas listas atualizadas</h3>
                  </div>
                  <Link href="/minha-conta/listas" className={accountTertiaryLinkClass}>
                    Ver listas
                  </Link>
                </div>

                {recentLists.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D5D9D9] bg-[#F8FAFA] px-4 py-8 text-[13px] text-[#565959]">
                    Nenhuma lista recente por enquanto.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {recentLists.map((list) => (
                      <CompactListCard key={list.id} list={list} userUsername={user.username} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className={accountKickerClass}>Monitoramento</p>
                    <h3 className="mt-1 text-[18px] font-black text-[#0F1111]">Movimento recente</h3>
                  </div>
                  <Link href="/notificacoes" className={accountTertiaryLinkClass}>
                    Abrir central
                  </Link>
                </div>

                <div className="space-y-3">
                  {activityNotifications.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-[#D5D9D9] bg-[#F8FAFA] px-4 py-8 text-[13px] text-[#565959]">
                      Nenhum alerta de produto por enquanto.
                    </div>
                  ) : (
                    activityNotifications.slice(0, 4).map((notification) => (
                      <HubCard
                        key={notification.id}
                        href={notification.href ?? "/notificacoes"}
                        icon={getNotificationIcon(notification.type)}
                        title={notification.title}
                        body={notification.body || "Acompanhe este produto na central de notificações."}
                        meta={formatRelativeTime(notification.createdAt)}
                      />
                    ))
                  )}
                </div>
              </section>
            </>
          ) : null}

          {tab === "comments" ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className={accountKickerClass}>Comentários</p>
                  <h3 className="mt-1 text-[18px] font-black text-[#0F1111]">Últimas mensagens publicadas</h3>
                </div>
                <Link href="/notificacoes" className={accountTertiaryLinkClass}>
                  Ver respostas
                </Link>
              </div>

              <div className="space-y-3">
                {recentComments.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D5D9D9] bg-[#F8FAFA] px-4 py-8 text-[13px] text-[#565959]">
                    Você ainda não publicou comentários.
                  </div>
                ) : (
                  recentComments.map((comment) => (
                    <HubCard
                      key={comment.id}
                      href={`/produto/${comment.productId}?comments=1`}
                      icon={<MessageCircle className="h-4 w-4" />}
                      title={comment.productName}
                      body={comment.body}
                      meta={formatRelativeTime(comment.createdAt)}
                    />
                  ))
                )}
              </div>
            </section>
          ) : null}

          {tab === "interactions" ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className={accountKickerClass}>Interações</p>
                  <h3 className="mt-1 text-[18px] font-black text-[#0F1111]">Reações e engajamento</h3>
                </div>
                <Link href="/notificacoes" className={accountTertiaryLinkClass}>
                  Ver central
                </Link>
              </div>

              <div className="space-y-3">
                {interactionNotifications.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#D5D9D9] bg-[#F8FAFA] px-4 py-8 text-[13px] text-[#565959]">
                    Nenhuma interação recente por enquanto.
                  </div>
                ) : (
                  interactionNotifications.slice(0, 5).map((notification) => (
                    <HubCard
                      key={notification.id}
                      href={notification.href ?? "/notificacoes"}
                      icon={<Heart className="h-4 w-4" />}
                      title={notification.title}
                      body={notification.body || "Uma interação relevante chegou para você."}
                      meta={formatRelativeTime(notification.createdAt)}
                    />
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

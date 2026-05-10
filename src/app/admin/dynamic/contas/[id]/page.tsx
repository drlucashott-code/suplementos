import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MonitorSmartphone, UserRound, ListChecks, MessageSquareText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteSiteUser, toggleUserCommentsBlock } from "../actions";
import { getAccountMonitoringRows, getAccountMonitoringTimeline } from "@/lib/admin/accountMonitoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function relativeTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;
  return formatDate(date);
}

function badgeClass(label: string) {
  if (label === "Muito engajado" || label === "Saudável" || label === "Ativo") return "bg-[#ECFDF3] text-[#027A48]";
  if (label === "Agora" || label === "Hoje" || label === "Recente") return "bg-[#EEF5FB] text-[#2162A1]";
  if (label === "Atenção" || label === "Pouco ativo") return "bg-[#FFFAEB] text-[#B54708]";
  return "bg-[#FEF3F2] text-[#B42318]";
}

export default async function AdminDynamicAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await getAccountMonitoringRows();
  const row = rows.find((entry) => entry.id === id);
  if (!row) notFound();

  const sessions = await prisma.$queryRaw<
    Array<{
      id: string;
      userAgent: string | null;
      createdAt: Date;
      expiresAt: Date;
      ipAddress: string | null;
    }>
  >`
    SELECT
      s."id",
      s."userAgent",
      s."createdAt",
      s."expiresAt",
      s."ipAddress"
    FROM "SiteSession" s
    WHERE s."userId" = ${row.id}
    ORDER BY s."createdAt" DESC
    LIMIT 8
  `;

  const timeline = await getAccountMonitoringTimeline(row.id);
  const primaryDevice = row.deviceLabel;
  const healthTone = badgeClass(row.healthLabel);
  const activityTone = badgeClass(row.activityLabel);

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-4 text-[#0F1111] sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#2162A1]">
              <UserRound className="h-3.5 w-3.5" />
              Perfil administrativo
            </div>
            <h1 className="truncate text-[26px] font-black tracking-tight text-[#0F1111] sm:text-[30px]">
              {row.displayName}
            </h1>
            <div className="mt-1 text-[13px] text-[#565959]">
              {row.username ? `@${row.username}` : "Sem username"} · {row.email}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dynamic/contas"
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#D5D9D9] bg-white px-3.5 text-[12px] font-bold text-[#0F1111] transition hover:bg-[#F7F8F8]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
            <form action={toggleUserCommentsBlock}>
              <input type="hidden" name="userId" value={row.id} />
              <input type="hidden" name="blocked" value={row.commentsBlocked ? "false" : "true"} />
              <button
                type="submit"
                className={`inline-flex h-9 items-center rounded-[8px] px-3.5 text-[12px] font-bold ${
                  row.commentsBlocked
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {row.commentsBlocked ? "Desbloquear comentários" : "Bloquear comentários"}
              </button>
            </form>
            <form action={deleteSiteUser}>
              <input type="hidden" name="userId" value={row.id} />
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-[8px] border border-red-200 bg-red-50 px-3.5 text-[12px] font-bold text-red-700"
              >
                Excluir conta
              </button>
            </form>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Último acesso", value: relativeTime(row.lastAccessAt), icon: Clock3 },
            { label: "Listas criadas", value: row.listsCreated, icon: ListChecks },
            { label: "Comentários", value: row.totalComments, icon: MessageSquareText },
            { label: "Monitorados", value: row.monitoredProductsCount, icon: MonitorSmartphone },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">
                  <Icon className="h-3.5 w-3.5 text-[#2162A1]" />
                  {card.label}
                </div>
                <div className="text-[26px] font-black tracking-tight text-[#0F1111]">{card.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className="space-y-4 rounded-[14px] border border-[#D5D9D9] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Identidade</div>
                <div className="mt-1 text-[18px] font-black text-[#0F1111]">Resumo administrativo</div>
              </div>
              <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.18em] ${healthTone}`}>
                {row.healthLabel}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[12px] border border-[#EAECF0] bg-[#F8FAFB] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Conta</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">{row.displayName}</div>
                <div className="mt-1 text-[12px] text-[#667085]">{row.email}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.16em] ${activityTone}`}>
                    {row.activityLabel}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full bg-[#F2F4F7] px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#475467]">
                    {row.googleId ? "Google OAuth" : "Email/senha"}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full bg-[#F2F4F7] px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#475467]">
                    Score {row.riskScore}/100
                  </span>
                </div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] bg-[#F8FAFB] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Dispositivo principal</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">
                  {primaryDevice.browser} · {primaryDevice.os}
                </div>
                <div className="mt-1 text-[12px] text-[#667085]">
                  Última sessão {formatDate(row.lastSessionAt)}
                </div>
                <div className="mt-2 text-[12px] text-[#565959]">
                  {row.activeSessionCount > 0 ? "Sessão ativa recente" : "Sem sessão ativa recente"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[12px] border border-[#EAECF0] px-3 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Acessos</div>
                <div className="mt-1 text-[14px] font-black text-[#0F1111]">{row.sessions30d} sessões / 30d</div>
                <div className="mt-1 text-[12px] text-[#667085]">Último login {formatDate(row.lastLoginAt)}</div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] px-3 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Notificações</div>
                <div className="mt-1 text-[14px] font-black text-[#0F1111]">
                  {row.centralEnabled ? "Central ON" : "Central OFF"} · {row.emailEnabled ? "Email ON" : "Email OFF"} ·{" "}
                  {row.pushEnabled ? "Push ON" : "Push OFF"}
                </div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] px-3 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Saúde</div>
                <div className="mt-1 text-[14px] font-black text-[#0F1111]">{row.healthLabel}</div>
                <div className="mt-1 text-[12px] text-[#667085]">
                  {row.commentsBlocked ? "Comentários bloqueados" : "Sem bloqueios"}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-[14px] border border-[#D5D9D9] bg-white p-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Atividade recente</div>
              <div className="mt-1 text-[18px] font-black text-[#0F1111]">Linha do tempo</div>
            </div>

            <div className="space-y-2">
              {timeline.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#D5D9D9] bg-[#F8FAFB] px-4 py-8 text-[13px] text-[#565959]">
                  Nenhuma atividade recente encontrada.
                </div>
              ) : (
                timeline.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href ?? "/admin/dynamic/contas"}
                    className="block rounded-[12px] border border-[#EAECF0] px-3 py-3 transition hover:border-[#D0D5DD] hover:bg-[#F8FAFB]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#0F1111]">{item.title}</div>
                        <div className="mt-1 line-clamp-2 text-[12px] text-[#565959]">{item.body ?? "Sem detalhes."}</div>
                      </div>
                      <div className="shrink-0 text-[11px] text-[#98A2B3]">{relativeTime(item.createdAt)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[14px] border border-[#D5D9D9] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Engajamento</div>
                <div className="mt-1 text-[18px] font-black text-[#0F1111]">Conteúdo e interações</div>
              </div>
              <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.18em] ${activityTone}`}>
                {row.activityLabel}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[12px] border border-[#EAECF0] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Listas</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">
                  {row.listsCreated} criadas · {row.publicLists} públicas · {row.privateLists} privadas
                </div>
                <div className="mt-1 text-[12px] text-[#667085]">{row.followersCount} seguidores nas listas</div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Comentários</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">
                  {row.totalComments} no total
                </div>
                <div className="mt-1 text-[12px] text-[#667085]">
                  {row.productCommentsCount} produtos · {row.listCommentsCount} listas
                </div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Reações</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">
                  {row.productReactionsGiven + row.listReactionsGiven} dadas
                </div>
                <div className="mt-1 text-[12px] text-[#667085]">
                  {row.productReactionsReceived + row.listReactionsReceived} recebidas
                </div>
              </div>
              <div className="rounded-[12px] border border-[#EAECF0] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7A869A]">Monitoramento</div>
                <div className="mt-1 text-[13px] font-bold text-[#0F1111]">{row.monitoredProductsCount} produtos</div>
                <div className="mt-1 text-[12px] text-[#667085]">
                  Lista útil para retenção e compras recorrentes
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[14px] border border-[#D5D9D9] bg-white p-4">
            <div className="mb-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Acessos</div>
              <div className="mt-1 text-[18px] font-black text-[#0F1111]">Sessões recentes</div>
            </div>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#D5D9D9] bg-[#F8FAFB] px-4 py-8 text-[13px] text-[#565959]">
                  Nenhuma sessão encontrada.
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-[12px] border border-[#EAECF0] px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#0F1111]">
                          {session.userAgent ?? "Sessão sem user agent"}
                        </div>
                        <div className="mt-1 text-[12px] text-[#667085]">
                          Criada em {formatDate(session.createdAt)} · expira {formatDate(session.expiresAt)}
                        </div>
                      </div>
                      <span className="inline-flex h-6 items-center rounded-full bg-[#F2F4F7] px-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#475467]">
                        {relativeTime(session.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

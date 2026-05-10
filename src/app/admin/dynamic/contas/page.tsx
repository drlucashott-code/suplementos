import Link from "next/link";
import { ChevronRight, Clock3, MonitorSmartphone, Search, ShieldAlert, UserRound, Users, CalendarDays, ListChecks, MessageSquareText } from "lucide-react";
import { deleteSiteUser, toggleUserCommentsBlock } from "./actions";
import {
  filterAccountMonitoringRows,
  getAccountMonitoringRows,
  type AccountMonitoringFilter,
  paginateAccountMonitoringRows,
} from "@/lib/admin/accountMonitoring";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatCompactDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatRelativeTime(value: Date | string | null | undefined) {
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
  return formatCompactDate(date);
}

function getBadgeTone(label: string) {
  if (label === "Muito engajado" || label === "Saudável" || label === "Ativo") {
    return "bg-[#ECFDF3] text-[#027A48]";
  }
  if (label === "Agora" || label === "Hoje" || label === "Recente") {
    return "bg-[#EEF5FB] text-[#2162A1]";
  }
  if (label === "Atenção" || label === "Pouco ativo") {
    return "bg-[#FFFAEB] text-[#B54708]";
  }
  return "bg-[#FEF3F2] text-[#B42318]";
}

function getFilterLabel(filter: AccountMonitoringFilter) {
  switch (filter) {
    case "active":
      return "Ativos";
    case "new":
      return "Novos";
    case "abandoned":
      return "Abandonados";
    case "push":
      return "Push ON";
    case "no-lists":
      return "Sem listas";
    case "suspicious":
      return "Suspeitos";
    case "power":
      return "Power users";
    case "inactive":
      return "Inativos";
    default:
      return "Todos";
  }
}

function buildFilterHref(params: URLSearchParams, filter: AccountMonitoringFilter) {
  const next = new URLSearchParams(params);
  if (filter === "all") {
    next.delete("filter");
  } else {
    next.set("filter", filter);
  }
  next.delete("page");
  const suffix = next.toString();
  return suffix ? `/admin/dynamic/contas?${suffix}` : "/admin/dynamic/contas";
}

export default async function AdminDynamicAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const filter = (typeof resolvedSearchParams?.filter === "string" ? resolvedSearchParams.filter : "all") as AccountMonitoringFilter;
  const page = Math.max(1, Number(typeof resolvedSearchParams?.page === "string" ? resolvedSearchParams.page : "1") || 1);
  const pageSize = 25;

  const rows = await getAccountMonitoringRows();
  const filteredRows = filterAccountMonitoringRows(rows, filter, q);
  const pagination = paginateAccountMonitoringRows(filteredRows, page, pageSize);

  const totalUsers = rows.length;
  const activeToday = rows.filter((row) => Date.now() - row.lastAccessAt.getTime() <= 24 * 60 * 60_000).length;
  const newToday = rows.filter((row) => Date.now() - row.createdAt.getTime() <= 24 * 60 * 60_000).length;
  const returning7d = rows.filter((row) => {
    const lastAccessDays = Math.floor((Date.now() - row.lastAccessAt.getTime()) / 86_400_000);
    const createdDays = Math.floor((Date.now() - row.createdAt.getTime()) / 86_400_000);
    return lastAccessDays <= 7 && createdDays > 7;
  }).length;
  const abandoned = rows.filter((row) => {
    const lastAccessDays = Math.floor((Date.now() - row.lastAccessAt.getTime()) / 86_400_000);
    return lastAccessDays >= 30 && row.totalComments === 0 && row.listsCreated === 0 && row.monitoredProductsCount === 0;
  }).length;
  const pushEnabledPct = totalUsers === 0 ? 0 : Math.round((rows.filter((row) => row.pushEnabled).length / totalUsers) * 100);
  const avgListsPerUser = totalUsers === 0 ? 0 : Number((rows.reduce((sum, row) => sum + row.listsCreated, 0) / totalUsers).toFixed(1));
  const avgCommentsPerUser = totalUsers === 0 ? 0 : Number((rows.reduce((sum, row) => sum + row.totalComments, 0) / totalUsers).toFixed(1));
  const noActivityAfterSignup = rows.filter((row) => {
    const ageDays = Math.floor((Date.now() - row.createdAt.getTime()) / 86_400_000);
    return ageDays >= 7 && row.totalComments === 0 && row.listsCreated === 0 && row.monitoredProductsCount === 0;
  }).length;

  const currentParams = new URLSearchParams();
  if (q) currentParams.set("q", q);
  if (filter !== "all") currentParams.set("filter", filter);

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-4 text-[#0F1111] sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-col gap-3 rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#2162A1]">
                <Users className="h-3.5 w-3.5" />
                Monitorização
              </div>
              <h1 className="text-[26px] font-black tracking-tight text-[#0F1111] sm:text-[30px]">
                Contas
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-[#565959]">
                Visão compacta de atividade, retenção, engajamento e sinais de risco.
              </p>
            </div>

            <Link
              href="/admin/dynamic"
              className="inline-flex h-9 items-center rounded-[8px] border border-[#D5D9D9] bg-white px-3.5 text-[12px] font-bold text-[#0F1111] transition hover:bg-[#F7F8F8]"
            >
              Voltar ao admin
            </Link>
          </div>

          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nome, username ou email"
                className="h-10 w-full rounded-[8px] border border-[#D5D9D9] bg-[#FCFCFD] pl-10 pr-4 text-[13px] outline-none transition focus:border-[#2162A1] focus:bg-white"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="sr-only" type="submit">
                Buscar
              </button>
              {(["all", "active", "new", "abandoned", "push", "no-lists", "suspicious", "power", "inactive"] as const).map(
                (item) => (
                  <Link
                    key={item}
                    href={buildFilterHref(currentParams, item)}
                    className={`inline-flex h-10 items-center rounded-[8px] border px-3.5 text-[12px] font-bold transition ${
                      filter === item
                        ? "border-[#2162A1] bg-[#EEF5FB] text-[#2162A1]"
                        : "border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8]"
                    }`}
                  >
                    {getFilterLabel(item)}
                  </Link>
                ),
              )}
            </div>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Ativos hoje", value: activeToday, icon: Clock3 },
            { label: "Novos hoje", value: newToday, icon: UserRound },
            { label: "Retornando 7d", value: returning7d, icon: CalendarDays },
            { label: "Abandonadas", value: abandoned, icon: ShieldAlert },
            { label: "Push ON", value: `${pushEnabledPct}%`, icon: MonitorSmartphone },
            { label: "Média de listas", value: avgListsPerUser, icon: ListChecks },
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

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Saúde da base</div>
            <div className="mt-2 text-[24px] font-black text-[#0F1111]">{noActivityAfterSignup}</div>
            <div className="mt-1 text-[13px] text-[#565959]">Contas sem atividade após o cadastro</div>
          </div>
          <div className="rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Média de comentários</div>
            <div className="mt-2 text-[24px] font-black text-[#0F1111]">{avgCommentsPerUser}</div>
            <div className="mt-1 text-[13px] text-[#565959]">Comentários por usuário cadastrado</div>
          </div>
          <div className="rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Total na base</div>
            <div className="mt-2 text-[24px] font-black text-[#0F1111]">{totalUsers}</div>
            <div className="mt-1 text-[13px] text-[#565959]">Usuários carregados para análise</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-[#D5D9D9] bg-white">
          <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">Lista</div>
              <div className="text-[15px] font-black text-[#0F1111]">
                {filteredRows.length} resultados
              </div>
            </div>
            <div className="text-[12px] text-[#565959]">
              Página {pagination.currentPage} de {pagination.totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1700px] w-full border-collapse text-left">
              <thead className="bg-[#F8FAFB] text-[10px] font-black uppercase tracking-[0.22em] text-[#7A869A]">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Acesso</th>
                  <th className="px-4 py-3">Conteúdo</th>
                  <th className="px-4 py-3">Interação</th>
                  <th className="px-4 py-3">Notificações</th>
                  <th className="px-4 py-3">Risco</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {pagination.items.map((row) => {
                  const statusTone = getBadgeTone(row.activityLabel);
                  const healthTone = getBadgeTone(row.healthLabel);
                  return (
                    <tr key={row.id} className="align-top hover:bg-[#F8FAFB]">
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF5FB] text-[13px] font-black text-[#2162A1]">
                            {(row.displayName?.[0] ?? row.email[0] ?? "?").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-[#0F1111]">{row.displayName}</div>
                            <div className="truncate text-[12px] text-[#667085]">
                              {row.username ? `@${row.username}` : "sem username"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="inline-flex h-6 items-center rounded-full bg-[#F2F4F7] px-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#475467]">
                                {row.googleId ? "Google OAuth" : "Email/senha"}
                              </span>
                              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.18em] ${statusTone}`}>
                                {row.activityLabel}
                              </span>
                              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.18em] ${healthTone}`}>
                                {row.healthLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[12px] text-[#0F1111]">
                        <div className="space-y-1.5">
                          <div>
                            <span className="font-bold">Último acesso:</span> {formatRelativeTime(row.lastAccessAt)}
                          </div>
                          <div>
                            <span className="font-bold">Último login:</span> {formatCompactDate(row.lastLoginAt)}
                          </div>
                          <div>
                            <span className="font-bold">Sessões 30d:</span> {row.sessions30d}
                          </div>
                          <div>
                            <span className="font-bold">Dispositivo:</span> {row.deviceLabel.browser} · {row.deviceLabel.os}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[12px] text-[#0F1111]">
                        <div className="space-y-1.5">
                          <div>
                            <span className="font-bold">Listas:</span> {row.listsCreated}{" "}
                            <span className="text-[#667085]">
                              ({row.publicLists} públicas / {row.privateLists} privadas)
                            </span>
                          </div>
                          <div>
                            <span className="font-bold">Monitorados:</span> {row.monitoredProductsCount}
                          </div>
                          <div>
                            <span className="font-bold">Comentários:</span> {row.totalComments}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[12px] text-[#0F1111]">
                        <div className="space-y-1.5">
                          <div>
                            <span className="font-bold">Curtidas dadas:</span> {row.productReactionsGiven + row.listReactionsGiven}
                          </div>
                          <div>
                            <span className="font-bold">Curtidas recebidas:</span> {row.productReactionsReceived + row.listReactionsReceived}
                          </div>
                          <div>
                            <span className="font-bold">Seguidores:</span> {row.followersCount}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[12px] text-[#0F1111]">
                        <div className="space-y-1.5">
                          <div>
                            <span className="font-bold">Central:</span> {row.centralEnabled ? "Ativo" : "Off"}
                          </div>
                          <div>
                            <span className="font-bold">Email:</span> {row.emailEnabled ? "Ativo" : "Off"}
                          </div>
                          <div>
                            <span className="font-bold">Push:</span> {row.pushEnabled ? "Ativo" : "Off"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[12px] text-[#0F1111]">
                        <div className="space-y-1.5">
                          <div>
                            <span className="font-bold">Score:</span> {row.riskScore}/100
                          </div>
                          <div>
                            <span className="font-bold">Última atividade:</span> {formatRelativeTime(row.lastAccessAt)}
                          </div>
                          <div className="text-[#667085]">
                            {row.commentsBlocked ? "Comentários bloqueados" : "Conta sem bloqueio"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/dynamic/contas/${row.id}`}
                            className="inline-flex h-8 items-center rounded-[8px] border border-[#D5D9D9] bg-white px-3 text-[11px] font-bold text-[#0F1111] transition hover:bg-[#F7F8F8]"
                          >
                            Abrir perfil
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                          <form action={toggleUserCommentsBlock}>
                            <input type="hidden" name="userId" value={row.id} />
                            <input type="hidden" name="blocked" value={row.commentsBlocked ? "false" : "true"} />
                            <button
                              type="submit"
                              className={`inline-flex h-8 items-center rounded-[8px] px-3 text-[11px] font-bold transition ${
                                row.commentsBlocked
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {row.commentsBlocked ? "Desbloquear" : "Bloquear"}
                            </button>
                          </form>
                          <form action={deleteSiteUser}>
                            <input type="hidden" name="userId" value={row.id} />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-[8px] border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
                            >
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#D5D9D9] bg-white px-4 py-3 text-[12px] text-[#565959]">
          <div>
            Mostrando {pagination.items.length} de {filteredRows.length} usuários filtrados
          </div>
          <div className="flex items-center gap-2">
            {pagination.currentPage > 1 ? (
              <Link
                href={`${
                  currentParams.toString() ? `/admin/dynamic/contas?${currentParams.toString()}&page=${pagination.currentPage - 1}` : `/admin/dynamic/contas?page=${pagination.currentPage - 1}`
                }`}
                className="inline-flex h-9 items-center rounded-[8px] border border-[#D5D9D9] bg-white px-3.5 font-bold text-[#0F1111]"
              >
                Página anterior
              </Link>
            ) : null}
            {pagination.currentPage < pagination.totalPages ? (
              <Link
                href={`${
                  currentParams.toString() ? `/admin/dynamic/contas?${currentParams.toString()}&page=${pagination.currentPage + 1}` : `/admin/dynamic/contas?page=${pagination.currentPage + 1}`
                }`}
                className="inline-flex h-9 items-center rounded-[8px] border border-[#D5D9D9] bg-white px-3.5 font-bold text-[#0F1111]"
              >
                Próxima página
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

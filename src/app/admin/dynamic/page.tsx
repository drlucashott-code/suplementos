import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidateDynamicCatalogCategoryRefs } from "@/lib/dynamicCatalogRevalidation";
import { getPriceRefreshBudgetSnapshot } from "@/lib/priceRefreshBudget";
import CacheResetButton, { type CacheResetState } from "@/components/admin/CacheResetButton";

type CardColor = "blue" | "emerald" | "purple" | "sky" | "orange" | "yellow" | "red" | "amber" | "gray";

const cardStyles: Record<
  CardColor,
  {
    iconBg: string;
    iconText: string;
    hoverBorder: string;
  }
> = {
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    hoverBorder: "hover:border-blue-200",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    hoverBorder: "hover:border-emerald-200",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    hoverBorder: "hover:border-purple-200",
  },
  sky: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    hoverBorder: "hover:border-sky-200",
  },
  orange: {
    iconBg: "bg-orange-50",
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-200",
  },
  yellow: {
    iconBg: "bg-yellow-50",
    iconText: "text-yellow-600",
    hoverBorder: "hover:border-yellow-200",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    hoverBorder: "hover:border-red-200",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    hoverBorder: "hover:border-amber-200",
  },
  gray: {
    iconBg: "bg-gray-50",
    iconText: "text-gray-700",
    hoverBorder: "hover:border-gray-300",
  },
};

function AdminCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: CardColor;
}) {
  const style = cardStyles[color];

  return (
    <Link href={href} className="group">
      <div
        className={`h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.hoverBorder}`}
      >
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110 ${style.iconBg} ${style.iconText}`}
        >
          {icon}
        </div>
        <h2 className="mb-1 text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

function BudgetCard({
  title,
  hourlyUsed,
  hourlyLimit,
  dailyUsed,
  dailyLimit,
  tone,
}: {
  title: string;
  hourlyUsed: number;
  hourlyLimit: number;
  dailyUsed: number;
  dailyLimit: number;
  tone: "blue" | "emerald";
}) {
  const palette =
    tone === "blue"
      ? {
          dot: "bg-blue-600",
          ring: "border-blue-100",
          pill: "bg-blue-50 text-blue-700",
        }
      : {
          dot: "bg-emerald-600",
          ring: "border-emerald-100",
          pill: "bg-emerald-50 text-emerald-700",
        };

  return (
    <div className={`rounded-3xl border bg-white p-6 shadow-sm ${palette.ring}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Orcamento de refresh
            </span>
          </div>
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${palette.pill}`}>
          ativo
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Hora atual
          </span>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">{hourlyUsed}</span>
            <span className="pb-1 text-sm font-semibold text-gray-500">/ {hourlyLimit}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
            Dia atual
          </span>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-black text-gray-900">{dailyUsed}</span>
            <span className="pb-1 text-sm font-semibold text-gray-500">/ {dailyLimit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulerStatCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: "blue" | "emerald" | "orange" | "red" | "gray";
}) {
  const styles = {
    blue: "border-blue-100 bg-blue-50/50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50/50 text-orange-700",
    red: "border-red-100 bg-red-50/50 text-red-700",
    gray: "border-gray-200 bg-white text-gray-700",
  } as const;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles[tone]}`}>
      <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">
        {title}
      </span>
      <div className="mt-3 text-3xl font-black">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

async function revalidateAllDynamicCatalog(
  _prevState: CacheResetState,
  _formData: FormData
): Promise<CacheResetState> {
  "use server";

  const categories = await prisma.dynamicCategory.findMany({
    select: { group: true, slug: true },
  });

  const refs = categories
    .map((category) => ({
      group: category.group || "",
      slug: category.slug,
    }))
    .filter((category) => category.group && category.slug);

  if (refs.length > 0) {
    revalidateDynamicCatalogCategoryRefs(refs);
  }

  return {
    ok: true,
    count: refs.length,
    message:
      refs.length > 0
        ? `Cache limpo (${refs.length} categorias)`
        : "Nenhuma categoria para revalidar",
  };
}

export default async function AdminDynamicDashboard() {
  const now = new Date();
  const GLOBAL_HOURLY_REQUEST_LIMIT = Math.max(
    50,
    Number(process.env.AMAZON_GLOBAL_HOURLY_REQUEST_LIMIT ?? 800)
  );
  const GLOBAL_DAILY_REQUEST_LIMIT = Math.max(
    200,
    Number(process.env.AMAZON_GLOBAL_DAILY_REQUEST_LIMIT ?? 12000)
  );
  const PRIORITY_HOURLY_REQUEST_LIMIT = Math.max(
    20,
    Number(process.env.AMAZON_PRIORITY_HOURLY_REQUEST_LIMIT ?? 240)
  );
  const PRIORITY_DAILY_REQUEST_LIMIT = Math.max(
    100,
    Number(process.env.AMAZON_PRIORITY_DAILY_REQUEST_LIMIT ?? 4000)
  );

  const [
    totalProducts,
    totalCategories,
    budgetSnapshots,
    dynamicDueCount,
    trackedDueCount,
    dynamicLockedCount,
    trackedLockedCount,
    dynamicHotCount,
    dynamicWarmCount,
    dynamicColdCount,
    trackedHotCount,
    trackedWarmCount,
    trackedColdCount,
    dynamicFailingCount,
    trackedFailingCount,
  ] = await Promise.all([
    prisma.dynamicProduct.count(),
    prisma.dynamicCategory.count(),
    getPriceRefreshBudgetSnapshot({
      scopes: ["global_dynamic_refresh", "priority_dynamic_refresh"],
    }),
    prisma.dynamicProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
          },
        ],
      },
    }),
    prisma.siteTrackedAmazonProduct.count({
      where: {
        AND: [
          {
            OR: [{ refreshLockUntil: null }, { refreshLockUntil: { lte: now } }],
          },
          {
            OR: [{ nextPriceRefreshAt: null }, { nextPriceRefreshAt: { lte: now } }],
          },
        ],
      },
    }),
    prisma.dynamicProduct.count({
      where: { refreshLockUntil: { gt: now } },
    }),
    prisma.siteTrackedAmazonProduct.count({
      where: { refreshLockUntil: { gt: now } },
    }),
    prisma.dynamicProduct.count({ where: { refreshTier: "hot" } }),
    prisma.dynamicProduct.count({ where: { refreshTier: "warm" } }),
    prisma.dynamicProduct.count({ where: { refreshTier: "cold" } }),
    prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "hot" } }),
    prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "warm" } }),
    prisma.siteTrackedAmazonProduct.count({ where: { refreshTier: "cold" } }),
    prisma.dynamicProduct.count({ where: { refreshFailCount: { gt: 0 } } }),
    prisma.siteTrackedAmazonProduct.count({ where: { refreshFailCount: { gt: 0 } } }),
  ]);

  const globalBudget =
    budgetSnapshots.find((snapshot) => snapshot.scope === "global_dynamic_refresh") ?? null;
  const priorityBudget =
    budgetSnapshots.find((snapshot) => snapshot.scope === "priority_dynamic_refresh") ?? null;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Admin Panel
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Catalogo Dinamico
            </h1>
            <p className="font-medium text-gray-500">
              Gerenciamento central do amazonpicks.com.br
            </p>
          </div>

          <div className="flex gap-4">
            <div className="min-w-[120px] rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center shadow-sm">
              <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                Total de itens
              </span>
              <span className="text-2xl font-black text-blue-600">
                {totalProducts}
              </span>
            </div>
            <div className="min-w-[120px] rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center shadow-sm">
              <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                Categorias
              </span>
              <span className="text-2xl font-black text-purple-600">
                {totalCategories}
              </span>
            </div>
          </div>

          <CacheResetButton action={revalidateAllDynamicCatalog} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            title="Importar via API"
            description="Processamento em lote pela Amazon. Nome, foto e preco direto da origem."
            href="/admin/dynamic/importar"
            icon="R"
            color="blue"
          />

          <AdminCard
            title="Gerenciar Produtos"
            description="Edicao de atributos, revisao de categorias e ajustes finos por item."
            href="/admin/dynamic/produtos"
            icon="P"
            color="emerald"
          />

          <AdminCard
            title="Categorias"
            description="Gerencie categorias dinamicas e suas regras de exibicao."
            href="/admin/dynamic/categorias"
            icon="C"
            color="purple"
          />

          <AdminCard
            title="Cliques"
            description="Veja os produtos mais clicados e a atividade recente."
            href="/admin/dynamic/cliques"
            icon="K"
            color="sky"
          />

          <AdminCard
            title="Pendencias"
            description="Mostra apenas lacunas de cadastro que dependem de correcao manual."
            href="/admin/dynamic/pendencias"
            icon="!"
            color="orange"
          />

          <AdminCard
            title="Criar Nova Categoria"
            description="Defina novos slugs e a configuracao de comparacao publica."
            href="/admin/dynamic/nova-categoria"
            icon="+"
            color="yellow"
          />

          <AdminCard
            title="Execucoes"
            description="Historico da rotina automatica de atualizacao de precos."
            href="/admin/dynamic/execucoes"
            icon="$"
            color="red"
          />

          <AdminCard
            title="Refresh Scheduler"
            description="Veja urgencia, tiers, locks e os produtos que mais pressionam a fila."
            href="/admin/dynamic/refresh-scheduler"
            icon="T"
            color="emerald"
          />

          <AdminCard
            title="Fallback"
            description="Controle o fallback global de precos do site dinamico."
            href="/admin/dynamic/fallback"
            icon="F"
            color="amber"
          />

          <AdminCard
            title="Reports"
            description="Problemas reportados pelos usuarios nos cards de oferta."
            href="/admin/dynamic/reports"
            icon="?"
            color="orange"
          />

          <AdminCard
            title="Comentários"
            description="Modere comentários públicos, respostas e interações dos usuários."
            href="/admin/dynamic/comentarios"
            icon="M"
            color="sky"
          />

          <AdminCard
            title="Sugestões"
            description="Revise ideias de produtos enviadas pelos usuários antes de importar."
            href="/admin/dynamic/sugestoes"
            icon="U"
            color="amber"
          />

          <AdminCard
            title="Contas"
            description="Veja contas criadas, comentarios e aplique bloqueio silencioso ou exclusao."
            href="/admin/dynamic/contas"
            icon="A"
            color="purple"
          />

          <AdminCard
            title="Expansoes"
            description="Audite ASINs descobertos na expansao e identifique os que faltam importar."
            href="/admin/dynamic/expansoes"
            icon="E"
            color="blue"
          />

          <AdminCard
            title="Ver no Site"
            description="Abra a versao publica para validar categorias, cards e ordenacoes."
            href="/"
            icon="S"
            color="gray"
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BudgetCard
            title="Global scheduler"
            hourlyUsed={globalBudget?.hourRequestCount ?? 0}
            hourlyLimit={GLOBAL_HOURLY_REQUEST_LIMIT}
            dailyUsed={globalBudget?.dayRequestCount ?? 0}
            dailyLimit={GLOBAL_DAILY_REQUEST_LIMIT}
            tone="blue"
          />
          <BudgetCard
            title="Priority refresh"
            hourlyUsed={priorityBudget?.hourRequestCount ?? 0}
            hourlyLimit={PRIORITY_HOURLY_REQUEST_LIMIT}
            dailyUsed={priorityBudget?.dayRequestCount ?? 0}
            dailyLimit={PRIORITY_DAILY_REQUEST_LIMIT}
            tone="emerald"
          />
        </div>

        <div className="mt-12">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Scheduler health
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900">Saude da fila de refresh</h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Uma leitura rapida do que esta vencido agora, do que esta travado e de como os
              produtos estao distribuídos entre hot, warm e cold.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SchedulerStatCard
              title="Dinamicos vencidos"
              value={String(dynamicDueCount)}
              description="Produtos do comparador ja elegiveis para novo refresh."
              tone="blue"
            />
            <SchedulerStatCard
              title="Amazon internos vencidos"
              value={String(trackedDueCount)}
              description="Produtos adicionados por link aguardando nova consulta."
              tone="emerald"
            />
            <SchedulerStatCard
              title="Locks ativos"
              value={String(dynamicLockedCount + trackedLockedCount)}
              description={`Dinamicos: ${dynamicLockedCount} • Amazon internos: ${trackedLockedCount}`}
              tone="orange"
            />
            <SchedulerStatCard
              title="Falhas pendentes"
              value={String(dynamicFailingCount + trackedFailingCount)}
              description={`Dinamicos: ${dynamicFailingCount} • Amazon internos: ${trackedFailingCount}`}
              tone="red"
            />
            <SchedulerStatCard
              title="Tier hot"
              value={String(dynamicHotCount + trackedHotCount)}
              description={`Dinamicos: ${dynamicHotCount} • Amazon internos: ${trackedHotCount}`}
              tone="gray"
            />
            <SchedulerStatCard
              title="Tier warm"
              value={String(dynamicWarmCount + trackedWarmCount)}
              description={`Dinamicos: ${dynamicWarmCount} • Amazon internos: ${trackedWarmCount}`}
              tone="gray"
            />
            <SchedulerStatCard
              title="Tier cold"
              value={String(dynamicColdCount + trackedColdCount)}
              description={`Dinamicos: ${dynamicColdCount} • Amazon internos: ${trackedColdCount}`}
              tone="gray"
            />
            <SchedulerStatCard
              title="Monitorados internos"
              value={String(trackedHotCount + trackedWarmCount + trackedColdCount)}
              description="Base total de produtos por link ja incorporados ao scheduler."
              tone="gray"
            />
          </div>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-3xl bg-gray-900 p-8 text-white shadow-2xl">
          <div className="relative z-10">
            <h3 className="mb-2 text-xl font-bold">Arquitetura unificada</h3>
            <p className="max-w-xl text-sm leading-relaxed text-gray-400">
              O admin dinamico centraliza catalogo, cliques, pendencias, fallback e
              execucoes automatizadas na mesma interface.
            </p>
          </div>
          <div className="pointer-events-none absolute right-[-5%] top-[-20%] select-none text-[120px] font-black opacity-[0.03]">
            DYNAMIC
          </div>
        </div>
      </div>
    </div>
  );
}

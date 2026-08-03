import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

type QueryRow = Record<string, unknown>;

type NeonReport = {
  generatedAt: string;
  database: QueryRow;
  activity: QueryRow;
  storage: QueryRow[];
  indexes: QueryRow[];
  refresh24h: QueryRow;
  priority24h: QueryRow;
  history24h: QueryRow;
  scheduler: QueryRow;
  notifications: QueryRow;
  extensions: QueryRow[];
  statementStats: QueryRow[];
  limitations: string[];
};

type NeonSnapshot = {
  refresh24h?: QueryRow;
  history24h?: QueryRow;
  scheduler?: QueryRow;
};

const { Client } = pg;

function getArg(name: string) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : null;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

async function query(client: pg.Client, sql: string) {
  const result = await client.query<QueryRow>(sql);
  return result.rows;
}

async function queryOne(client: pg.Client, sql: string): Promise<QueryRow> {
  return (await query(client, sql))[0] ?? {};
}

async function collectReport(): Promise<NeonReport> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const database = await queryOne(
      client,
      `SELECT current_database() AS "database", NOW() AS "serverTime"`
    );

    const activity = await queryOne(
      client,
      `SELECT
         COUNT(*)::int AS connections,
         COUNT(*) FILTER (WHERE state = 'active')::int AS active
       FROM pg_stat_activity
       WHERE datname = current_database()`
    );

    const storage = await query(
      client,
      `SELECT
         relname AS "table",
         n_live_tup::bigint AS "liveRows",
         n_dead_tup::bigint AS "deadRows",
         pg_total_relation_size(relid)::bigint AS "bytes",
         pg_size_pretty(pg_total_relation_size(relid)) AS "size"
       FROM pg_stat_user_tables
       ORDER BY pg_total_relation_size(relid) DESC
       LIMIT 20`
    );

    const indexes = await query(
      client,
      `SELECT
         table_name AS "table",
         index_name AS "index",
         pg_relation_size(index_oid)::bigint AS "bytes",
         pg_size_pretty(pg_relation_size(index_oid)) AS "size"
       FROM (
         SELECT
           t.relname AS table_name,
           i.relname AS index_name,
           i.oid AS index_oid
         FROM pg_class t
         JOIN pg_index x ON x.indrelid = t.oid
         JOIN pg_class i ON i.oid = x.indexrelid
         WHERE t.relkind = 'r'
       ) indexes
       ORDER BY pg_relation_size(index_oid) DESC
       LIMIT 20`
    );

    const refresh24h = await queryOne(
      client,
      `SELECT
         COUNT(*)::int AS runs,
         COALESCE(SUM("totalOffers"), 0)::bigint AS offers,
         COALESCE(SUM("updatedOffers"), 0)::bigint AS updated,
         COALESCE(SUM("failedOffers"), 0)::bigint AS failed,
         COALESCE(SUM("outOfStockOffers"), 0)::bigint AS "outOfStock",
         ROUND(AVG(EXTRACT(EPOCH FROM ("finishedAt" - "startedAt")))::numeric, 1) AS "avgDurationSeconds"
       FROM "GlobalPriceRefreshRun"
       WHERE "startedAt" >= NOW() - INTERVAL '24 hours'`
    );

    const priority24h = await queryOne(
      client,
      `SELECT
         COUNT(*)::int AS runs,
         COALESCE(SUM("processedMessages"), 0)::bigint AS messages,
         COALESCE(SUM("uniqueAsins"), 0)::bigint AS asins,
         COALESCE(SUM("updatedProducts"), 0)::bigint AS updated
       FROM "PriorityRefreshRun"
       WHERE "startedAt" >= NOW() - INTERVAL '24 hours'`
    );

    const history24h = await queryOne(
      client,
      `SELECT
         COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours')::bigint AS "dynamicCreated",
         COUNT(*) FILTER (WHERE "updatedAt" >= NOW() - INTERVAL '24 hours')::bigint AS "dynamicTouched",
         COUNT(DISTINCT "productId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours')::bigint AS "dynamicProducts",
         (SELECT COUNT(*) FROM "SiteTrackedAmazonProductPriceHistory" WHERE "updatedAt" >= NOW() - INTERVAL '24 hours')::bigint AS "trackedTouched"
       FROM "DynamicPriceHistory"`
    );

    const scheduler = await queryOne(
      client,
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE "nextPriceRefreshAt" IS NULL OR "nextPriceRefreshAt" <= NOW())::int AS due,
         COUNT(*) FILTER (WHERE "availabilityStatus" = 'OUT_OF_STOCK')::int AS "outOfStock",
         COUNT(*) FILTER (WHERE "lastSuccessfulRefreshAt" IS NULL)::int AS "neverSuccessful",
         COUNT(*) FILTER (WHERE "refreshFailCount" > 0)::int AS failures,
         COUNT(*) FILTER (WHERE "refreshFailCount" >= 4)::int AS "repeatedFailures",
         COUNT(*) FILTER (WHERE COALESCE("lastSuccessfulRefreshAt", "createdAt") < NOW() - INTERVAL '7 days')::int AS "staleOver7d"
       FROM "DynamicProduct"`
    );

    const notifications = await queryOne(
      client,
      `SELECT COUNT(*)::bigint AS total
       FROM "SiteUserNotification"
       WHERE "createdAt" >= NOW() - INTERVAL '30 days'`
    );

    const extensions = await query(
      client,
      `SELECT name, installed_version AS "installedVersion"
       FROM pg_available_extensions
       WHERE name IN ('pg_stat_statements', 'hypopg')`
    );

    let statementStats: QueryRow[] = [];
    const hasPgStatStatements = extensions.some(
      (extension) => extension.name === "pg_stat_statements" && extension.installedVersion
    );

    if (hasPgStatStatements) {
      statementStats = await query(
        client,
        `SELECT
           LEFT(query, 180) AS query,
           calls::bigint AS calls,
           ROUND(total_exec_time::numeric, 1) AS "totalMs",
           ROUND((total_exec_time / NULLIF(calls, 0))::numeric, 2) AS "avgMs",
           rows::bigint AS rows
         FROM pg_stat_statements
         ORDER BY total_exec_time DESC
         LIMIT 20`
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      database,
      activity,
      storage,
      indexes,
      refresh24h,
      priority24h,
      history24h,
      scheduler,
      notifications,
      extensions,
      statementStats,
      limitations: hasPgStatStatements
        ? []
        : ["pg_stat_statements não está instalado; ranking de queries indisponível."],
    };
  } finally {
    await client.end();
  }
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function printHuman(report: NeonReport) {
  const refresh = report.refresh24h;
  const scheduler = report.scheduler;
  const history = report.history24h;

  console.log(`Neon Usage Report — ${report.generatedAt}`);
  console.log(`Banco: ${report.database.database} | Servidor: ${report.database.serverTime}`);
  console.log(
    `Conexões: ${report.activity.active} ativas / ${report.activity.connections} abertas`
  );
  console.log(
    `Refresh 24h: ${refresh.runs} execuções, ${refresh.offers} tentativas, ${refresh.updated} atualizados, ${refresh.failed} falhas, ${refresh.outOfStock} sem estoque`
  );
  console.log(`Duração média do refresh: ${refresh.avgDurationSeconds ?? 0}s`);
  console.log(
    `Histórico 24h: ${history.dynamicCreated} pontos criados, ${history.dynamicTouched} pontos tocados, ${history.dynamicProducts} produtos`
  );
  console.log(
    `Scheduler: ${scheduler.total} produtos, ${scheduler.due} vencidos, ${scheduler.repeatedFailures} com falhas repetidas, ${scheduler.staleOver7d} >7d sem sucesso`
  );
  console.log(`Notificações 30d: ${notificationsValue(report.notifications)}`);
  console.log("Maiores tabelas:");
  for (const table of report.storage.slice(0, 5)) {
    console.log(`  - ${table.table}: ${table.size} (${table.liveRows} linhas)`);
  }
  if (report.limitations.length > 0) {
    for (const limitation of report.limitations) console.log(`Limitação: ${limitation}`);
  }
}

function notificationsValue(notifications: QueryRow) {
  return numberValue(notifications.total);
}

function field(row: QueryRow | undefined, name: string) {
  return row?.[name];
}

function buildComparison(current: NeonReport, previous: NeonSnapshot) {
  const metrics = [
    ["refresh24h.offers", field(current.refresh24h, "offers"), field(previous.refresh24h, "offers")],
    ["refresh24h.updated", field(current.refresh24h, "updated"), field(previous.refresh24h, "updated")],
    ["refresh24h.failed", field(current.refresh24h, "failed"), field(previous.refresh24h, "failed")],
    ["refresh24h.avgDurationSeconds", field(current.refresh24h, "avgDurationSeconds"), field(previous.refresh24h, "avgDurationSeconds")],
    ["history24h.dynamicTouched", field(current.history24h, "dynamicTouched"), field(previous.history24h, "dynamicTouched")],
    ["scheduler.due", field(current.scheduler, "due"), field(previous.scheduler, "due")],
    ["scheduler.repeatedFailures", field(current.scheduler, "repeatedFailures"), field(previous.scheduler, "repeatedFailures")],
    ["scheduler.staleOver7d", field(current.scheduler, "staleOver7d"), field(previous.scheduler, "staleOver7d")],
  ];

  return metrics.map(([metric, currentValue, previousValue]) => {
    const currentNumber = numberValue(currentValue);
    const previousNumber = numberValue(previousValue);
    return {
      metric,
      previous: previousNumber,
      current: currentNumber,
      delta: currentNumber - previousNumber,
      percent:
        previousNumber === 0
          ? null
          : Number((((currentNumber - previousNumber) / previousNumber) * 100).toFixed(2)),
    };
  });
}

const report = await collectReport();
const comparePath = getArg("--compare");
let comparison: ReturnType<typeof buildComparison> | undefined;

if (comparePath) {
  const previous = JSON.parse(fs.readFileSync(path.resolve(comparePath), "utf8")) as NeonSnapshot;
  comparison = buildComparison(report, previous);
}

const outputPath = getArg("--out");

if (outputPath) {
  const resolvedPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify({ ...report, comparison }, null, 2)}\n`, "utf8");
  console.error(`Snapshot salvo em ${resolvedPath}`);
}

if (hasFlag("--json")) {
  console.log(JSON.stringify({ ...report, comparison }, null, 2));
} else {
  printHuman(report);
  if (comparison) {
    console.log("Comparação com snapshot anterior:");
    for (const item of comparison) {
      const percent = item.percent == null ? "n/a" : `${item.percent}%`;
      console.log(`  - ${item.metric}: ${item.previous} -> ${item.current} (${percent})`);
    }
  }
}

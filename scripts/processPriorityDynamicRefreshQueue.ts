import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { processPriorityRefreshQueue } from "../src/lib/priorityRefreshProcessor";
import { triggerDynamicCatalogRevalidationFromScript } from "./lib/triggerDynamicCatalogRevalidation";

processPriorityRefreshQueue()
  .then(async (summary) => {
    console.log("Processamento da fila prioritaria concluido.");
    console.log(
      `Mensagens: ${summary.processedMessages} | ASINs unicos: ${summary.uniqueAsins} | Atualizados: ${summary.updatedProducts} | Pulados: ${summary.skippedProducts}`
    );

    const revalidation = await triggerDynamicCatalogRevalidationFromScript(
      summary.updatedCategoryRefs,
      "priority_refresh_script"
    );

    if (!revalidation.skipped) {
      console.log(
        `Catalogo dinamico revalidado remotamente para ${summary.updatedCategoryRefs.length} categorias.`
      );
    }
  })
  .catch((error) => {
    console.error("Erro ao processar fila prioritaria:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

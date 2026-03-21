import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { processPriorityRefreshQueue } from "../src/lib/priorityRefreshProcessor";

processPriorityRefreshQueue()
  .then((summary) => {
    console.log("Processamento da fila prioritaria concluido.");
    console.log(
      `Mensagens: ${summary.processedMessages} | ASINs unicos: ${summary.uniqueAsins} | Atualizados: ${summary.updatedProducts} | Pulados: ${summary.skippedProducts}`
    );
  })
  .catch((error) => {
    console.error("Erro ao processar fila prioritaria:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

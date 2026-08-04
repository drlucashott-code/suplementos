# OperaÃ§Ã£o do Scheduler V2

O V2 Ã© opt-in. Um deploy sem variÃ¡veis do scheduler mantÃ©m todos os produtos e
todos os workers no comportamento legado.

## VariÃ¡veis centralizadas

Todos os parÃ¢metros estÃ£o em `src/lib/scheduler/scheduler.config.ts`. A­justes
de produÃ§Ã£o devem ser feitos pelas variÃ¡veis `SCHEDULER_V2_*`, nunca por valores
hardcoded no worker.

Flags necessÃ¡rias para executar uma coorte V2:

```text
SCHEDULER_V2_ENABLED=true
SCHEDULER_V2_OBSERVATION_LEDGER_ENABLED=true
SCHEDULER_V2_URGENT_QUEUE_ENABLED=true
SCHEDULER_V2_ROLLOUT_PERCENTAGE=5
SCHEDULER_V2_PHASE_ANCHOR_AT=2026-01-01T00:00:00.000Z
```

`SCHEDULER_V2_URGENT_QUEUE_ENABLED` sÃ³ libera mensagens SQS para cliques dos
produtos V2. A agenda-base continua independente dela.

## Ordem de rollout

1. Aplicar a migration aditiva com `npx prisma migrate deploy`.
2. Fazer deploy com todas as flags desligadas.
3. Para shadow, definir somente `SCHEDULER_V2_SHADOW_MODE=true`; o workflow
   registra em `PriceRefreshScheduleDecision` a agenda proposta, motivo e
   evidÃªncia, sem mudar qualquer produto.
4. Revisar as decisÃµes em shadow por alguns ciclos.
5. Definir as quatro flags acima e executar uma vez:

   ```powershell
   npm run scheduler:v2:rollout -- --percentage=5
   ```

   O comando sÃ³ migra a coorte determinÃ­stica de 5%, inicializando-a a partir
   de `DynamicPriceHistory`. Ele pode ser repetido com 10, 25, 50 e 100; cada
   produto jÃ¡ V2 fica intacto.
6. Aumentar a variÃ¡vel `SCHEDULER_V2_ROLLOUT_PERCENTAGE` para o mesmo percentual
   (ou maior) no GitHub Actions, para que o worker use o novo caminho.

## Garantias operacionais

- A posse de um refresh Ã© atÃ´mica (`FOR UPDATE SKIP LOCKED`) e tem token e revisÃ£o.
- O resultado sÃ³ Ã© aplicado por quem possui o token; resultado atrasado Ã© ignorado.
- Falha de lote da Amazon libera e agenda retry sem ocultar produtos. Falha
  individual continua ocultando o produto, como a regra atual do catÃ¡logo.
- Um refresh urgente registra observaÃ§Ã£o, mas nÃ£o muda a taxa, o bootstrap ou
  `nextPriceRefreshAt` base.
- O rollback imediato Ã© `SCHEDULER_V2_ENABLED=false`. A coorte passa pelo fluxo
  legado na prÃ³xima execuÃ§Ã£o; nenhuma tabela precisa ser removida.

## VerificaÃ§Ãµes em cada etapa

- `PriceRefreshObservation`: quantidade por `reason`, `result`, latÃªncia e erros.
- `PriceRefreshScheduleDecision`: distribuiÃ§Ã£o de `reason` e `intervalMinutes`.
- `DynamicProduct`: quantidade por `schedulerVersion`, vencidos, locks vencidos e
  `refreshFailCount`.
- `PriceRefreshBudgetWindow`: consumo global e prioritÃ¡rio por hora/dia.

NÃ£o habilitar `SCHEDULER_V2_ENABLED` sem `SCHEDULER_V2_OBSERVATION_LEDGER_ENABLED`:
a validaÃ§Ã£o de configuraÃ§Ã£o bloqueia essa combinaÃ§Ã£o.

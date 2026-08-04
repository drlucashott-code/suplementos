# Baseline de migrations — Scheduler V2

O repositório ainda não possui `prisma/migrations`. Por isso, nenhuma migration
V2 pode ser aplicada antes de registrar um baseline que corresponda exatamente
ao schema já existente no Neon.

## Procedimento obrigatório antes da primeira migration

1. Fazer backup lógico do banco e confirmar que a URL usada é o ambiente alvo.
2. Gerar um baseline a partir de `prisma/schema.prisma` em um ambiente isolado.
3. Comparar o baseline com o banco alvo usando `prisma migrate diff`.
4. Prosseguir apenas se a comparação não apontar drift inesperado.
5. Marcar somente o baseline como aplicado no banco existente.
6. Criar a migration incremental V2, somente aditiva, e testá-la primeiro em
   banco de desenvolvimento.

## Garantias da primeira migration V2

- Não haverá `DROP`, renomeação destrutiva ou alteração de tipo em dados atuais.
- Feature flags permanecerão desligadas após o deploy.
- Rollback operacional será desligar a V2; campos e tabelas aditivos permanecem
  inativos até a investigação.
- A migration não será executada por scripts de atualização de preços.

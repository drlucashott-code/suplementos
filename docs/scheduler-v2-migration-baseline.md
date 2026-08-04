# Histórico de migrations — Scheduler V2

O Neon já possuía migrations registradas. Os arquivos correspondentes haviam
sido removidos do repositório no commit `0d9251d`, mas foram restaurados
exatamente do commit anterior para que o histórico local corresponda à tabela
`_prisma_migrations` existente.

## Procedimento obrigatório antes da primeira migration V2

1. Fazer backup lógico do banco e confirmar que a URL usada é o ambiente alvo.
2. Executar `prisma migrate status` e exigir que o histórico local corresponda
   ao histórico registrado no Neon.
3. Comparar o schema com o banco usando `prisma migrate diff`.
4. Prosseguir apenas se a comparação não apontar drift inesperado.
5. Criar a migration incremental V2, somente aditiva, e testá-la primeiro em
   banco de desenvolvimento.

## Garantias da primeira migration V2

- Não haverá `DROP`, renomeação destrutiva ou alteração de tipo em dados atuais.
- Feature flags permanecerão desligadas após o deploy.
- Rollback operacional será desligar a V2; campos e tabelas aditivos permanecem
  inativos até a investigação.
- A migration não será executada por scripts de atualização de preços.

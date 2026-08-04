# Homepage experimental — análise e arquitetura

## Diagnóstico da homepage oficial

A home oficial já tem bons ativos: busca global, dados reais, imagens consistentes, histórico de preços, comparadores e listas públicas. O problema principal é a sequência. Um hero alto explica o produto antes de entregar valor; quatro argumentos, carrossel editorial, categorias e só depois ofertas aumentam o tempo até o primeiro produto clicável. A navegação por categoria também expõe muitos cartões de uma vez, e as listas são ordenadas por novidade, não por utilidade social.

O resultado é correto, mas exige que o visitante entenda o AmazonPicks antes de usá-lo. No mobile, a primeira dobra deve resolver uma intenção, não apresentar todas as capacidades.

## O que foi adaptado da Amazon Mobile

A Amazon vem testando uma homepage móvel baseada em agrupamentos relacionados, rolagem horizontal e recomendações contextuais. A loja brasileira também alterna blocos de ofertas, produtos populares e entradas visuais por categoria. Foram aproveitados os princípios, não o layout:

- busca persistente no cabeçalho;
- blocos independentes com título curto e ação “ver tudo”;
- trilho horizontal com parte do próximo cartão visível;
- produto, desconto e preço como hierarquia dominante;
- categorias visuais de acesso rápido;
- conteúdo social apresentado como curadoria, não como menu.

Não foram copiados o hero promocional, “Compre novamente” ou personalização comportamental. Esses padrões dependem de escala de catálogo, pedidos e histórico que o AmazonPicks ainda não possui. Fonte de referência: [redesign da homepage da Amazon](https://www.aboutamazon.com/news/retail/amazon-homepage-redesign-features).

## Wireframe mobile

```text
[ cabeçalho e busca existentes ]
[ aviso curto: comparador, não marketplace ]

TOP OFERTAS
Maiores quedas vs. média de 30 dias
[Todas] [Suplementos] [Casa] [Pets]
[ oferta ][ oferta ][próxima →]
[ Ver todas as ofertas ]

COMPRAR POR CATEGORIA
Custo-benefício, mesmo sem promoção
[Suplementos] [Casa] [Pets]
[ categoria ][ categoria ]
[ categoria ][ categoria ]

LISTAS DA COMUNIDADE
Seleções feitas por pessoas
[ collage + título + autor + prova social ][próxima →]
[ Explorar todas ] [ Criar minha lista ]
```

## Justificativa e críticas

As três áreas são boas como arquitetura de valor, mas não deveriam excluir busca e transparência; por isso elas permanecem no chrome da página, sem virar uma quarta seção. “Top ofertas” primeiro é coerente com alta intenção e favorece CTR. Já o comparador precisa declarar explicitamente que mede custo-benefício, pois misturá-lo ao desconto enfraqueceria as duas promessas.

Ordenar ofertas somente por queda percentual tem um risco: preço de referência inflado ou produto fraco pode vencer o ranking. A versão usa o pipeline existente, que exige preço atual válido, estoque, média de 30 dias, queda mínima e vendedor não bloqueado. Recomenda-se adicionar guardrails de frescor, amostra histórica e confiabilidade sem transformar avaliação ou popularidade no score de oferta.

Listas públicas também podem virar ruído ou spam. Nesta versão, salvamentos e atualização ajudam a ordenação; uma evolução deve combinar completude, CTR, salvamentos, recência e moderação.

## Implementação e mensuração

Rota isolada: `/experimental/home`, marcada como `noindex`. Nenhuma rota ou componente oficial foi alterado.

Reutilizados: `HeaderClient`, `AmazonHeader`, `TrackedDealLink`, `amazonImageLoader`, `getBestDeals`, Prisma, rotas públicas de listas e o footer global.

Novos: `ExperimentalHome`, `OfferRail`, `CategoryExplorer`, `CommunityLists` e tipos compartilhados. A página possui fallbacks de categoria e degrada com segurança se ofertas ou listas estiverem indisponíveis.

Eventos próprios permitem comparar CTR: visualização da home, filtro de ofertas, clique por categoria, clique e compartilhamento de lista. O teste recomendado deve comparar CTR por seção, cliques por sessão, profundidade de scroll, saída para a Amazon, abertura do comparador, listas salvas/criadas e retorno em 7 dias.

## Próximas oportunidades

Prioridades sugeridas: selo de frescor (“preço verificado há X h”), economia absoluta além do percentual, personalização leve por última categoria visitada, listas editoriais verificadas, seguir criadores/listas e alertas acionáveis. A página deve continuar curta; novos sinais devem enriquecer cartões existentes, não criar mais seções.

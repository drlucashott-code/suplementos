import { prisma } from "@/lib/prisma";

/**
 * Tipo simples para exibição de whey (por enquanto)
 */
type WheyItem = {
  id: string;
  title: string;
  brand: string;
  weightInGrams: number;
  imageUrl: string | null;
  price: number;
  affiliateUrl: string;
  rating: number | null;
};

export default async function WheyPage() {
  const products = await prisma.product.findMany({
    where: {
      category: "whey",
    },
    include: {
      prices: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  type ProductWithLatestPrice = (typeof products)[number];

  const list: WheyItem[] = products
    .map(
      (
        product: ProductWithLatestPrice
      ): WheyItem | null => {
        const price = product.prices[0];
        if (!price) return null;

        return {
          id: product.id,
          title: product.title,
          brand: product.brand,
          weightInGrams: product.weightInGrams,
          imageUrl: product.imageUrl,
          price: price.price,
          affiliateUrl: price.affiliateUrl,
          rating: price.rating,
        };
      }
    )
    .filter(
      (item: WheyItem | null): item is WheyItem =>
        item !== null
    );

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Whey Protein
      </h1>

      <p className="text-gray-600 mb-6">
        Lista de wheys disponíveis. O ranking por
        custo de proteína será adicionado em breve.
      </p>

      {list.length === 0 && (
        <p className="text-gray-500">
          Nenhum whey cadastrado no momento.
        </p>
      )}

      <ul className="space-y-4">
        {list.map((product: WheyItem) => (
          <li
            key={product.id}
            className="flex gap-4 items-center border rounded-lg p-4"
          >
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-20 h-20 object-contain"
              />
            )}

            <div className="flex-1">
              <h2 className="font-semibold">
                {product.title}
              </h2>
              <p className="text-sm text-gray-600">
                {product.brand} •{" "}
                {product.weightInGrams} g
              </p>
              <p className="text-sm">
                💰 R$ {product.price.toFixed(2)}
              </p>
              {product.rating !== null && (
                <p className="text-sm">
                  ⭐ {product.rating}
                </p>
              )}
            </div>

            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Comprar
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

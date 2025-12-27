SELECT 
  o.id,
  o."externalId",
  o.price,
  o."updatedAt",
  p.name,
  p.category
FROM "Offer" o
JOIN "Product" p ON p.id = o."productId"
WHERE o.store = 'AMAZON'
ORDER BY o."updatedAt" DESC;

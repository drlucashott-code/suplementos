SELECT 
  p.id,
  p.name,
  p.category
FROM "Product" p
JOIN "CreatineInfo" c ON c."productId" = p.id
WHERE p.category = 'whey';

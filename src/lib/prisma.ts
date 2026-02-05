import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// 1. Configuramos o pool com suporte a SSL para o Neon
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Necessário para bancos na nuvem como Neon e Supabase
    rejectUnauthorized: false 
  }
});

// 2. Criamos o adaptador que o Prisma 7 exige
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter, 
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
import { defineConfig } from '@prisma/config';
import 'dotenv/config';

const config = defineConfig({
  // Caminho para o seu schema
  schema: 'prisma/schema.prisma',

  // Conexão com o banco para o CLI e Studio
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});

export default config;
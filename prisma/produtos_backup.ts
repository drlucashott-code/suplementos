import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Aqui você colocaria um loop para inserir seus produtos salvos
  console.log('Iniciando seed...')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
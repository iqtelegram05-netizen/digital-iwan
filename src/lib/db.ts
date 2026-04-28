import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// استخدام POSTGRES_PRISMA_URL من Vercel Postgres أو DATABASE_URL
const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || ''

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// استخدام POSTGRES_PRISMA_URL من Vercel Postgres أو DATABASE_URL
// On Vercel: POSTGRES_PRISMA_URL is auto-set when you create a Postgres store
// Locally: DATABASE_URL can be SQLite or PostgreSQL
// DIRECT_URL is used for migrations (non-pooled connection)
const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || ''
const directUrl = process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || ''

const datasourceConfig: Record<string, unknown> = {
  db: {
    url: databaseUrl,
  },
}

// If DIRECT_URL is available, use it for the direct connection (migrations)
if (directUrl) {
  datasourceConfig.db = {
    url: databaseUrl,
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: datasourceConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

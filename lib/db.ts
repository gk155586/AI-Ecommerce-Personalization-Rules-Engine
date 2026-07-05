import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN;

console.log('[lib/db.ts] Initializing database with URL:', databaseUrl);

const adapter = new PrismaLibSql({
  url: databaseUrl,
  authToken: authToken,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

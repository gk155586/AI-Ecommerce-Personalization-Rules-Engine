import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN;

const libsql = createClient({
  url: databaseUrl,
  authToken: authToken,
});

const adapter = new PrismaLibSql(libsql as any);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

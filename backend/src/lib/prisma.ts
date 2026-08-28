import { PrismaClient } from '@prisma/client';

// Éviter les instantiations multiples en dev (Prisma crée des warnings)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log('[prisma] Initializing with DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50));
console.log('[prisma] Full URL:', process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error', 'warn'],
  });

console.log('[prisma] PrismaClient created successfully');

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

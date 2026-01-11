import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('Database version:', result);
  } catch (error) {
    console.error('Error checking version:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

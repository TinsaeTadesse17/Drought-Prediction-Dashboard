const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true, region: true, woreda: true }
    });
    console.table(users);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

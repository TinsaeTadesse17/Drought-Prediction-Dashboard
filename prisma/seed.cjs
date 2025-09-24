// Simple seed script for local development
// Creates or updates canonical demo users.
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = [
    { email: 'admin@example.com', name: 'Admin', role: 'admin', region: null, woreda: null },
    { email: 'afar.officer@example.com', name: 'Afar Officer', role: 'regional_officer', region: 'afar', woreda: null },
    { email: 'somali.officer@example.com', name: 'Somali Officer', role: 'woreda_officer', region: 'somali', woreda: 'Godey' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, region: u.region, woreda: u.woreda },
      create: { email: u.email, name: u.name, role: u.role, region: u.region, woreda: u.woreda },
    })
  }
  console.log('Seed complete: inserted/updated', users.length, 'users')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

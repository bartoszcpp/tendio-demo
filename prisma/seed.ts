import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.profile.deleteMany();

  const nexorProfile = await prisma.profile.create({
    data: {
      companyName: 'Nexor Sp. z o.o.',
      industry: 'Instalacje elektryczne i fotowoltaika (OZE)',
      keywords: 'fotowoltaika,instalacja elektryczna,panele PV,pompa ciepła,oświetlenie,przyłącze',
      cpvCodes: '09331200,45311000,45315300,09332000',
      regions: 'wielkopolskie,lubuskie,łódzkie,kujawsko-pomorskie,dolnośląskie,opolskie',
      minBudget: 50000,
      maxBudget: 2000000,
    },
  });

  console.log('✅ Profil testowy Nexor dodany:', nexorProfile.companyName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
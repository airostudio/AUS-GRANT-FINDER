import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Federal Departments
  await prisma.department.createMany({
    data: [
      {
        name: 'Department of Infrastructure, Transport, Regional Development, Communications and the Arts',
        level: 'Federal',
        website: 'https://www.infrastructure.gov.au',
        grantPortal: 'https://www.grants.gov.au',
      },
      {
        name: 'Department of Health and Aged Care',
        level: 'Federal',
        website: 'https://www.health.gov.au',
        grantPortal: 'https://www.grants.gov.au',
      },
      {
        name: 'Department of Education',
        level: 'Federal',
        website: 'https://www.education.gov.au',
        grantPortal: 'https://www.grants.gov.au',
      },
      {
        name: 'Department of Climate Change, Energy, the Environment and Water',
        level: 'Federal',
        website: 'https://www.dcceew.gov.au',
        grantPortal: 'https://www.grants.gov.au',
      },
    ],
  });

  // Seed State Departments
  await prisma.department.createMany({
    data: [
      {
        name: 'Department of Jobs, Skills, Industry and Regions',
        level: 'State',
        state: 'VIC',
        website: 'https://djsir.vic.gov.au',
        grantPortal: 'https://tenders.vic.gov.au',
      },
      {
        name: 'NSW Department of Enterprise, Investment and Trade',
        level: 'State',
        state: 'NSW',
        website: 'https://www.investment.nsw.gov.au',
        grantPortal: 'https://nswbuy.com.au',
      },
      {
        name: 'Queensland Department of State Development and Infrastructure',
        level: 'State',
        state: 'QLD',
        website: 'https://www.statedevelopment.qld.gov.au',
        grantPortal: 'https://www.business.qld.gov.au/starting-business/grants-assistance',
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

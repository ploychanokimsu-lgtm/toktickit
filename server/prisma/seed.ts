import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ------------------------------------------------------------
  // Lab 1 / Lab 2: Seed supported Ticket Categories
  // Running the seed multiple times must not create duplicates.
  // ------------------------------------------------------------

  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {
        isActive: true,
      },
      create: {
        name,
        isActive: true,
      },
    });
  }

  console.log("Categories seeded successfully.");

  // ------------------------------------------------------------
  // Lab 2: Seed Related Systems
  // ------------------------------------------------------------

  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {
        isActive: true,
      },
      create: {
        name,
        isActive: true,
      },
    });
  }

  console.log("Related Systems seeded successfully.");

  // ------------------------------------------------------------
  // Lab 2: Seed Development Requesters
  // At least four active Requesters and one inactive Requester.
  // ------------------------------------------------------------

  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@example.com",
      isActive: true,
    },
    {
      name: "Narin Chaiyasit",
      email: "narin.chaiyasit@example.com",
      isActive: true,
    },
    {
      name: "Ploy Srisuk",
      email: "ploy.srisuk@example.com",
      isActive: true,
    },
    {
      name: "Alex Turner",
      email: "alex.turner@example.com",
      isActive: false,
    },
  ];

  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: {
        email: requester.email,
      },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }

  console.log("Development Requesters seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
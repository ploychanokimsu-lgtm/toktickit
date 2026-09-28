import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

type SeedUser = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

async function main() {
  // ------------------------------------------------------------
  // Require a local-only initial password.
  // Never commit real passwords to the repository.
  // ------------------------------------------------------------

  const initialPassword = process.env.LAB3_INITIAL_PASSWORD;

  if (
    !initialPassword ||
    initialPassword.length < 8 ||
    initialPassword.length > 72 ||
    !/[A-Z]/.test(initialPassword) ||
    !/[a-z]/.test(initialPassword) ||
    !/[0-9]/.test(initialPassword) ||
    !/[^A-Za-z0-9]/.test(initialPassword)
  ) {
    throw new Error(
      "Set LAB3_INITIAL_PASSWORD to a valid local-only password before seeding."
    );
  }

  const passwordHash = await bcrypt.hash(
    initialPassword,
    BCRYPT_ROUNDS
  );

  // ------------------------------------------------------------
  // Categories — preserve Lab 1 and Lab 2
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
      update: {},
      create: {
        name,
        isActive: true,
      },
    });
  }

  console.log("Categories seeded.");

  // ------------------------------------------------------------
  // Related Systems — preserve Lab 2
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
      update: {},
      create: {
        name,
        isActive: true,
      },
    });
  }

  console.log("Related Systems seeded.");

  // ------------------------------------------------------------
  // Lab 3 Requester accounts
  // ------------------------------------------------------------

  const requesters: SeedUser[] = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.com",
      role: "REQUESTER",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@example.com",
      role: "REQUESTER",
      isActive: true,
    },
    {
      name: "Narin Chaiyasit",
      email: "narin.chaiyasit@example.com",
      role: "REQUESTER",
      isActive: true,
    },
    {
      name: "Ploy Srisuk",
      email: "ploy.srisuk@example.com",
      role: "REQUESTER",
      isActive: true,
    },
    {
      name: "Alex Turner",
      email: "alex.turner@example.com",
      role: "REQUESTER",
      isActive: false,
    },
  ];

  // ------------------------------------------------------------
  // Lab 3 IT Staff accounts
  // ------------------------------------------------------------

  const staff: SeedUser[] = [
    {
      name: "Daniel Wilson",
      email: "daniel.wilson@example.com",
      role: "IT_STAFF",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      role: "IT_STAFF",
      isActive: true,
    },
    {
      name: "Kevin Patel",
      email: "kevin.patel@example.com",
      role: "IT_STAFF",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@example.com",
      role: "IT_STAFF",
      isActive: false,
    },
  ];

  // ------------------------------------------------------------
  // Lab 3 Administrator
  // ------------------------------------------------------------

  const administrators: SeedUser[] = [
    {
      name: "Alex Thompson",
      email: "admin@example.com",
      role: "ADMINISTRATOR",
      isActive: true,
    },
  ];

  const users = [
    ...requesters,
    ...staff,
    ...administrators,
  ];

  // ------------------------------------------------------------
  // Idempotent user creation
  // ------------------------------------------------------------

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  // ------------------------------------------------------------
  // Backfill migrated Lab 2 Requesters
  //
  // Only accounts without a password hash are updated.
  // Existing changed passwords remain untouched.
  // ------------------------------------------------------------

  const backfill = await prisma.user.updateMany({
    where: {
      passwordHash: null,
    },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  console.log(
    `Password hashes backfilled for ${backfill.count} existing users.`
  );

  console.log("Lab 3 users seeded successfully.");

  // ------------------------------------------------------------
  // Verification
  // ------------------------------------------------------------

  const requesterCount = await prisma.user.count({
    where: {
      role: "REQUESTER",
      isActive: true,
    },
  });

  const staffCount = await prisma.user.count({
    where: {
      role: "IT_STAFF",
      isActive: true,
    },
  });

  const adminCount = await prisma.user.count({
    where: {
      role: "ADMINISTRATOR",
      isActive: true,
    },
  });

  if (
    requesterCount < 4 ||
    staffCount < 3 ||
    adminCount < 1
  ) {
    throw new Error(
      "Required Lab 3 active account counts were not met."
    );
  }

  console.log("Seed verification:");
  console.log(`Active Requesters: ${requesterCount}`);
  console.log(`Active IT Staff: ${staffCount}`);
  console.log(`Active Administrators: ${adminCount}`);

  console.log("Lab 3 seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
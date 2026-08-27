import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth/password.js";

async function seed() {
  const email = (process.env.SUPERADMIN_EMAIL ?? "superadmin@example.com").toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? "ChangeMeNow!123";
  const name = process.env.SUPERADMIN_NAME ?? "Super Admin";

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "super_admin",
      companyId: null,
      status: "active",
    },
    create: {
      email,
      name,
      passwordHash,
      role: "super_admin",
      companyId: null,
      status: "active",
    },
  });

  console.info(`Seeded super_admin: ${user.email} (${user.id})`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_OWNER_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set PLATFORM_OWNER_EMAIL and PLATFORM_OWNER_PASSWORD in .env before seeding.");
  }
  if (password.length < 8) {
    throw new Error("PLATFORM_OWNER_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: process.env.PLATFORM_OWNER_NAME?.trim() || "Platform owner",
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      name: process.env.PLATFORM_OWNER_NAME?.trim() || "Platform owner",
    },
  });

  console.log("Platform owner ready");
  console.log(`  email: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

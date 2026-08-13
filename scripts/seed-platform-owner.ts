import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.PLATFORM_OWNER_EMAIL ?? "furqanjavedafridi@gmail.com").trim().toLowerCase();
  const password =
    process.env.PLATFORM_OWNER_PASSWORD?.trim() ||
    randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: "Furqan Afridi",
    },
    create: {
      email,
      passwordHash,
      role: Role.ADMIN,
      name: "Furqan Afridi",
    },
  });

  console.log("Platform owner ready");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${password}`);
  console.log("Change this password after first login.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

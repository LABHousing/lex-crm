const path = require("node:path");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || `file:${path.join(process.cwd(), "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing user (optional)
  await prisma.user.deleteMany();

  // Create user with the password
  const user = await prisma.user.create({
    data: {
      password: "LV&Cworks",
    },
  });

  console.log("✅ Database seeded with password: LV&Cworks");
  console.log("User created:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

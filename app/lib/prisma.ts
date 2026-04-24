import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  if (
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith("file:") ||
      process.env.DATABASE_URL === ":memory:")
  ) {
    return process.env.DATABASE_URL;
  }

  const relativeCandidates = ["./dev.db", "./lex-crm/dev.db"];
  const selectedRelativePath =
    relativeCandidates.find((candidate) =>
      fs.existsSync(path.resolve(process.cwd(), candidate))
    ) ?? relativeCandidates[0];

  return `file:${selectedRelativePath}`;
}

const databaseUrl = resolveDatabaseUrl();
const adapter = new PrismaBetterSqlite3(
  {
    url: databaseUrl,
  },
  {
    timestampFormat: "unixepoch-ms",
  }
);

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

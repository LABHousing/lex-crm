import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";

export type UserRole = "admin" | "viewer";
export type AppScope = "all" | "records-only";
export type RecordsScope = "all" | "contract-only";

export type AuthenticatedUser = {
  id: number;
  username: string | null;
  role: UserRole;
  appScope: AppScope;
  recordsScope: RecordsScope;
};

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function ensureLegacyAdminUser() {
  const legacyUsers = await prisma.user.findMany({
    where: { username: null },
    orderBy: { id: "asc" },
  });

  if (legacyUsers.length === 0) {
    return;
  }

  const existingUsers = await prisma.user.findMany({
    where: { username: { not: null } },
    select: { username: true },
  });
  const taken = new Set(
    existingUsers
      .map((user) => user.username)
      .filter((value): value is string => Boolean(value))
  );

  for (const user of legacyUsers) {
    let nextUsername = user.id === legacyUsers[0].id ? "admin" : `user${user.id}`;

    while (taken.has(nextUsername)) {
      nextUsername = `${nextUsername}-${user.id}`;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: nextUsername },
    });

    taken.add(nextUsername);
  }
}

export async function ensureUserPermissions() {
  await ensureLegacyAdminUser();

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      appScope: true,
      recordsScope: true,
    },
  });

  for (const user of users) {
    const username = user.username || `user${user.id}`;
    const isAdminUser = username === "admin";
    const isDispoUser = username === "dispo";

    const nextRole: UserRole = isAdminUser ? "admin" : "viewer";
    const nextAppScope: AppScope = isDispoUser ? "records-only" : "all";
    const nextRecordsScope: RecordsScope = isDispoUser ? "contract-only" : "all";

    if (
      user.role !== nextRole ||
      user.appScope !== nextAppScope ||
      user.recordsScope !== nextRecordsScope
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: nextRole,
          appScope: nextAppScope,
          recordsScope: nextRecordsScope,
        },
      });
    }
  }
}

export function createSessionToken(userId: number) {
  return Buffer.from(`${userId}:${Date.now()}`).toString("base64");
}

export function readSessionUserId(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userId] = decoded.split(":");
    const parsedId = Number(userId);
    return Number.isInteger(parsedId) ? parsedId : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  await ensureUserPermissions();

  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  const userId = readSessionUserId(token);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      appScope: true,
      recordsScope: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: (user.role || "viewer") as UserRole,
    appScope: (user.appScope || "all") as AppScope,
    recordsScope: (user.recordsScope || "all") as RecordsScope,
  } satisfies AuthenticatedUser;
}

export function isAdmin(user: AuthenticatedUser | null) {
  return user?.role === "admin";
}

export function canAccessPage(
  user: AuthenticatedUser | null,
  page: "home" | "leads" | "deals" | "records" | "schedule" | "users"
) {
  if (!user) {
    return false;
  }

  if (page === "records" || page === "schedule") {
    return true;
  }

  if (page === "users") {
    return isAdmin(user);
  }

  if (user.appScope === "records-only") {
    return false;
  }

  return true;
}

import { prisma } from "@/app/lib/prisma";
import {
  getAuthenticatedUser,
  isAdmin,
  normalizeUsername,
} from "@/app/lib/auth";

export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { username: "asc" },
      select: {
        id: true,
        username: true,
        role: true,
        appScope: true,
        recordsScope: true,
      },
    });

    return Response.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return Response.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const username = normalizeUsername(String(data.username || ""));
    const password = String(data.password || "");

    if (!username || username.length < 3) {
      return Response.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return Response.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return Response.json({ error: "Username already exists" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        password,
        role: username === "admin" ? "admin" : "viewer",
        appScope: username === "dispo" ? "records-only" : "all",
        recordsScope: username === "dispo" ? "contract-only" : "all",
      },
      select: {
        id: true,
        username: true,
        role: true,
        appScope: true,
        recordsScope: true,
      },
    });

    return Response.json(user);
  } catch (error) {
    console.error("Users POST error:", error);
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const id = Number(data.id);

    if (!Number.isInteger(id)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const username = user.username || "";
    const isAdminUser = username === "admin" || user.role === "admin";
    const requestedUsername =
      data.username === undefined ? undefined : normalizeUsername(String(data.username || ""));
    const requestedPassword =
      data.password === undefined ? undefined : String(data.password || "");

    if (requestedUsername !== undefined) {
      if (isAdminUser && requestedUsername !== "admin") {
        return Response.json({ error: "Admin username cannot be changed" }, { status: 403 });
      }

      if (!requestedUsername || requestedUsername.length < 3) {
        return Response.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        );
      }

      if (requestedUsername !== normalizeUsername(username)) {
        const existing = await prisma.user.findUnique({ where: { username: requestedUsername } });
        if (existing && existing.id !== user.id) {
          return Response.json({ error: "Username already exists" }, { status: 400 });
        }
      }
    }

    if (requestedPassword !== undefined && requestedPassword.length < 4) {
      return Response.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const nextRole = isAdminUser ? "admin" : data.role || "viewer";
    const nextAppScope = isAdminUser ? "all" : data.appScope || "all";
    const nextRecordsScope =
      isAdminUser
        ? "all"
        : nextAppScope === "records-only"
        ? data.recordsScope || "contract-only"
        : data.recordsScope || "all";

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: requestedUsername === undefined ? undefined : requestedUsername,
        password: requestedPassword === undefined ? undefined : requestedPassword,
        role: nextRole,
        appScope: nextAppScope,
        recordsScope: nextRecordsScope,
      },
      select: {
        id: true,
        username: true,
        role: true,
        appScope: true,
        recordsScope: true,
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Users PATCH error:", error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const id = Number(data.id);

    if (!Number.isInteger(id)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const username = normalizeUsername(user.username || "");
    if (username === "admin" || user.role === "admin") {
      return Response.json({ error: "Admin user cannot be deleted" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    return Response.json({ success: true, id });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

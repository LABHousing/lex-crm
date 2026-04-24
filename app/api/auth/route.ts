import { prisma } from "@/app/lib/prisma";
import {
  createSessionToken,
  ensureUserPermissions,
  getAuthenticatedUser,
  normalizeUsername,
} from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    await ensureUserPermissions();

    const { username, password } = await req.json();
    const normalizedUsername = normalizeUsername(String(username || ""));

    const user = normalizedUsername
      ? await prisma.user.findUnique({
          where: { username: normalizedUsername },
        })
      : null;

    if (!user) {
      return Response.json(
        { error: "Incorrect username or password" },
        { status: 401 }
      );
    }

    if (user.password === password) {
      const token = createSessionToken(user.id);
      const response = Response.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role || "viewer",
          appScope: user.appScope || "all",
          recordsScope: user.recordsScope || "all",
        },
      });
      response.headers.set(
        "Set-Cookie",
        `auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      );
      return response;
    } else {
      return Response.json(
        { error: "Incorrect username or password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Auth POST error:", error);
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    return Response.json({
      authenticated: !!user,
      user,
    });
  } catch (error) {
    console.error("Auth GET error:", error);
    return Response.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE() {
  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    "auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
  );
  return response;
}

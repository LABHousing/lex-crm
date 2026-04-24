import { prisma } from "@/app/lib/prisma";
import { ensureUserPermissions, normalizeUsername } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const existing = await prisma.user.findFirst();
    if (existing) {
      return Response.json(
        { error: "System already initialized" },
        { status: 400 }
      );
    }

    const { username, password } = await req.json();
    const normalizedUsername = normalizeUsername(String(username || ""));

    if (!normalizedUsername || normalizedUsername.length < 3) {
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

    await prisma.user.create({
      data: {
        username: normalizedUsername,
        password,
        role: "admin",
        appScope: "all",
        recordsScope: "all",
      },
    });

    return Response.json({ success: true, message: "System initialized" });
  } catch (error) {
    console.error("Auth init POST error:", error);
    return Response.json(
      { error: "Failed to initialize system" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await ensureUserPermissions();
    const user = await prisma.user.findFirst();
    return Response.json({ initialized: !!user });
  } catch (error) {
    console.error("Auth init GET error:", error);
    return Response.json({ initialized: false });
  }
}

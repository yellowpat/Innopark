import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { participantSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { getTranslations } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  if (session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const center = searchParams.get("center") || undefined;
  const role = searchParams.get("role") || undefined;

  const where: Record<string, unknown> = {};
  if (session.user.role === "CENTER_STAFF") {
    where.primaryCenter = session.user.primaryCenter;
  }
  if (center) where.primaryCenter = center;
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      primaryCenter: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = participantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: t.api.emailAlreadyExists },
        { status: 400 }
      );
    }

    const password = parsed.data.password || "changeme123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: parsed.data.role,
        primaryCenter: parsed.data.primaryCenter,
        active: parsed.data.active ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        primaryCenter: true,
        active: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Participant creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

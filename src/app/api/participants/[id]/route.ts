import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { participantSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { getTranslations } from "@/lib/i18n/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      primaryCenter: true,
      active: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: t.api.participantNotFound }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const data: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      primaryCenter: parsed.data.primaryCenter,
      active: parsed.data.active,
    };

    if (parsed.data.password) {
      data.password = await bcrypt.hash(parsed.data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        primaryCenter: true,
        active: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Participant update error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}

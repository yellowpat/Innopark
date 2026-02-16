import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function GET() {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const teachers = await prisma.teacher.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teachers);
}

export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const teacher = await prisma.teacher.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
      },
    });
    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    console.error("Teacher creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

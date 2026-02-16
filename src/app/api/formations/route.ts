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

  const formations = await prisma.formation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      teacher: true,
      sessions: {
        include: { _count: { select: { enrollments: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(formations);
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
    const sessions: { dates: string[] }[] = body.sessions || [];

    const formation = await prisma.formation.create({
      data: {
        name: body.name,
        teacherId: body.teacherId || null,
        maxCapacity: body.maxCapacity ?? null,
        sessions: {
          create: sessions.map((s) => ({
            dates: s.dates.map((d: string) => new Date(d)),
          })),
        },
      },
      include: {
        teacher: true,
        sessions: {
          include: { _count: { select: { enrollments: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return NextResponse.json(formation, { status: 201 });
  } catch (error) {
    console.error("Formation creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

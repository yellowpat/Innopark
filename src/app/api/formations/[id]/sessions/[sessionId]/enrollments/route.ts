import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const enrollments = await prisma.formationEnrollment.findMany({
    where: { sessionId: params.sessionId },
    include: {
      user: {
        select: { id: true, name: true, email: true, primaryCenter: true },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  return NextResponse.json(enrollments);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: t.api.invalidData }, { status: 400 });
    }

    const formationSession = await prisma.formationSession.findUnique({
      where: { id: params.sessionId },
      include: {
        formation: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!formationSession) {
      return NextResponse.json({ error: t.api.notFound }, { status: 404 });
    }

    if (
      formationSession.formation.maxCapacity !== null &&
      formationSession._count.enrollments >= formationSession.formation.maxCapacity
    ) {
      return NextResponse.json(
        { error: t.admin.allocations.classFull },
        { status: 400 }
      );
    }

    const enrollment = await prisma.formationEnrollment.create({
      data: {
        sessionId: params.sessionId,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, primaryCenter: true },
        },
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("Enrollment creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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
    const incomingSessions: { id?: string; dates: string[] }[] =
      body.sessions || [];

    const existing = await prisma.formationSession.findMany({
      where: { formationId: params.id },
    });
    const existingIds = new Set(existing.map((s) => s.id));
    const incomingIds = new Set(
      incomingSessions.filter((s) => s.id).map((s) => s.id!)
    );

    const toDelete = existing.filter((s) => !incomingIds.has(s.id));
    const toUpdate = incomingSessions.filter(
      (s) => s.id && existingIds.has(s.id)
    );
    const toCreate = incomingSessions.filter((s) => !s.id);

    const formation = await prisma.$transaction(async (tx) => {
      // Delete removed sessions
      if (toDelete.length > 0) {
        await tx.formationSession.deleteMany({
          where: { id: { in: toDelete.map((s) => s.id) } },
        });
      }

      // Update existing sessions
      for (const s of toUpdate) {
        await tx.formationSession.update({
          where: { id: s.id! },
          data: { dates: s.dates.map((d) => new Date(d)) },
        });
      }

      // Create new sessions
      if (toCreate.length > 0) {
        await tx.formationSession.createMany({
          data: toCreate.map((s) => ({
            formationId: params.id,
            dates: s.dates.map((d) => new Date(d)),
          })),
        });
      }

      // Update the formation itself
      return tx.formation.update({
        where: { id: params.id },
        data: {
          name: body.name,
          teacherId: body.teacherId || null,
          maxCapacity: body.maxCapacity ?? null,
        },
        include: {
          teacher: true,
          sessions: {
            include: { _count: { select: { enrollments: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json(formation);
  } catch (error) {
    console.error("Formation update error:", error);
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
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  await prisma.formation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

const updateSchema = z.object({
  center: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
  actualCode: z.enum(["X", "O", "A", "B", "C", "D", "E", "F", "G", "H", "I", "M"]),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: params.id },
  });

  if (!record) {
    return NextResponse.json({ error: t.api.notFound }, { status: 404 });
  }

  if (session.user.role === "PARTICIPANT" && record.userId !== session.user.id) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: params.id },
      data: {
        center: parsed.data.center,
        actualCode: parsed.data.actualCode,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Attendance update error:", error);
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
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: params.id },
  });

  if (!record) {
    return NextResponse.json({ error: t.api.notFound }, { status: 404 });
  }

  if (session.user.role === "PARTICIPANT" && record.userId !== session.user.id) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  await prisma.attendanceRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

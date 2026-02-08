import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  await prisma.publicHoliday.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const holiday = await prisma.publicHoliday.update({
      where: { id: params.id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        name: body.name,
        canton: body.canton,
        year: body.date ? new Date(body.date).getFullYear() : undefined,
      },
    });
    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Holiday update error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

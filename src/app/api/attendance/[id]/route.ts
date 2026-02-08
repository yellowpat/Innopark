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

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; sessionId: string; enrollmentId: string } }
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
    await prisma.formationEnrollment.delete({
      where: { id: params.enrollmentId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enrollment deletion error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

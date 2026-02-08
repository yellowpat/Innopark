import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

// POST: Submit RMA (change status from DRAFT to SUBMITTED)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const submission = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
    include: { _count: { select: { entries: true } } },
  });

  if (!submission) {
    return NextResponse.json({ error: t.api.rmaNotFound }, { status: 404 });
  }

  if (submission.userId !== session.user.id && session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  if (submission.status !== "DRAFT" && submission.status !== "REVISION_REQUESTED" && submission.status !== "APPROVED") {
    return NextResponse.json(
      { error: t.api.rmaAlreadySubmitted },
      { status: 400 }
    );
  }

  if (submission._count.entries === 0) {
    return NextResponse.json(
      { error: t.api.invalidData },
      { status: 400 }
    );
  }

  const updated = await prisma.rmaSubmission.update({
    where: { id: params.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getTranslations } from "@/lib/i18n/server";

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REVISION_REQUESTED"]),
  adminNotes: z.string().optional(),
});

// POST: Approve or request revision (admin/staff only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  if (session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const submission = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
  });

  if (!submission) {
    return NextResponse.json({ error: t.api.rmaNotFound }, { status: 404 });
  }

  if (submission.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: t.api.rmaAlreadySubmitted },
      { status: 400 }
    );
  }

  // CENTER_STAFF can only review their center's RMAs
  if (
    session.user.role === "CENTER_STAFF" &&
    submission.center !== session.user.primaryCenter
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.rmaSubmission.update({
      where: { id: params.id },
      data: {
        status: parsed.data.action,
        adminNotes: parsed.data.adminNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("RMA review error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

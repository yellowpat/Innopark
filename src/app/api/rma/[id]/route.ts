import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rmaSubmissionSchema } from "@/lib/validations";
import { getTranslations } from "@/lib/i18n/server";

// GET: Get single RMA submission
export async function GET(
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
    include: {
      user: { select: { id: true, name: true, email: true, primaryCenter: true } },
      entries: { orderBy: [{ day: "asc" }, { halfDay: "asc" }] },
      absenceDetails: { orderBy: { date: "asc" } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: t.api.rmaNotFound }, { status: 404 });
  }

  // Authorization: participant can only see own RMA
  if (
    session.user.role === "PARTICIPANT" &&
    submission.userId !== session.user.id
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  // CENTER_STAFF can only see RMAs for their center
  if (
    session.user.role === "CENTER_STAFF" &&
    submission.center !== session.user.primaryCenter
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  return NextResponse.json(submission);
}

// PUT: Update RMA submission
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const existing = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: t.api.rmaNotFound }, { status: 404 });
  }

  // Only owner can edit (or admin)
  if (
    session.user.role === "PARTICIPANT" &&
    existing.userId !== session.user.id
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  // Can only edit DRAFT, REVISION_REQUESTED, or APPROVED
  if (
    session.user.role === "PARTICIPANT" &&
    existing.status !== "DRAFT" &&
    existing.status !== "REVISION_REQUESTED" &&
    existing.status !== "APPROVED"
  ) {
    return NextResponse.json(
      { error: t.api.rmaAlreadySubmitted },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = rmaSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { entries, absenceDetails, ...submissionData } = parsed.data;

    // Delete existing entries and absence details, then recreate
    await prisma.$transaction([
      prisma.rmaEntry.deleteMany({ where: { submissionId: params.id } }),
      prisma.rmaAbsenceDetail.deleteMany({
        where: { submissionId: params.id },
      }),
      prisma.rmaSubmission.update({
        where: { id: params.id },
        data: {
          center: submissionData.center,
          mandateEmployer: submissionData.mandateEmployer,
          mandateRole: submissionData.mandateRole,
          mandateStartDate: submissionData.mandateStartDate
            ? new Date(submissionData.mandateStartDate)
            : null,
          mandateEndDate: submissionData.mandateEndDate
            ? new Date(submissionData.mandateEndDate)
            : null,
          feedbackQ5: submissionData.feedbackQ5,
          feedbackQ6: submissionData.feedbackQ6,
          feedbackQ7: submissionData.feedbackQ7,
          feedbackQ8: submissionData.feedbackQ8,
          feedbackQ9: submissionData.feedbackQ9,
          entries: {
            create: entries.map((e) => ({
              day: e.day,
              halfDay: e.halfDay,
              code: e.code,
            })),
          },
          absenceDetails: absenceDetails
            ? {
                create: absenceDetails.map((a) => ({
                  category: a.category,
                  date: new Date(a.date),
                  description: a.description,
                })),
              }
            : undefined,
        },
      }),
    ]);

    const updated = await prisma.rmaSubmission.findUnique({
      where: { id: params.id },
      include: {
        entries: { orderBy: [{ day: "asc" }, { halfDay: "asc" }] },
        absenceDetails: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("RMA update error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

// DELETE: Delete RMA submission (admin only, or owner if draft)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const existing = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: t.api.rmaNotFound }, { status: 404 });
  }

  if (session.user.role === "PARTICIPANT") {
    if (existing.userId !== session.user.id || existing.status !== "DRAFT") {
      return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
    }
  }

  await prisma.rmaSubmission.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

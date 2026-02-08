import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rmaSubmissionSchema } from "@/lib/validations";
import { getTranslations } from "@/lib/i18n/server";

// GET: List RMA submissions for current user (or all for admin)
export async function GET(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : undefined;
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : undefined;
  const status = searchParams.get("status") || undefined;
  const center = searchParams.get("center") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "CENTER_STAFF";

  const where: Record<string, unknown> = {};

  if (!isAdmin) {
    where.userId = session.user.id;
  } else {
    if (session.user.role === "CENTER_STAFF") {
      where.center = session.user.primaryCenter;
    }
    if (center) where.center = center;
    if (userId) where.userId = userId;
  }

  if (year) where.year = year;
  if (month) where.month = month;
  if (status) where.status = status;

  const submissions = await prisma.rmaSubmission.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { entries: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(submissions);
}

// POST: Create new RMA submission
export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
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

    const { entries, absenceDetails, formationIds, ...submissionData } = parsed.data;

    // Check for existing submission
    const existing = await prisma.rmaSubmission.findUnique({
      where: {
        userId_year_month: {
          userId: session.user.id,
          year: submissionData.year,
          month: submissionData.month,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: t.api.rmaAlreadySubmitted, existingId: existing.id },
        { status: 409 }
      );
    }

    const submission = await prisma.rmaSubmission.create({
      data: {
        userId: session.user.id,
        year: submissionData.year,
        month: submissionData.month,
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
        rmaFormations: formationIds
          ? {
              create: formationIds.map((fId) => ({
                formationId: fId,
              })),
            }
          : undefined,
      },
      include: {
        entries: true,
        absenceDetails: true,
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("RMA creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

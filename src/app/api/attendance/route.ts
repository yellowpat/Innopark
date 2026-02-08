import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceSchema } from "@/lib/validations";
import { getTranslations } from "@/lib/i18n/server";

// GET: List attendance records
export async function GET(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : undefined;
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : undefined;
  const center = searchParams.get("center") || undefined;

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

  if (year && month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    where.date = { gte: startDate, lte: endDate };
  } else if (year) {
    where.date = {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31),
    };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { halfDay: "asc" }],
  });

  return NextResponse.json(records);
}

// POST: Create attendance record
export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { date, halfDay, center, actualCode, notes } = parsed.data;
    const dateObj = new Date(date);

    // Check if record already exists
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date_halfDay: {
          userId: session.user.id,
          date: dateObj,
          halfDay,
        },
      },
    });

    if (existing) {
      // Update existing record
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { center, actualCode, notes },
      });
      return NextResponse.json(updated);
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: session.user.id,
        date: dateObj,
        halfDay,
        center,
        actualCode,
        notes,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Attendance creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

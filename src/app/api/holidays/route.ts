import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : new Date().getFullYear();
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : undefined;
  const canton = searchParams.get("canton") || undefined;

  const where: Record<string, unknown> = { year };
  if (canton) where.canton = canton;
  if (month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    where.date = { gte: startDate, lte: endDate };
  }

  const holidays = await prisma.publicHoliday.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date(body.date),
        name: body.name,
        canton: body.canton,
        year: new Date(body.date).getFullYear(),
      },
    });
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    console.error("Holiday creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

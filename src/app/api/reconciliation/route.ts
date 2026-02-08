import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  reconcile,
  computeStats,
  type ReconciliationResult,
} from "@/lib/reconciliation";
import { getTranslations } from "@/lib/i18n/server";

export async function GET(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  if (session.user.role === "PARTICIPANT") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const center = searchParams.get("center") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const centerFilter: Record<string, unknown> = {};
  if (session.user.role === "CENTER_STAFF") {
    centerFilter.center = session.user.primaryCenter;
  }
  if (center) centerFilter.center = center;

  // Get all RMA submissions for this month
  const submissions = await prisma.rmaSubmission.findMany({
    where: {
      year,
      month,
      ...centerFilter,
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      entries: true,
    },
  });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const results: ReconciliationResult[] = [];

  for (const sub of submissions) {
    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        userId: sub.userId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const attendanceWithDay = attendance.map((a) => ({
      day: new Date(a.date).getDate(),
      halfDay: a.halfDay,
      actualCode: a.actualCode,
    }));
    const entries = reconcile(sub.entries, attendanceWithDay);
    const stats = computeStats(entries);

    results.push({
      userId: sub.userId,
      userName: sub.user.name,
      year,
      month,
      center: sub.center,
      entries,
      stats,
    });
  }

  return NextResponse.json(results);
}

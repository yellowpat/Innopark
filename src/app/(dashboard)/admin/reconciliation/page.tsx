import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import { reconcile, computeStats, type ReconciliationResult } from "@/lib/reconciliation";
import { ReconciliationView } from "./reconciliation-view";

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; center?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");
  const t = getTranslations();

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  const centerFilter: Record<string, unknown> = {};
  if (session.user.role === "CENTER_STAFF") {
    centerFilter.center = session.user.primaryCenter;
  }
  if (searchParams.center) centerFilter.center = searchParams.center;

  const submissions = await prisma.rmaSubmission.findMany({
    where: {
      year,
      month,
      ...centerFilter,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.reconciliation.title}</h1>
        <p className="text-muted-foreground">
          {t.months[month - 1]} {year} — {t.admin.reconciliation.subtitle}
        </p>
      </div>

      <ReconciliationView results={results} year={year} month={month} />
    </div>
  );
}

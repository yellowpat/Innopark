import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CENTER_CANTON_MAP } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n/server";
import { RmaForm } from "../rma-form";
import { MonthYearPicker } from "./month-year-picker";

export default async function NewRmaPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
  const hasSelectedPeriod = !!(searchParams.month && searchParams.year);
  const center = session.user.primaryCenter;
  const canton = CENTER_CANTON_MAP[center];

  const existing = await prisma.rmaSubmission.findUnique({
    where: {
      userId_year_month: {
        userId: session.user.id,
        year,
        month,
      },
    },
  });

  if (existing && hasSelectedPeriod) {
    redirect(`/rma/${existing.id}`);
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      canton,
      date: { gte: startDate, lte: endDate },
    },
  });

  const holidayDays = holidays.map((h) => new Date(h.date).getDate());

  // Get existing RMA months to show which are already taken
  const existingMonths = await prisma.rmaSubmission.findMany({
    where: { userId: session.user.id },
    select: { year: true, month: true },
  });
  const existingSet = new Set(existingMonths.map((e) => `${e.year}-${e.month}`));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.newSubmission}</h1>
        <p className="text-muted-foreground">{t.rma.title}</p>
      </div>

      <MonthYearPicker
        currentYear={year}
        currentMonth={month}
        existingMonths={Array.from(existingSet)}
        hasSelectedPeriod={hasSelectedPeriod}
      />

      {hasSelectedPeriod && !existing && (
        <RmaForm
          year={year}
          month={month}
          center={center}
          holidayDays={holidayDays}
        />
      )}
    </div>
  );
}

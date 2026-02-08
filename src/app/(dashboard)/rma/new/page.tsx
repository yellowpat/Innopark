import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CENTER_CANTON_MAP } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n/server";
import { RmaForm } from "../rma-form";

export default async function NewRmaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const center = session.user.primaryCenter;
  const canton = CENTER_CANTON_MAP[center];

  // Find existing RMAs to determine the next available month
  const existingMonths = await prisma.rmaSubmission.findMany({
    where: { userId: session.user.id },
    select: { year: true, month: true },
  });
  const existingSet = new Set(existingMonths.map((e) => `${e.year}-${e.month}`));

  // Find next month without an RMA, starting from current month
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  // Look up to 12 months ahead
  for (let i = 0; i < 12; i++) {
    if (!existingSet.has(`${year}-${month}`)) break;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.newSubmission}</h1>
        <p className="text-muted-foreground">
          {t.months[month - 1]} {year}
        </p>
      </div>

      <RmaForm
        year={year}
        month={month}
        center={center}
        holidayDays={holidayDays}
      />
    </div>
  );
}

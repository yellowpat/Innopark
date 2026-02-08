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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
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

  if (existing) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.newSubmission}</h1>
        <p className="text-muted-foreground">
          {t.rma.title}
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

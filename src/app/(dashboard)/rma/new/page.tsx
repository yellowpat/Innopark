import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CENTER_CANTON_MAP } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { RmaForm } from "../rma-form";

export default async function NewRmaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const center = session.user.primaryCenter;
  const canton = CENTER_CANTON_MAP[center];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Check if an RMA for the current month already exists
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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.rma.newSubmission}</h1>
          <p className="text-muted-foreground">
            {t.months[month - 1]} {year}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 text-center space-y-4">
          <p className="text-muted-foreground">{t.rma.rmaAlreadyCreated}</p>
          <Link
            href={`/rma/${existing.id}`}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            {t.rma.viewDetails}
          </Link>
        </div>
      </div>
    );
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

  const formations = await prisma.formation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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
        availableFormations={formations}
      />
    </div>
  );
}

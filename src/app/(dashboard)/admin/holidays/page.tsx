import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import { HolidaysClient } from "./holidays-client";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const t = await getTranslations();

  const holidays = await prisma.publicHoliday.findMany({
    orderBy: [{ year: "desc" }, { date: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.holidays.title}</h1>
        <p className="text-muted-foreground">
          {t.admin.holidays.title}
        </p>
      </div>
      <HolidaysClient initialHolidays={holidays} />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { RMA_CODE_COLORS } from "@/lib/constants";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/types";
import { DeleteAttendance } from "./delete-attendance";

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

export default async function AttendanceOverviewPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; center?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");
  const t = getTranslations();
  const locale = getLocale();

  let effectiveRole: string = session.user.role;
  if (session.user.role === "ADMIN") {
    const impersonate = cookies().get("innopark-impersonate-role")?.value;
    if (impersonate === "CENTER_STAFF" || impersonate === "PARTICIPANT") {
      effectiveRole = impersonate;
    }
  }

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  const where: Record<string, unknown> = {
    date: {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    },
  };

  if (effectiveRole === "CENTER_STAFF") {
    where.center = session.user.primaryCenter;
  } else if (searchParams.center) {
    where.center = searchParams.center;
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { halfDay: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.attendanceOverview.title}</h1>
        <p className="text-muted-foreground">
          {t.nav.attendance}
        </p>
      </div>

      <div className="rounded-lg border bg-white">
        {records.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {t.common.noResults}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.participant}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.date}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.attendance.halfDay}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.center}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.rma.code}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.notes}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium">{record.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.user.email}
                    </p>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {format(new Date(record.date), "EEEE d MMMM", {
                      locale: DATE_LOCALE_MAP[locale],
                    })}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {record.halfDay === "AM" ? t.common.morning : t.common.afternoon}
                  </td>
                  <td className="px-6 py-3 text-sm">{record.center}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border",
                        RMA_CODE_COLORS[record.actualCode]
                      )}
                    >
                      {record.actualCode}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {record.notes || "—"}
                  </td>
                  <td className="px-6 py-3">
                    <DeleteAttendance recordId={record.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

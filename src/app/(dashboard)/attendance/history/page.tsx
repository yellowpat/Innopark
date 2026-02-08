import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RMA_CODE_COLORS } from "@/lib/constants";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/types";
import { AttendanceActions } from "./attendance-actions";

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

export default async function AttendanceHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = getTranslations();
  const locale = getLocale();

  const records = await prisma.attendanceRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.history}</h1>
        <p className="text-muted-foreground">
          {t.attendance.title}
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            {t.common.noResults}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
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
                  <td className="px-6 py-3 text-sm">
                    {format(new Date(record.date), "EEEE d MMMM yyyy", {
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
                    <AttendanceActions
                      recordId={record.id}
                      center={record.center}
                      actualCode={record.actualCode}
                      notes={record.notes}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

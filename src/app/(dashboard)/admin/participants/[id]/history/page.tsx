import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RMA_CODE_COLORS } from "@/lib/constants";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/types";

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

export default async function ParticipantHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");

  const locale = getLocale();
  const t = getTranslations();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, primaryCenter: true },
  });

  if (!user) notFound();

  const [submissions, attendanceRecords] = await Promise.all([
    prisma.rmaSubmission.findMany({
      where: { userId: params.id },
      include: { _count: { select: { entries: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.attendanceRecord.findMany({
      where: { userId: params.id },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">
          {user.email} &middot; {user.primaryCenter}
        </p>
      </div>

      {/* RMA Timeline */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t.rma.rmaHistory}</h2>
        </div>
        {submissions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.rma.noSubmission}
          </div>
        ) : (
          <div className="divide-y">
            {submissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/admin/rma-overview/${sub.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-sm">
                    {t.months[sub.month - 1]} {sub.year}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub._count.entries} {t.rma.entries}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[sub.status]
                  }`}
                >
                  {t.status[sub.status as keyof typeof t.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attendance */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t.rma.recentAttendance}</h2>
        </div>
        {attendanceRecords.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.rma.noAttendance}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.date}
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.halfDays}
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.rma.code}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendanceRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-2 text-sm">
                    {format(new Date(record.date), "d MMM yyyy", {
                      locale: DATE_LOCALE_MAP[locale],
                    })}
                  </td>
                  <td className="px-6 py-2 text-sm">
                    {record.halfDay === "AM" ? t.common.morning : t.common.afternoon}
                  </td>
                  <td className="px-6 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border",
                        RMA_CODE_COLORS[record.actualCode]
                      )}
                    >
                      {record.actualCode}
                    </span>
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

"use client";

import Link from "next/link";
import { FileText, CalendarDays, Plus, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { RmaSubmission, AttendanceRecord } from "@prisma/client";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/types";

interface ParticipantDashboardProps {
  userName: string;
  currentRma: RmaSubmission | null;
  recentAttendance: AttendanceRecord[];
  currentMonth: number;
  currentYear: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

export function ParticipantDashboard({
  userName,
  currentRma,
  recentAttendance,
  currentMonth,
  currentYear,
}: ParticipantDashboardProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.welcome}, {userName}</h1>
        <p className="text-muted-foreground">
          {t.months[currentMonth - 1]} {currentYear}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Current RMA Status */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            {t.dashboard.rmaStatus}
          </div>
          {currentRma ? (
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[currentRma.status]
                }`}
              >
                {t.status[currentRma.status as keyof typeof t.status]}
              </span>
              <Link
                href={`/rma/${currentRma.id}`}
                className="mt-2 block text-sm text-primary hover:underline"
              >
                {t.rma.viewDetails}
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">{t.dashboard.noRmaYet}</p>
              <Link
                href="/rma/new"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                {t.rma.createFirst}
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {t.dashboard.attendanceToday}
          </div>
          <div className="mt-3">
            <Link
              href="/attendance"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              {t.attendance.markPresence}
            </Link>
          </div>
        </div>

        {/* History Quick Link */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t.rma.history}
          </div>
          <div className="mt-3 space-y-1">
            <Link
              href="/rma"
              className="block text-sm text-primary hover:underline"
            >
              {t.nav.myRma}
            </Link>
            <Link
              href="/attendance/history"
              className="block text-sm text-primary hover:underline"
            >
              {t.nav.myAttendance}
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      {recentAttendance.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">{t.dashboard.recentActivity}</h2>
          </div>
          <div className="divide-y">
            {recentAttendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(record.date), "EEEE d MMMM yyyy", {
                      locale: DATE_LOCALE_MAP[locale],
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.halfDay === "AM" ? t.common.morning : t.common.afternoon} &middot;{" "}
                    {record.center}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                  {record.actualCode}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

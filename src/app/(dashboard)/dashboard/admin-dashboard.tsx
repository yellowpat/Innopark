"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Role, Center, RmaSubmission, User } from "@prisma/client";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/types";

interface AdminDashboardProps {
  role: Role;
  center: Center;
  pendingRmas: number;
  totalParticipants: number;
  thisMonthAttendance: number;
  recentSubmissions: (RmaSubmission & {
    user: { name: string; email: string };
  })[];
  currentMonth: number;
  currentYear: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

export function AdminDashboard({
  role,
  center,
  pendingRmas,
  totalParticipants,
  thisMonthAttendance,
  recentSubmissions,
  currentMonth,
  currentYear,
}: AdminDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">
          {t.months[currentMonth - 1]} {currentYear}
          {role === "CENTER_STAFF" && ` — ${center}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            {t.dashboard.pendingRma}
          </div>
          <p className="mt-2 text-3xl font-bold">{pendingRmas}</p>
          <Link
            href="/admin/rma-overview?status=SUBMITTED"
            className="mt-1 block text-xs text-primary hover:underline"
          >
            {t.admin.rmaOverview.pendingReview}
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            {t.admin.participants.activeParticipants}
          </div>
          <p className="mt-2 text-3xl font-bold">{totalParticipants}</p>
          <Link
            href="/admin/participants"
            className="mt-1 block text-xs text-primary hover:underline"
          >
            {t.nav.participants}
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {t.dashboard.attendanceToday}
          </div>
          <p className="mt-2 text-3xl font-bold">{thisMonthAttendance}</p>
          <Link
            href="/admin/attendance-overview"
            className="mt-1 block text-xs text-primary hover:underline"
          >
            {t.nav.attendance}
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            {t.nav.reconciliation}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.admin.reconciliation.subtitle}
          </p>
          <Link
            href="/admin/reconciliation"
            className="mt-1 block text-xs text-primary hover:underline"
          >
            {t.nav.reconciliation}
          </Link>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t.dashboard.recentActivity}</h2>
        </div>
        {recentSubmissions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.admin.rmaOverview.noSubmissions}
          </div>
        ) : (
          <div className="divide-y">
            {recentSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{sub.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.months[sub.month - 1]} {sub.year} &middot; {sub.center}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[sub.status]
                    }`}
                  >
                    {t.status[sub.status as keyof typeof t.status]}
                  </span>
                  <Link
                    href={`/admin/rma-overview/${sub.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {t.rma.viewDetails}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CENTER_CANTON_MAP } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n/server";
import { RmaCalendarGrid } from "@/components/rma-calendar-grid";
import { RmaExportView } from "@/components/rma-export-view";
import { RmaReviewActions } from "./review-actions";
import { RmaAdminActions } from "./admin-actions";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

export default async function AdminRmaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");
  const t = getTranslations();

  const submission = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, primaryCenter: true },
      },
      entries: { orderBy: [{ day: "asc" }, { halfDay: "asc" }] },
      absenceDetails: { orderBy: { date: "asc" } },
    },
  });

  if (!submission) notFound();

  if (
    session.user.role === "CENTER_STAFF" &&
    submission.center !== session.user.primaryCenter
  ) {
    redirect("/admin/rma-overview");
  }

  const canton = CENTER_CANTON_MAP[submission.center];
  const startDate = new Date(submission.year, submission.month - 1, 1);
  const endDate = new Date(submission.year, submission.month, 0);
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      canton,
      date: { gte: startDate, lte: endDate },
    },
  });

  const holidayDays = new Set(holidays.map((h) => new Date(h.date).getDate()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            RMA — {submission.user.name}
          </h1>
          <p className="text-muted-foreground">
            {t.months[submission.month - 1]} {submission.year} &middot;{" "}
            {submission.center}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            STATUS_COLORS[submission.status]
          }`}
        >
          {t.status[submission.status as keyof typeof t.status]}
        </span>
      </div>

      {/* Review Actions */}
      {submission.status === "SUBMITTED" && (
        <RmaReviewActions submissionId={submission.id} />
      )}

      {/* Admin Edit/Delete */}
      <RmaAdminActions submissionId={submission.id} />

      {/* Admin Notes */}
      {submission.adminNotes && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-800">{t.common.notes}:</p>
          <p className="text-yellow-700">{submission.adminNotes}</p>
        </div>
      )}

      {/* Calendar Grid (read-only) */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.grid}</h3>
        <RmaCalendarGrid
          year={submission.year}
          month={submission.month}
          entries={submission.entries}
          holidays={holidayDays}
          readOnly
        />
      </div>

      {/* Export View */}
      <RmaExportView
        submission={submission}
        userName={submission.user.name}
      />

      {/* Feedback */}
      {(submission.feedbackQ5 ||
        submission.feedbackQ6 ||
        submission.feedbackQ7 ||
        submission.feedbackQ8 ||
        submission.feedbackQ9) && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 font-semibold">{t.rma.feedback}</h3>
          <div className="space-y-3 text-sm">
            {submission.feedbackQ5 && (
              <div>
                <p className="font-medium">{t.rma.feedbackQ5}:</p>
                <p className="text-muted-foreground">{submission.feedbackQ5}</p>
              </div>
            )}
            {submission.feedbackQ6 && (
              <div>
                <p className="font-medium">{t.rma.feedbackQ6}:</p>
                <p className="text-muted-foreground">{submission.feedbackQ6}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

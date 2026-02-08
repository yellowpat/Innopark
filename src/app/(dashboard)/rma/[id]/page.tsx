import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CENTER_CANTON_MAP } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n/server";
import { RmaForm } from "../rma-form";

export default async function RmaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const submission = await prisma.rmaSubmission.findUnique({
    where: { id: params.id },
    include: {
      entries: { orderBy: [{ day: "asc" }, { halfDay: "asc" }] },
      absenceDetails: { orderBy: { date: "asc" } },
    },
  });

  if (!submission) notFound();

  if (
    session.user.role === "PARTICIPANT" &&
    submission.userId !== session.user.id
  ) {
    redirect("/rma");
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

  const holidayDays = holidays.map((h) => new Date(h.date).getDate());

  const formations = await prisma.formation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const existingRmaFormations = await prisma.rmaFormation.findMany({
    where: { submissionId: submission.id },
    select: { formationId: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.editSubmission}</h1>
        <p className="text-muted-foreground">
          {t.rma.title}
        </p>
      </div>

      <RmaForm
        year={submission.year}
        month={submission.month}
        center={submission.center}
        holidayDays={holidayDays}
        existingId={submission.id}
        existingEntries={submission.entries.map((e) => ({
          day: e.day,
          halfDay: e.halfDay,
          code: e.code,
        }))}
        existingStatus={submission.status}
        existingData={{
          mandateEmployer: submission.mandateEmployer,
          mandateRole: submission.mandateRole,
          mandateStartDate: submission.mandateStartDate?.toISOString().split("T")[0],
          mandateEndDate: submission.mandateEndDate?.toISOString().split("T")[0],
          feedbackQ5: submission.feedbackQ5,
          feedbackQ6: submission.feedbackQ6,
          absenceDetails: submission.absenceDetails.map((a) => ({
            category: a.category,
            date: new Date(a.date).toISOString().split("T")[0],
            description: a.description || "",
          })),
        }}
        availableFormations={formations}
        existingFormationIds={existingRmaFormations.map((rf) => rf.formationId)}
      />
    </div>
  );
}

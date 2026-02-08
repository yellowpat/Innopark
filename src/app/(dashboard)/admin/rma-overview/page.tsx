import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import type { Center } from "@prisma/client";
import { RmaListActions } from "./list-actions";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

export default async function RmaOverviewPage({
  searchParams,
}: {
  searchParams: { status?: string; center?: string; month?: string; year?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");
  const t = getTranslations();

  const where: Record<string, unknown> = {};

  if (session.user.role === "CENTER_STAFF") {
    where.center = session.user.primaryCenter;
  } else if (searchParams.center) {
    where.center = searchParams.center;
  }
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.year) where.year = parseInt(searchParams.year);
  if (searchParams.month) where.month = parseInt(searchParams.month);

  const now = new Date();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  const submissions = await prisma.rmaSubmission.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { entries: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { updatedAt: "desc" }],
  });

  // Find active participants who haven't created their RMA for the current month
  const centerFilter =
    session.user.role === "CENTER_STAFF"
      ? session.user.primaryCenter
      : (searchParams.center as Center | undefined) || undefined;

  const activeParticipants = await prisma.user.findMany({
    where: {
      active: true,
      role: "PARTICIPANT",
      ...(centerFilter ? { primaryCenter: centerFilter as Center } : {}),
    },
    select: { id: true, name: true, email: true, primaryCenter: true },
    orderBy: { name: "asc" },
  });

  const participantsWithRma = new Set(
    submissions
      .filter((s) => s.year === currentYear && s.month === currentMonth)
      .map((s) => s.userId)
  );

  const missingParticipants = activeParticipants.filter(
    (p) => !participantsWithRma.has(p.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.rmaOverview.title}</h1>
        <p className="text-muted-foreground">
          {t.admin.rmaOverview.allSubmissions}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["SUBMITTED", "DRAFT", "APPROVED", "REVISION_REQUESTED"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/rma-overview?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              searchParams.status === s
                ? STATUS_COLORS[s]
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {t.status[s]}
          </Link>
        ))}
        <Link
          href="/admin/rma-overview"
          className="rounded-full px-3 py-1 text-xs font-medium border bg-white hover:bg-gray-50"
        >
          {t.common.all}
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        {submissions.length === 0 && missingParticipants.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {t.admin.rmaOverview.noSubmissions}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.participant}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.period}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.center}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.rma.code}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.status}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!searchParams.status && missingParticipants.map((p) => (
                <tr key={`missing-${p.id}`} className="bg-red-50/50 hover:bg-red-50">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {t.months[currentMonth - 1]} {currentYear}
                  </td>
                  <td className="px-6 py-3 text-sm">{p.primaryCenter}</td>
                  <td className="px-6 py-3 text-sm">—</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                      {t.rma.notYetCreated}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">—</td>
                </tr>
              ))}
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium">{sub.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.user.email}
                    </p>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {t.months[sub.month - 1]} {sub.year}
                  </td>
                  <td className="px-6 py-3 text-sm">{sub.center}</td>
                  <td className="px-6 py-3 text-sm">{sub._count.entries}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[sub.status]
                      }`}
                    >
                      {t.status[sub.status as keyof typeof t.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <RmaListActions submissionId={sub.id} />
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

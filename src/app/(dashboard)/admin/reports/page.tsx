import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import type { Center, RmaCode } from "@prisma/client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const t = getTranslations();

  const year = searchParams.year
    ? parseInt(searchParams.year)
    : new Date().getFullYear();

  const submissions = await prisma.rmaSubmission.findMany({
    where: { year },
    select: { month: true, status: true, center: true },
  });

  const totalParticipants = await prisma.user.count({
    where: { role: "PARTICIPANT", active: true },
  });

  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthSubs = submissions.filter((s) => s.month === i + 1);
    const approved = monthSubs.filter((s) => s.status === "APPROVED").length;
    const submitted = monthSubs.filter((s) => s.status === "SUBMITTED").length;
    const draft = monthSubs.filter((s) => s.status === "DRAFT").length;
    const revision = monthSubs.filter(
      (s) => s.status === "REVISION_REQUESTED"
    ).length;

    return {
      month: i + 1,
      total: monthSubs.length,
      approved,
      submitted,
      draft,
      revision,
      rate:
        totalParticipants > 0
          ? Math.round((monthSubs.length / totalParticipants) * 100)
          : 0,
    };
  });

  const centers: Center[] = ["FRIBOURG", "LAUSANNE", "GENEVA"];
  const centerStats = centers.map((center) => {
    const centerSubs = submissions.filter((s) => s.center === center);
    return {
      center,
      total: centerSubs.length,
      approved: centerSubs.filter((s) => s.status === "APPROVED").length,
      submitted: centerSubs.filter((s) => s.status === "SUBMITTED").length,
    };
  });

  const entries = await prisma.rmaEntry.findMany({
    where: {
      submission: { year },
    },
    select: { code: true },
  });

  const codeDistribution: Record<string, number> = {};
  for (const e of entries) {
    codeDistribution[e.code] = (codeDistribution[e.code] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.reports.title}</h1>
        <p className="text-muted-foreground">{year}</p>
      </div>

      {/* Monthly Submission Rates */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.dashboard.submissionRate}</h3>
        <div className="grid grid-cols-12 gap-2">
          {monthlyStats.map((stat) => (
            <div key={stat.month} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {t.months[stat.month - 1].slice(0, 3)}
              </div>
              <div
                className="mx-auto w-full rounded"
                style={{
                  height: `${Math.max(stat.rate * 0.8, 4)}px`,
                  backgroundColor:
                    stat.rate >= 80
                      ? "#22c55e"
                      : stat.rate >= 50
                      ? "#eab308"
                      : stat.rate > 0
                      ? "#ef4444"
                      : "#e5e7eb",
                  minHeight: "4px",
                }}
              />
              <div className="text-xs font-medium mt-1">
                {stat.total > 0 ? `${stat.rate}%` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {stat.total}/{totalParticipants}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Detail Table */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">{t.admin.reports.monthlyReport}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.rma.selectMonth}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.status.APPROVED}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.status.SUBMITTED}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.status.DRAFT}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.dashboard.submissionRate}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {monthlyStats.map((stat) => (
              <tr key={stat.month} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium">
                  {t.months[stat.month - 1]}
                </td>
                <td className="px-6 py-3 text-sm">{stat.total}</td>
                <td className="px-6 py-3 text-sm text-green-600">
                  {stat.approved}
                </td>
                <td className="px-6 py-3 text-sm text-blue-600">
                  {stat.submitted}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">
                  {stat.draft}
                </td>
                <td className="px-6 py-3 text-sm">
                  {stat.rate > 0 ? `${stat.rate}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Center Breakdown */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.admin.reports.centerReport}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {centerStats.map((stat) => (
            <div key={stat.center} className="rounded-lg border p-4">
              <h4 className="font-medium">{stat.center}</h4>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  Total: <span className="font-medium">{stat.total}</span>
                </p>
                <p className="text-green-600">
                  {t.status.APPROVED}: {stat.approved}
                </p>
                <p className="text-blue-600">
                  {t.status.SUBMITTED}: {stat.submitted}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Distribution */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.codeSummary}</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(codeDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([code, count]) => (
              <div key={code} className="rounded border px-4 py-2 text-center">
                <div className="text-lg font-bold">{code}</div>
                <div className="text-xs text-muted-foreground">
                  {count} {t.common.halfDays}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

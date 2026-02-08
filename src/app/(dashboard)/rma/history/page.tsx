import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import type { RmaCode } from "@prisma/client";

export default async function RmaHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const submissions = await prisma.rmaSubmission.findMany({
    where: { userId: session.user.id },
    include: {
      entries: true,
      _count: { select: { entries: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const monthlyCodeDist = submissions.map((sub) => {
    const dist: Record<string, number> = {};
    for (const e of sub.entries) {
      dist[e.code] = (dist[e.code] || 0) + 1;
    }
    return {
      id: sub.id,
      year: sub.year,
      month: sub.month,
      status: sub.status,
      distribution: dist,
      total: sub.entries.length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.history}</h1>
        <p className="text-muted-foreground">
          {t.rma.title}
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground">
          {t.common.noResults}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white">
            <div className="border-b px-6 py-4">
              <h3 className="font-semibold">{t.rma.codeSummary}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t.common.period}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    {(["X", "O", "G", "A", "B", "C", "H", "I", "M"] as RmaCode[]).map((code) => (
                      <th
                        key={code}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                        title={t.rmaCodes[code]}
                      >
                        {code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyCodeDist.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {t.months[m.month - 1]} {m.year}
                      </td>
                      <td className="px-4 py-3 text-sm">{m.total}</td>
                      {(["X", "O", "G", "A", "B", "C", "H", "I", "M"] as RmaCode[]).map((code) => (
                        <td
                          key={code}
                          className="px-4 py-3 text-sm text-center"
                        >
                          {m.distribution[code] || "\u2014"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

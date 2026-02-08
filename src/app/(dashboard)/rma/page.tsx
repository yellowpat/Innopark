import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { Plus } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REVISION_REQUESTED: "bg-orange-100 text-orange-700",
};

export default async function RmaListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const submissions = await prisma.rmaSubmission.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const hasCurrentMonth = submissions.some(
    (s) => s.year === currentYear && s.month === currentMonth
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.rma.title}</h1>
        <p className="text-muted-foreground">{t.nav.myRma}</p>
      </div>

      {!hasCurrentMonth && (
        <div className="rounded-lg border bg-white p-6 text-center space-y-4">
          <p className="text-muted-foreground">
            {t.rma.noRma} {t.months[currentMonth - 1]} {currentYear}
          </p>
          <Link
            href="/rma/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t.rma.createFirst}
          </Link>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="divide-y">
            {submissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/rma/${sub.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium">
                    {t.months[sub.month - 1]} {sub.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sub._count.entries} &middot; {sub.center}
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
        </div>
      )}
    </div>
  );
}

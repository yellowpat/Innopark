import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import { AllocationsClient } from "./allocations-client";

export default async function AllocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
    redirect("/dashboard");
  const t = await getTranslations();

  const [formations, participants] = await Promise.all([
    prisma.formation.findMany({
      orderBy: { name: "asc" },
      include: {
        teacher: true,
        sessions: {
          include: { _count: { select: { enrollments: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "PARTICIPANT", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, primaryCenter: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.allocations.title}</h1>
      </div>
      <AllocationsClient
        initialFormations={formations}
        participants={participants}
      />
    </div>
  );
}

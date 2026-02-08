import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import { ParticipantsClient } from "./participants-client";

export default async function ParticipantsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARTICIPANT") redirect("/dashboard");
  const t = await getTranslations();

  const centerFilter =
    session.user.role === "CENTER_STAFF"
      ? { primaryCenter: session.user.primaryCenter }
      : {};

  const users = await prisma.user.findMany({
    where: { ...centerFilter },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      primaryCenter: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.participants.title}</h1>
        <p className="text-muted-foreground">
          {t.nav.participants}
        </p>
      </div>
      <ParticipantsClient
        initialUsers={users}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}

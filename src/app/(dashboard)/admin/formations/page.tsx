import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import { FormationsClient } from "./formations-client";

export default async function FormationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
    redirect("/dashboard");
  const t = await getTranslations();

  const formations = await prisma.formation.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.formations.title}</h1>
      </div>
      <FormationsClient initialFormations={formations} />
    </div>
  );
}

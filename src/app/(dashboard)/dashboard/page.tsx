import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "./admin-dashboard";
import type { Role } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let effectiveRole: Role = session.user.role;
  if (session.user.role === "ADMIN") {
    const impersonate = cookies().get("innopark-impersonate-role")?.value;
    if (impersonate === "CENTER_STAFF" || impersonate === "PARTICIPANT") {
      effectiveRole = impersonate;
    }
  }

  if (effectiveRole === "PARTICIPANT") {
    redirect("/rma");
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Admin/Staff dashboard
  const centerFilter =
    effectiveRole === "CENTER_STAFF"
      ? { center: session.user.primaryCenter }
      : {};

  const [pendingRmas, totalParticipants, thisMonthAttendance] =
    await Promise.all([
      prisma.rmaSubmission.count({
        where: { status: "SUBMITTED", ...centerFilter },
      }),
      prisma.user.count({
        where: { role: "PARTICIPANT", active: true },
      }),
      prisma.attendanceRecord.count({
        where: {
          date: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
          ...centerFilter,
        },
      }),
    ]);

  const recentSubmissions = await prisma.rmaSubmission.findMany({
    where: { ...centerFilter },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <AdminDashboard
      role={effectiveRole}
      center={session.user.primaryCenter}
      pendingRmas={pendingRmas}
      totalParticipants={totalParticipants}
      thisMonthAttendance={thisMonthAttendance}
      recentSubmissions={recentSubmissions}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}

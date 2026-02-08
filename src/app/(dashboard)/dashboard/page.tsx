import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ParticipantDashboard } from "./participant-dashboard";
import { AdminDashboard } from "./admin-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (session.user.role === "PARTICIPANT") {
    redirect("/rma");
  }

  // Admin/Staff dashboard
  const centerFilter =
    session.user.role === "CENTER_STAFF"
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
      role={session.user.role}
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

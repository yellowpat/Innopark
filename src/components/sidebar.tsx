"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  List,
  Users,
  ClipboardList,
  Settings,
  BarChart3,
  CalendarCheck,
  GitCompare,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type { Dictionary } from "@/lib/i18n/types";

interface NavItem {
  labelKey: keyof Dictionary["nav"];
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    labelKey: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["CENTER_STAFF", "ADMIN"],
  },
  {
    labelKey: "myRma",
    href: "/rma",
    icon: FileText,
    roles: ["PARTICIPANT"],
  },
  {
    labelKey: "myAttendance",
    href: "/attendance",
    icon: CalendarDays,
    roles: ["PARTICIPANT"],
  },
  {
    labelKey: "attendanceList",
    href: "/attendance/history",
    icon: List,
    roles: ["PARTICIPANT"],
  },
  {
    labelKey: "participants",
    href: "/admin/participants",
    icon: Users,
    roles: ["ADMIN", "CENTER_STAFF"],
  },
  {
    labelKey: "rmaOverview",
    href: "/admin/rma-overview",
    icon: ClipboardList,
    roles: ["ADMIN", "CENTER_STAFF"],
  },
  {
    labelKey: "attendance",
    href: "/admin/attendance-overview",
    icon: CalendarCheck,
    roles: ["ADMIN", "CENTER_STAFF"],
  },
  {
    labelKey: "reconciliation",
    href: "/admin/reconciliation",
    icon: GitCompare,
    roles: ["ADMIN", "CENTER_STAFF"],
  },
  {
    labelKey: "reports",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    labelKey: "holidays",
    href: "/admin/holidays",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/innoparkLogo.png"
            alt="Innopark"
            width={32}
            height={32}
          />
          <span className="text-lg font-semibold">Innopark</span>
        </Link>
      </div>

      <nav className="space-y-1 px-3 py-4">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t.nav[item.labelKey]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

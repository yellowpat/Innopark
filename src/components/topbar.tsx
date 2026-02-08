"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { RoleSwitcher } from "@/components/role-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n/context";
import type { Role } from "@prisma/client";

interface TopbarProps {
  userName: string;
  userRole: Role;
  userCenter: string;
  effectiveRole: Role;
}

export function Topbar({ userName, userRole, userCenter, effectiveRole }: TopbarProps) {
  const isAdmin = userRole === "ADMIN";
  const { t } = useTranslation();

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
      {isAdmin ? (
        <RoleSwitcher currentRole={userRole} effectiveRole={effectiveRole} />
      ) : (
        <div />
      )}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="text-right">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">
            {userRole} &middot; {userCenter}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t.common.logout}
        </button>
      </div>
    </header>
  );
}

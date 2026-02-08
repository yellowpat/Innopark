"use client";

import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, User, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Role } from "@prisma/client";

const ROLE_ICONS: Record<Role, React.ElementType> = {
  ADMIN: ShieldCheck,
  CENTER_STAFF: Shield,
  PARTICIPANT: User,
};

export function RoleSwitcher({
  currentRole,
  effectiveRole,
}: {
  currentRole: Role;
  effectiveRole: Role;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const isImpersonating = currentRole !== effectiveRole;

  const ROLE_OPTIONS: { role: Role; label: string }[] = [
    { role: "ADMIN", label: t.roleSwitcher.admin },
    { role: "CENTER_STAFF", label: t.roleSwitcher.staff },
    { role: "PARTICIPANT", label: t.roleSwitcher.participant },
  ];

  async function switchRole(role: Role) {
    await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  async function resetRole() {
    await fetch("/api/impersonate", { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {isImpersonating && (
        <button
          onClick={resetRole}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
          title={t.roleSwitcher.backToAdmin}
        >
          <ArrowLeft className="h-3 w-3" />
          {t.roleSwitcher.admin}
        </button>
      )}
      {ROLE_OPTIONS.map(({ role, label }) => {
        const Icon = ROLE_ICONS[role];
        return (
          <button
            key={role}
            onClick={() => (role === currentRole ? resetRole() : switchRole(role))}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              effectiveRole === role
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
            title={`${t.roleSwitcher.viewAs} ${label}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

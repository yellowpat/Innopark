import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { SessionProvider } from "@/components/session-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Role } from "@prisma/client";

function getEffectiveRole(actualRole: Role): Role {
  if (actualRole !== "ADMIN") return actualRole;
  const impersonate = cookies().get("innopark-impersonate-role")?.value;
  if (impersonate === "CENTER_STAFF" || impersonate === "PARTICIPANT") {
    return impersonate;
  }
  return "ADMIN";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const effectiveRole = getEffectiveRole(session.user.role);
  const isImpersonating = effectiveRole !== session.user.role;
  const locale = getLocale();
  const dictionary = getDictionary(locale);
  const t = dictionary;

  return (
    <SessionProvider session={session}>
      <I18nProvider locale={locale} dictionary={dictionary}>
        <div className="min-h-screen bg-gray-50">
          {isImpersonating && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-center text-xs py-1 font-medium">
              {t.impersonation.testMode} : {t.impersonation.viewingAs} {effectiveRole === "CENTER_STAFF" ? t.roleSwitcher.staff : t.roleSwitcher.participant}
            </div>
          )}
          <Sidebar role={effectiveRole} />
          <Topbar
            userName={session.user.name}
            userRole={session.user.role}
            userCenter={session.user.primaryCenter}
            effectiveRole={effectiveRole}
          />
          <main className={`ml-64 ${isImpersonating ? "pt-[calc(4rem+1.25rem)]" : "pt-16"}`}>
            <div className="p-6">{children}</div>
          </main>
        </div>
      </I18nProvider>
    </SessionProvider>
  );
}

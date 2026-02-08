"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  de: "DE",
};

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useTranslation();

  async function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-gray-50 p-0.5">
      {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(
        ([loc, label]) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              locale === loc
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        )
      )}
    </div>
  );
}

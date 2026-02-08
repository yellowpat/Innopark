import { cookies } from "next/headers";
import type { Dictionary, Locale } from "./types";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from "./types";
import { getDictionary } from "./dictionaries";

export function getLocale(): Locale {
  const raw = cookies().get(LOCALE_COOKIE)?.value;
  if (raw && LOCALES.includes(raw as Locale)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

export function getTranslations(): Dictionary {
  return getDictionary(getLocale());
}

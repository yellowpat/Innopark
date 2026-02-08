import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n/types";

export async function POST(req: NextRequest) {
  const { locale } = (await req.json()) as { locale: string };

  if (!LOCALES.includes(locale as Locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return res;
}

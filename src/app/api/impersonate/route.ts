import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n/server";

const COOKIE_NAME = "innopark-impersonate-role";
const VALID_ROLES = ["ADMIN", "CENTER_STAFF", "PARTICIPANT"];

// POST: Set impersonated role
export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  const { role } = await request.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: t.api.invalidData }, { status: 400 });
  }

  if (role === "ADMIN") {
    cookies().delete(COOKIE_NAME);
  } else {
    cookies().set(COOKIE_NAME, role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });
  }

  return NextResponse.json({ effectiveRole: role });
}

// DELETE: Clear impersonation
export async function DELETE() {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  cookies().delete(COOKIE_NAME);
  return NextResponse.json({ effectiveRole: "ADMIN" });
}

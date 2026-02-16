import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

export async function GET() {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  const formations = await prisma.formation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(formations);
}

export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "CENTER_STAFF")
  ) {
    return NextResponse.json({ error: t.api.forbidden }, { status: 403 });
  }

  try {
    const body = await request.json();
    const formation = await prisma.formation.create({
      data: {
        name: body.name,
        teacher: body.teacher || null,
        dates: body.dates
          ? body.dates.map((d: string) => new Date(d))
          : [],
      },
    });
    return NextResponse.json(formation, { status: 201 });
  } catch (error) {
    console.error("Formation creation error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

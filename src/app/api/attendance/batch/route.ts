import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";

const batchSchema = z.object({
  entries: z
    .array(
      z.object({
        date: z.string(),
        halfDay: z.enum(["AM", "PM"]),
        center: z.enum(["FRIBOURG", "LAUSANNE", "GENEVA"]),
        actualCode: z.enum(["X", "O", "A", "B", "C", "D", "E", "F", "G", "H", "I", "M"]),
      })
    )
    .min(1)
    .max(2),
});

export async function POST(request: Request) {
  const t = getTranslations();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = batchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(
      parsed.data.entries.map((entry) => {
        const dateObj = new Date(entry.date);
        return prisma.attendanceRecord.upsert({
          where: {
            userId_date_halfDay: {
              userId: session.user.id,
              date: dateObj,
              halfDay: entry.halfDay,
            },
          },
          update: {
            center: entry.center,
            actualCode: entry.actualCode,
          },
          create: {
            userId: session.user.id,
            date: dateObj,
            halfDay: entry.halfDay,
            center: entry.center,
            actualCode: entry.actualCode,
          },
        });
      })
    );

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error("Batch attendance error:", error);
    return NextResponse.json(
      { error: t.api.serverError },
      { status: 500 }
    );
  }
}

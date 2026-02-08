import { prisma } from "@/lib/prisma";
import { Canton } from "@prisma/client";

export async function getHolidaysForMonth(
  year: number,
  month: number,
  canton: Canton
): Promise<Set<number>> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      canton,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return new Set(holidays.map((h) => new Date(h.date).getDate()));
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

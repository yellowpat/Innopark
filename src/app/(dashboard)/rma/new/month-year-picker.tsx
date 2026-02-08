"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";

interface MonthYearPickerProps {
  currentYear: number;
  currentMonth: number;
  existingMonths: string[];
  hasSelectedPeriod: boolean;
}

export function MonthYearPicker({
  currentYear,
  currentMonth,
  existingMonths,
  hasSelectedPeriod,
}: MonthYearPickerProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  function selectPeriod(year: number, month: number) {
    router.push(`/rma/new?year=${year}&month=${month}`);
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 font-semibold">{t.rma.selectMonth}</h3>
      <div className="space-y-4">
        {years.map((year) => (
          <div key={year}>
            <h4 className="text-sm font-medium text-gray-500 mb-2">{year}</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const exists = existingMonths.includes(`${year}-${month}`);
                const isSelected =
                  hasSelectedPeriod &&
                  year === currentYear &&
                  month === currentMonth;

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => selectPeriod(year, month)}
                    className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-white border-primary"
                        : exists
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {t.months[month - 1].substring(0, 3)}
                    {exists && !isSelected && " *"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          * = {t.rma.alreadySubmitted}
        </p>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import type { ReconciliationResult, DiscrepancyStatus } from "@/lib/reconciliation";
import type { Dictionary } from "@/lib/i18n/types";

const STATUS_COLORS: Record<DiscrepancyStatus, { color: string; bg: string }> = {
  MATCH: { color: "text-green-700", bg: "bg-green-100" },
  ABSENT_WHEN_PLANNED_PRESENT: { color: "text-red-700", bg: "bg-red-100" },
  PRESENT_WHEN_PLANNED_ABSENT: { color: "text-yellow-700", bg: "bg-yellow-100" },
  ACTUAL_ONLY: { color: "text-blue-700", bg: "bg-blue-100" },
  CODE_MISMATCH: { color: "text-orange-700", bg: "bg-orange-100" },
};

function getStatusLabel(
  status: DiscrepancyStatus,
  t: Dictionary
): string {
  const map: Record<DiscrepancyStatus, string> = {
    MATCH: "OK",
    ABSENT_WHEN_PLANNED_PRESENT: t.admin.reconciliation.absentLabel,
    PRESENT_WHEN_PLANNED_ABSENT: t.admin.reconciliation.presentUnplanned,
    ACTUAL_ONLY: t.admin.reconciliation.outsideRma,
    CODE_MISMATCH: t.admin.reconciliation.codeDifferent,
  };
  return map[status];
}

export function ReconciliationView({
  results,
  year,
  month,
}: {
  results: ReconciliationResult[];
  year: number;
  month: number;
}) {
  const { t } = useTranslation();

  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground">
        {t.admin.reconciliation.noData}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_COLORS) as DiscrepancyStatus[]).map((key) => {
          const config = STATUS_COLORS[key];
          return (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                config.bg,
                config.color
              )}
            >
              {getStatusLabel(key, t)}
            </span>
          );
        })}
      </div>

      {results.map((result) => (
        <div key={result.userId} className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{result.userName}</h3>
              <p className="text-xs text-muted-foreground">{result.center}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">
                {result.stats.matches} OK
              </span>
              {result.stats.absentWhenPlannedPresent > 0 && (
                <span className="text-red-600">
                  {result.stats.absentWhenPlannedPresent} {t.admin.reconciliation.absents}
                </span>
              )}
              {result.stats.presentWhenPlannedAbsent > 0 && (
                <span className="text-yellow-600">
                  {result.stats.presentWhenPlannedAbsent} {t.admin.reconciliation.presentsUnplanned}
                </span>
              )}
              {result.stats.codeMismatch > 0 && (
                <span className="text-orange-600">
                  {result.stats.codeMismatch} {t.admin.reconciliation.codesDifferent}
                </span>
              )}
              {result.stats.actualOnly > 0 && (
                <span className="text-blue-600">
                  {result.stats.actualOnly} {t.admin.reconciliation.outsideRma}
                </span>
              )}
            </div>
          </div>

          {result.entries.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              {t.admin.reconciliation.noEntries}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t.common.day}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t.common.halfDays}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t.admin.reconciliation.planned}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t.admin.reconciliation.actual}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t.common.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.entries
                  .filter((e) => e.status !== "MATCH")
                  .map((entry, idx) => {
                    const config = STATUS_COLORS[entry.status];
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{entry.day}</td>
                        <td className="px-4 py-2 text-sm">
                          {entry.halfDay === "AM" ? t.common.morning : t.common.afternoon}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono">
                          {entry.plannedCode || "—"}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono">
                          {entry.actualCode || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              config.bg,
                              config.color
                            )}
                          >
                            {getStatusLabel(entry.status, t)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {result.entries.filter((e) => e.status !== "MATCH").length === 0 && (
            <div className="px-6 py-4 text-sm text-green-600">
              {t.admin.reconciliation.allMatch}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

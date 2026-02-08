"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { RmaSubmission, RmaEntry, RmaAbsenceDetail } from "@prisma/client";

interface RmaExportViewProps {
  submission: RmaSubmission & {
    entries: RmaEntry[];
    absenceDetails: RmaAbsenceDetail[];
  };
  userName: string;
}

export function RmaExportView({ submission, userName }: RmaExportViewProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { t } = useTranslation();

  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  function copyToClipboard(text: string, section: string) {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  function CopyButton({ text, section }: { text: string; section: string }) {
    const copied = copiedSection === section;
    return (
      <button
        onClick={() => copyToClipboard(text, section)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-gray-100"
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
        {copied ? t.common.copied : t.common.copy}
      </button>
    );
  }

  const RMA_CODE_LABELS = t.rmaCodes;

  // Build the grid export
  const daysInMonth = getDaysInMonth(submission.year, submission.month);
  const entryMap = new Map<string, string>();
  for (const e of submission.entries) {
    entryMap.set(`${e.day}-${e.halfDay}`, e.code);
  }

  // Header row: Jour, 1, 2, 3, ...
  const headerRow = [t.common.day, ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))].join("\t");
  const amRow = ["AM", ...Array.from({ length: daysInMonth }, (_, i) => entryMap.get(`${i + 1}-AM`) || "")].join("\t");
  const pmRow = ["PM", ...Array.from({ length: daysInMonth }, (_, i) => entryMap.get(`${i + 1}-PM`) || "")].join("\t");

  const gridExport = [headerRow, amRow, pmRow].join("\n");

  // Summary counts
  const codeCounts: Record<string, number> = {};
  for (const e of submission.entries) {
    codeCounts[e.code] = (codeCounts[e.code] || 0) + 1;
  }
  const summaryExport = Object.entries(codeCounts)
    .map(([code, count]) => `${code}\t${RMA_CODE_LABELS[code as keyof typeof RMA_CODE_LABELS]}\t${count}`)
    .join("\n");

  // Full export
  const fullExport = [
    `${t.common.participant}:\t${userName}`,
    `${t.common.period}:\t${t.months[submission.month - 1]} ${submission.year}`,
    `${t.common.center}:\t${submission.center}`,
    "",
    `--- ${t.rma.grid} ---`,
    gridExport,
    "",
    `--- ${t.rma.codeSummary} ---`,
    `${t.rma.code}\t${t.rma.description}\t${t.rma.totalHalfDays}`,
    summaryExport,
    "",
    submission.mandateEmployer ? `${t.rma.mandateEmployer}:\t${submission.mandateEmployer}` : "",
    submission.mandateRole ? `${t.rma.mandateRole}:\t${submission.mandateRole}` : "",
    submission.feedbackQ5 ? `${t.rma.feedbackQ5}:\t${submission.feedbackQ5}` : "",
    submission.feedbackQ6 ? `${t.rma.feedbackQ6}:\t${submission.feedbackQ6}` : "",
    submission.feedbackQ7 ? `${t.rma.feedbackQ7}:\t${submission.feedbackQ7}` : "",
    submission.feedbackQ8 ? `${t.rma.feedbackQ8}:\t${submission.feedbackQ8}` : "",
    submission.feedbackQ9 ? `${t.rma.feedbackQ9}:\t${submission.feedbackQ9}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{t.rma.exportForPortal}</h3>
        <CopyButton text={fullExport} section="all" />
      </div>

      {/* Grid Export */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t.rma.gridExport}</h4>
          <CopyButton text={gridExport} section="grid" />
        </div>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs font-mono">
          {gridExport}
        </pre>
      </div>

      {/* Summary Export */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t.rma.codeSummary}</h4>
          <CopyButton text={summaryExport} section="summary" />
        </div>
        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs font-mono">
          {`${t.rma.code}\t${t.rma.description}\t${t.rma.totalHalfDays}\n` + summaryExport}
        </pre>
      </div>

      {/* Code Counts Visual */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t.rma.codeCount}</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(codeCounts).map(([code, count]) => (
            <div
              key={code}
              className="rounded border px-3 py-1 text-xs"
            >
              <span className="font-bold">{code}</span>: {count} {t.common.halfDays}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

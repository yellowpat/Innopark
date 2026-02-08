"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RmaCalendarGrid } from "@/components/rma-calendar-grid";
import { useTranslation } from "@/lib/i18n/context";
import { toast } from "sonner";
import type { RmaCode, HalfDay, Center, RmaStatus } from "@prisma/client";

interface GridEntry {
  day: number;
  halfDay: HalfDay;
  code: RmaCode;
}

interface AbsenceDetail {
  category: string;
  date: string;
  description: string;
  day?: number;
  halfDay?: string;
}

interface MandateDetail {
  day: number;
  halfDay: string;
  location: "remote" | "onsite";
  locality: string;
}

interface RmaFormProps {
  year: number;
  month: number;
  center: Center;
  holidayDays: number[];
  existingId?: string;
  existingEntries?: GridEntry[];
  existingStatus?: RmaStatus;
  existingData?: {
    mandateEmployer?: string | null;
    mandateRole?: string | null;
    mandateStartDate?: string | null;
    mandateEndDate?: string | null;
    feedbackQ5?: string | null;
    feedbackQ6?: string | null;
    feedbackQ7?: string | null;
    feedbackQ8?: string | null;
    feedbackQ9?: string | null;
    absenceDetails?: AbsenceDetail[];
  };
}

export function RmaForm({
  year,
  month,
  center,
  holidayDays,
  existingId,
  existingEntries = [],
  existingStatus,
  existingData,
}: RmaFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<GridEntry[]>(() => {
    const initial = [...existingEntries];
    for (const day of holidayDays) {
      for (const halfDay of ["AM", "PM"] as HalfDay[]) {
        if (!initial.find((e) => e.day === day && e.halfDay === halfDay)) {
          initial.push({ day, halfDay, code: "H" as RmaCode });
        }
      }
    }
    return initial;
  });

  const [mandateEmployer, setMandateEmployer] = useState(
    existingData?.mandateEmployer || ""
  );
  const [mandateRole, setMandateRole] = useState(
    existingData?.mandateRole || ""
  );
  const [mandateStartDate, setMandateStartDate] = useState(
    existingData?.mandateStartDate || ""
  );
  const [mandateEndDate, setMandateEndDate] = useState(
    existingData?.mandateEndDate || ""
  );
  const [feedbackQ5, setFeedbackQ5] = useState(
    existingData?.feedbackQ5 || ""
  );
  const [feedbackQ6, setFeedbackQ6] = useState(
    existingData?.feedbackQ6 || ""
  );
  const [feedbackQ7, setFeedbackQ7] = useState(
    existingData?.feedbackQ7 || ""
  );
  const [feedbackQ8, setFeedbackQ8] = useState(
    existingData?.feedbackQ8 || ""
  );
  const [feedbackQ9, setFeedbackQ9] = useState(
    existingData?.feedbackQ9 || ""
  );

  const [absenceDetails, setAbsenceDetails] = useState<AbsenceDetail[]>(
    existingData?.absenceDetails || []
  );
  const [mandateDetails, setMandateDetails] = useState<MandateDetail[]>([]);

  const readOnly = existingStatus === "SUBMITTED";

  const holidays = new Set(holidayDays);

  const handleEntriesChange = useCallback((newEntries: GridEntry[]) => {
    setEntries(newEntries);
    setAbsenceDetails((prev) =>
      prev.filter((d) => {
        if (d.day == null) return true;
        return newEntries.some(
          (e) => e.day === d.day && e.halfDay === d.halfDay && e.code === "G"
        );
      })
    );
    setMandateDetails((prev) =>
      prev.filter((d) =>
        newEntries.some(
          (e) => e.day === d.day && e.halfDay === d.halfDay && e.code === "M"
        )
      )
    );
  }, []);

  const handleAbsenceDetail = useCallback(
    (day: number, halfDay: HalfDay, category: string) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setAbsenceDetails((prev) => [
        ...prev.filter((d) => !(d.day === day && d.halfDay === halfDay)),
        { day, halfDay, category, date: dateStr, description: "" },
      ]);
    },
    [year, month]
  );

  const handleMandateDetail = useCallback(
    (day: number, halfDay: HalfDay, location: "remote" | "onsite", locality?: string) => {
      setMandateDetails((prev) => [
        ...prev.filter((d) => !(d.day === day && d.halfDay === halfDay)),
        { day, halfDay, location, locality: locality || "" },
      ]);
    },
    []
  );

  function buildPayload() {
    return {
      year,
      month,
      center,
      entries: entries.map((e) => ({
        day: e.day,
        halfDay: e.halfDay,
        code: e.code,
      })),
      mandateEmployer: mandateEmployer || undefined,
      mandateRole: mandateRole || undefined,
      mandateStartDate: mandateStartDate || undefined,
      mandateEndDate: mandateEndDate || undefined,
      feedbackQ5: feedbackQ5 || undefined,
      feedbackQ6: feedbackQ6 || undefined,
      feedbackQ7: feedbackQ7 || undefined,
      feedbackQ8: feedbackQ8 || undefined,
      feedbackQ9: feedbackQ9 || undefined,
      absenceDetails:
        absenceDetails.length > 0
          ? absenceDetails.map((a) => ({
              category: a.category,
              date: a.date,
              description: a.description || undefined,
            }))
          : undefined,
      mandateDetails:
        mandateDetails.length > 0
          ? mandateDetails.map((d) => ({
              day: d.day,
              halfDay: d.halfDay,
              location: d.location,
              locality: d.locality || undefined,
            }))
          : undefined,
    };
  }

  async function handleSave() {
    if (existingStatus === "APPROVED") {
      if (!window.confirm(t.rma.confirmResubmit)) return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = existingId ? `/api/rma/${existingId}` : "/api/rma";
      const method = existingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      const data = await res.json();
      toast.success(t.api.rmaSaved);

      if (!existingId) {
        router.push(`/rma/${data.id}`);
      }
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    const id = existingId;
    if (!id) {
      toast.error(t.rma.saveDraft);
      return;
    }

    if (existingStatus === "APPROVED") {
      if (!window.confirm(t.rma.confirmResubmit)) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rma/${id}/submit`, { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.rmaSubmitted);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSubmitting(false);
    }
  }

  function updateAbsenceDetail(
    index: number,
    field: keyof AbsenceDetail,
    value: string
  ) {
    const updated = [...absenceDetails];
    updated[index] = { ...updated[index], [field]: value };
    setAbsenceDetails(updated);
  }

  function updateMandateDetail(
    index: number,
    field: keyof MandateDetail,
    value: string
  ) {
    const updated = [...mandateDetails];
    updated[index] = { ...updated[index], [field]: value };
    setMandateDetails(updated);
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {existingStatus && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            existingStatus === "APPROVED"
              ? "bg-green-50 text-green-700 border border-green-200"
              : existingStatus === "SUBMITTED"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : existingStatus === "REVISION_REQUESTED"
              ? "bg-orange-50 text-orange-700 border border-orange-200"
              : "bg-gray-50 text-gray-700 border border-gray-200"
          }`}
        >
          {t.status[existingStatus as keyof typeof t.status]}
        </div>
      )}

      {/* Header */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">
          {t.months[month - 1]} {year} — {center}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.grid}</h3>
        <RmaCalendarGrid
          year={year}
          month={month}
          entries={entries}
          holidays={holidays}
          readOnly={readOnly}
          onChange={handleEntriesChange}
          onAbsenceDetail={handleAbsenceDetail}
          onMandateDetail={handleMandateDetail}
        />
      </div>

      {/* G Details — Autres absences justifiées */}
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6">
        <h3 className="mb-4 font-semibold">{t.rma.absences}</h3>

        {absenceDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.common.noResults}
          </p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const grouped = new Map<string, { day: number; halfDay: string }[]>();
              for (const d of absenceDetails) {
                if (d.day == null) continue;
                const key = d.category;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push({ day: d.day, halfDay: d.halfDay || "AM" });
              }
              Array.from(grouped.values()).forEach((dates) => {
                dates.sort((a: { day: number; halfDay: string }, b: { day: number; halfDay: string }) => a.day - b.day || (a.halfDay === "AM" ? -1 : 1));
              });
              const categoryLabels: Record<string, string> = {
                JOB_SEARCH: t.rma.absenceCategories.JOB_SEARCH,
                DOCTOR_VISIT: t.rma.absenceCategories.DOCTOR_VISIT,
                ORP_APPOINTMENT: t.rma.absenceCategories.ORP_APPOINTMENT,
                JOB_INTERVIEW: t.rma.absenceCategories.JOB_INTERVIEW,
                OTHER: t.rma.absenceCategories.OTHER,
              };
              return Array.from(grouped.entries()).map(([category, dates]) => (
                <div key={category} className="flex flex-wrap gap-x-2 gap-y-1 items-baseline text-sm">
                  <span className="font-medium">{categoryLabels[category] || category}:</span>
                  {dates.map((d, i) => (
                    <span key={`${d.day}-${d.halfDay}`} className="text-xs text-gray-600">
                      {String(d.day).padStart(2, "0")}.{String(month).padStart(2, "0")}.{year}{" "}
                      {d.halfDay === "AM" ? t.common.morning : t.common.afternoon}
                      {i < dates.length - 1 && ","}
                    </span>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* M Details — Mandat externe */}
      <div className="rounded-lg border border-purple-300 bg-purple-50 p-6">
        <h3 className="mb-4 font-semibold">{t.rma.mandate}</h3>

        {mandateDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.common.noResults}
          </p>
        ) : (
          <div className="space-y-2">
            {(() => {
              const grouped = new Map<string, { day: number; halfDay: string }[]>();
              for (const d of mandateDetails) {
                const key = d.location === "remote"
                  ? "remote"
                  : `onsite:${d.locality || ""}`;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push({ day: d.day, halfDay: d.halfDay });
              }
              Array.from(grouped.values()).forEach((dates) => {
                dates.sort((a: { day: number; halfDay: string }, b: { day: number; halfDay: string }) => a.day - b.day || (a.halfDay === "AM" ? -1 : 1));
              });
              return Array.from(grouped.entries()).map(([key, dates]) => {
                const isRemote = key === "remote";
                const locality = !isRemote ? key.replace("onsite:", "") : "";
                return (
                  <div key={key} className="flex flex-wrap gap-x-2 gap-y-1 items-baseline text-sm">
                    <span className="font-medium">
                      {isRemote ? t.rma.remote : t.rma.onsite}
                      {!isRemote && locality && ` — ${t.rma.mandateLocality}: ${locality}`}
                      :
                    </span>
                    {dates.map((d, i) => (
                      <span key={`${d.day}-${d.halfDay}`} className="text-xs text-gray-600">
                        {String(d.day).padStart(2, "0")}.{String(month).padStart(2, "0")}.{year}{" "}
                        {d.halfDay === "AM" ? t.common.morning : t.common.afternoon}
                        {i < dates.length - 1 && ","}
                      </span>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.feedback}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.rma.feedbackQ5}
            </label>
            <textarea
              value={feedbackQ5}
              onChange={(e) => setFeedbackQ5(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.rma.feedbackQ6}
            </label>
            <textarea
              value={feedbackQ6}
              onChange={(e) => setFeedbackQ6(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.rma.feedbackQ7}
            </label>
            <textarea
              value={feedbackQ7}
              onChange={(e) => setFeedbackQ7(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.rma.feedbackQ8}
            </label>
            <textarea
              value={feedbackQ8}
              onChange={(e) => setFeedbackQ8(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.rma.feedbackQ9}
            </label>
            <textarea
              value={feedbackQ9}
              onChange={(e) => setFeedbackQ9(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-white border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? t.rma.saving : t.rma.saveDraft}
          </button>
          {existingId && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? t.rma.submitting : t.rma.submitRma}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

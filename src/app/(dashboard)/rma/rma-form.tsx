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
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.absences}</h3>

        {absenceDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.common.noResults}
          </p>
        ) : (
          <div className="space-y-3">
            {[...absenceDetails]
              .map((d, i) => ({ detail: d, idx: i }))
              .sort((a, b) => {
                const dayA = a.detail.day ?? 999;
                const dayB = b.detail.day ?? 999;
                if (dayA !== dayB) return dayA - dayB;
                const hdA = a.detail.halfDay === "AM" ? 0 : 1;
                const hdB = b.detail.halfDay === "AM" ? 0 : 1;
                return hdA - hdB;
              })
              .map(({ detail, idx }) => (
                <div key={`G-${idx}`} className="flex gap-3 items-center">
                  {detail.day != null && (
                    <span className="text-xs font-medium text-gray-500 min-w-[4.5rem] shrink-0">
                      {t.common.day} {detail.day} {detail.halfDay}
                    </span>
                  )}
                  <select
                    value={detail.category}
                    onChange={(e) =>
                      updateAbsenceDetail(idx, "category", e.target.value)
                    }
                    disabled={readOnly}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="JOB_SEARCH">{t.rma.absenceCategories.JOB_SEARCH}</option>
                    <option value="DOCTOR_VISIT">{t.rma.absenceCategories.DOCTOR_VISIT}</option>
                    <option value="ORP_APPOINTMENT">{t.rma.absenceCategories.ORP_APPOINTMENT}</option>
                    <option value="JOB_INTERVIEW">{t.rma.absenceCategories.JOB_INTERVIEW}</option>
                    <option value="OTHER">{t.rma.absenceCategories.OTHER}</option>
                  </select>
                  <input
                    type="text"
                    value={detail.description}
                    onChange={(e) =>
                      updateAbsenceDetail(idx, "description", e.target.value)
                    }
                    disabled={readOnly}
                    placeholder={t.rma.description}
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* M Details — Mandat externe */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold">{t.rma.mandate}</h3>

        {mandateDetails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.common.noResults}
          </p>
        ) : (
          <div className="space-y-3">
            {[...mandateDetails]
              .map((d, i) => ({ detail: d, idx: i }))
              .sort((a, b) => {
                if (a.detail.day !== b.detail.day) return a.detail.day - b.detail.day;
                return a.detail.halfDay === "AM" ? -1 : 1;
              })
              .map(({ detail, idx }) => (
                <div key={`M-${idx}`} className="flex gap-3 items-center">
                  <span className="text-xs font-medium text-gray-500 min-w-[4.5rem] shrink-0">
                    {t.common.day} {detail.day} {detail.halfDay}
                  </span>
                  <span className="rounded-md border px-3 py-2 text-sm bg-gray-50">
                    {detail.location === "remote" ? t.rma.remote : t.rma.onsite}
                  </span>
                  {detail.location === "onsite" && (
                    <input
                      type="text"
                      value={detail.locality}
                      onChange={(e) =>
                        updateMandateDetail(idx, "locality", e.target.value)
                      }
                      disabled={readOnly}
                      placeholder={t.rma.mandateLocality}
                      className="flex-1 rounded-md border px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
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

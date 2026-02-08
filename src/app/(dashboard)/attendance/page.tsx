"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Center } from "@prisma/client";

const CENTERS: Center[] = ["LAUSANNE", "FRIBOURG", "GENEVA"];

export default function AttendancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [center, setCenter] = useState<Center>("FRIBOURG");
  const [periods, setPeriods] = useState<Set<"AM" | "PM">>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.primaryCenter) {
      setCenter(session.user.primaryCenter);
    }
  }, [session?.user?.primaryCenter]);

  function togglePeriod(period: "AM" | "PM") {
    setPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  }

  function toggleWholeDay() {
    const isWholeDay = periods.has("AM") && periods.has("PM");
    if (isWholeDay) {
      setPeriods(new Set());
    } else {
      setPeriods(new Set<"AM" | "PM">(["AM", "PM"]));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user || periods.size === 0) return;
    setSaving(true);

    try {
      const entries = Array.from(periods).map((halfDay) => ({
        date,
        halfDay,
        center,
        actualCode: "X" as const,
      }));

      const res = await fetch("/api/attendance/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.attendanceSaved);
      setPeriods(new Set());
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  const isWholeDay = periods.has("AM") && periods.has("PM");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.attendance.markPresence}</h1>
        <p className="text-muted-foreground">{t.attendance.title}</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border bg-white p-6 space-y-4">
            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.common.date}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            {/* Location chooser */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.attendance.location}
              </label>
              <div className="flex gap-3">
                {CENTERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCenter(c)}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                      center === c
                        ? "bg-primary text-white border-primary"
                        : "bg-white hover:bg-gray-50"
                    )}
                  >
                    {t.centers[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Presence checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.attendance.selectPresence}
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="morning"
                    checked={periods.has("AM")}
                    onCheckedChange={() => togglePeriod("AM")}
                  />
                  <Label htmlFor="morning">{t.common.morning}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="afternoon"
                    checked={periods.has("PM")}
                    onCheckedChange={() => togglePeriod("PM")}
                  />
                  <Label htmlFor="afternoon">{t.common.afternoon}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="wholeday"
                    checked={isWholeDay}
                    onCheckedChange={toggleWholeDay}
                  />
                  <Label htmlFor="wholeday">{t.attendance.wholeDay}</Label>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || periods.size === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </form>
      </div>
    </div>
  );
}

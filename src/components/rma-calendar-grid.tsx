"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RMA_CODE_COLORS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/context";
import { X, Eraser, Paintbrush } from "lucide-react";
import type { RmaCode, HalfDay } from "@prisma/client";

interface GridEntry {
  day: number;
  halfDay: HalfDay;
  code: RmaCode;
}

type AbsenceCategory = "JOB_SEARCH" | "DOCTOR_VISIT" | "ORP_APPOINTMENT" | "JOB_INTERVIEW";

type MandateLocation = "remote" | "onsite";

interface RmaCalendarGridProps {
  year: number;
  month: number;
  entries: GridEntry[];
  holidays: Set<number>;
  readOnly?: boolean;
  onChange?: (entries: GridEntry[]) => void;
  onAbsenceDetail?: (day: number, halfDay: HalfDay, category: AbsenceCategory) => void;
  onMandateDetail?: (day: number, halfDay: HalfDay, location: MandateLocation, locality?: string) => void;
}

const SELECTABLE_CODES: RmaCode[] = [
  "X", "O", "G", "M", "A", "B", "C", "D", "E", "F", "I",
];

const ALL_CODES: RmaCode[] = [...SELECTABLE_CODES, "H"];

function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayName(year: number, month: number, day: number, localeTag: string): string {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(localeTag, { weekday: "short" });
}

const LOCALE_TAG_MAP: Record<string, string> = {
  fr: "fr-CH",
  en: "en-GB",
  de: "de-CH",
};

const G_SUBCATEGORIES: AbsenceCategory[] = [
  "JOB_SEARCH",
  "DOCTOR_VISIT",
  "ORP_APPOINTMENT",
  "JOB_INTERVIEW",
];

export function RmaCalendarGrid({
  year,
  month,
  entries,
  holidays,
  readOnly = false,
  onChange,
  onAbsenceDetail,
  onMandateDetail,
}: RmaCalendarGridProps) {
  const { t, locale } = useTranslation();
  const localeTag = LOCALE_TAG_MAP[locale] || "fr-CH";
  const RMA_CODE_LABELS = t.rmaCodes;
  const [pickerTarget, setPickerTarget] = useState<{
    day: number;
    halfDay: HalfDay;
    rect: DOMRect;
  } | null>(null);
  const [showGSub, setShowGSub] = useState(false);
  const [showMSub, setShowMSub] = useState(false);
  const [showMLocality, setShowMLocality] = useState(false);
  const [mandateLocality, setMandateLocality] = useState("");
  const [activeCode, setActiveCode] = useState<RmaCode | "eraser" | null>(null);
  const [activeGCategory, setActiveGCategory] = useState<AbsenceCategory | null>(null);
  const [showGToolbarPicker, setShowGToolbarPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastMandateLocalityRef = useRef("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const daysInMonth = getDaysInMonth(year, month);

  const entryMap = new Map<string, RmaCode>();
  for (const e of entries) {
    entryMap.set(`${e.day}-${e.halfDay}`, e.code);
  }

  const closePicker = useCallback(() => {
    setPickerTarget(null);
    setShowGSub(false);
    setShowMSub(false);
    setShowMLocality(false);
    setMandateLocality("");
  }, []);

  // Close picker on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePicker();
    }
    if (pickerTarget) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [pickerTarget, closePicker]);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        closePicker();
      }
    }
    if (pickerTarget) {
      // Delay to avoid closing immediately from the cell click
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClick);
      };
    }
  }, [pickerTarget, closePicker]);

  // End drag on mouseup anywhere
  useEffect(() => {
    function handleMouseUp() {
      setIsDragging(false);
    }
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  function applyBrush(day: number, halfDay: HalfDay) {
    if (readOnly || !onChange) return;
    if (holidays.has(day) || isWeekend(year, month, day)) return;
    if (activeCode === "eraser") {
      const newEntries = entries.filter(
        (e) => !(e.day === day && e.halfDay === halfDay)
      );
      onChange(newEntries);
    } else if (activeCode) {
      const newEntries = entries.filter(
        (e) => !(e.day === day && e.halfDay === halfDay)
      );
      newEntries.push({ day, halfDay, code: activeCode });
      onChange(newEntries);
      if (activeCode === "G" && activeGCategory) {
        onAbsenceDetail?.(day, halfDay, activeGCategory);
      }
    }
  }

  function setCode(day: number, halfDay: HalfDay, code: RmaCode) {
    if (readOnly || !onChange) return;
    if (holidays.has(day)) return;

    const newEntries = entries.filter(
      (e) => !(e.day === day && e.halfDay === halfDay)
    );
    newEntries.push({ day, halfDay, code });
    onChange(newEntries);
    closePicker();
  }

  function removeCode(day: number, halfDay: HalfDay) {
    if (readOnly || !onChange) return;
    if (holidays.has(day)) return;
    const newEntries = entries.filter(
      (e) => !(e.day === day && e.halfDay === halfDay)
    );
    onChange(newEntries);
    closePicker();
  }

  function handleCodeClick(day: number, halfDay: HalfDay, code: RmaCode) {
    if (code === "G") {
      setShowGSub(true);
    } else if (code === "M") {
      setShowMSub(true);
    } else {
      setCode(day, halfDay, code);
    }
  }

  function selectGSubcategory(category: AbsenceCategory) {
    if (!pickerTarget) return;
    setCode(pickerTarget.day, pickerTarget.halfDay, "G" as RmaCode);
    onAbsenceDetail?.(pickerTarget.day, pickerTarget.halfDay, category);
  }

  function selectMRemote() {
    if (!pickerTarget) return;
    setCode(pickerTarget.day, pickerTarget.halfDay, "M" as RmaCode);
    onMandateDetail?.(pickerTarget.day, pickerTarget.halfDay, "remote");
  }

  function selectMOnsite() {
    setShowMLocality(true);
    setMandateLocality(lastMandateLocalityRef.current);
  }

  function confirmMOnsite() {
    if (!pickerTarget) return;
    if (mandateLocality.trim()) {
      lastMandateLocalityRef.current = mandateLocality.trim();
    }
    setCode(pickerTarget.day, pickerTarget.halfDay, "M" as RmaCode);
    onMandateDetail?.(pickerTarget.day, pickerTarget.halfDay, "onsite", mandateLocality.trim() || undefined);
  }

  function handleCellClick(
    day: number,
    halfDay: HalfDay,
    e: React.MouseEvent<HTMLTableCellElement>
  ) {
    if (readOnly || holidays.has(day) || isWeekend(year, month, day)) return;

    if (activeCode === "eraser") {
      applyBrush(day, halfDay);
      return;
    }

    if (activeCode) {
      // G with category already chosen → paint directly
      if (activeCode === "G" && activeGCategory) {
        applyBrush(day, halfDay);
        return;
      }
      // G without category or M → open sub-picker
      if (activeCode === "G" || activeCode === "M") {
        const rect = e.currentTarget.getBoundingClientRect();
        setPickerTarget({ day, halfDay, rect });
        if (activeCode === "G") setShowGSub(true);
        else setShowMSub(true);
        return;
      }
      applyBrush(day, halfDay);
      return;
    }

    // No brush active — open the normal popup picker
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerTarget({ day, halfDay, rect });
  }

  function handleCellMouseDown(day: number, halfDay: HalfDay) {
    if (!activeCode || readOnly) return;
    if (holidays.has(day) || isWeekend(year, month, day)) return;
    // G without category or M excluded from drag
    if (activeCode === "G" && !activeGCategory) return;
    if (activeCode === "M") return;
    setIsDragging(true);
    applyBrush(day, halfDay);
  }

  function handleCellMouseEnter(day: number, halfDay: HalfDay) {
    if (!isDragging || !activeCode || readOnly) return;
    if (holidays.has(day) || isWeekend(year, month, day)) return;
    if (activeCode === "G" && !activeGCategory) return;
    if (activeCode === "M") return;
    applyBrush(day, halfDay);
  }

  function renderCell(day: number, halfDay: HalfDay) {
    const key = `${day}-${halfDay}`;
    const code = entryMap.get(key);
    const weekend = isWeekend(year, month, day);
    const isHoliday = holidays.has(day);
    const isActive =
      pickerTarget?.day === day && pickerTarget?.halfDay === halfDay;
    const brushActive = activeCode !== null && !readOnly;
    const cellPaintable = brushActive && !weekend && !isHoliday;

    return (
      <td
        key={key}
        className={cn(
          "border text-center text-xs h-9 min-w-[2.25rem] select-none transition-colors",
          weekend && "bg-gray-50",
          isHoliday && "bg-gray-200 cursor-default",
          isActive && "ring-2 ring-primary ring-inset",
          !code && !weekend && !isHoliday && !readOnly && !brushActive && "hover:bg-blue-50",
          cellPaintable && "cursor-crosshair hover:bg-blue-50/60",
          !readOnly && !brushActive && !isHoliday && "cursor-pointer",
          readOnly && "cursor-default"
        )}
        onClick={(e) => handleCellClick(day, halfDay, e)}
        onMouseDown={() => handleCellMouseDown(day, halfDay)}
        onMouseEnter={() => handleCellMouseEnter(day, halfDay)}
      >
        {code && (
          <span
            className={cn(
              "inline-flex items-center justify-center w-full h-full text-[11px] font-bold",
              RMA_CODE_COLORS[code]
            )}
          >
            {code}
          </span>
        )}
      </td>
    );
  }

  function renderTable(startDay: number, endDay: number) {
    const days: number[] = [];
    for (let d = startDay; d <= Math.min(endDay, daysInMonth); d++) {
      days.push(d);
    }

    return (
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="border px-2 py-1.5 bg-gray-50 text-left w-14 sticky left-0 z-10">
              {t.common.day}
            </th>
            {days.map((d) => {
              const weekend = isWeekend(year, month, d);
              const holiday = holidays.has(d);
              return (
                <th
                  key={d}
                  className={cn(
                    "border px-1 py-1.5 min-w-[2.25rem] text-center",
                    weekend && "bg-gray-100 text-gray-400",
                    holiday && "bg-gray-200 text-gray-500"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    {getDayName(year, month, d, localeTag)}
                  </div>
                  {d}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border px-2 py-1.5 bg-gray-50 font-medium sticky left-0 z-10">
              {t.common.morning}
            </td>
            {days.map((d) => renderCell(d, "AM"))}
          </tr>
          <tr>
            <td className="border px-2 py-1.5 bg-gray-50 font-medium sticky left-0 z-10">
              {t.common.afternoon}
            </td>
            {days.map((d) => renderCell(d, "PM"))}
          </tr>
        </tbody>
      </table>
    );
  }

  // Compute picker position
  let pickerStyle: React.CSSProperties = {};
  if (pickerTarget) {
    const { rect } = pickerTarget;
    const pickerWidth = 320;
    const pickerHeight = 280;

    let left = rect.left + rect.width / 2 - pickerWidth / 2;
    let top = rect.bottom + 8;

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + pickerWidth > window.innerWidth - 8)
      left = window.innerWidth - pickerWidth - 8;
    if (top + pickerHeight > window.innerHeight - 8)
      top = rect.top - pickerHeight - 8;

    pickerStyle = {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${pickerWidth}px`,
      zIndex: 9999,
    };
  }

  const currentCode = pickerTarget
    ? entryMap.get(`${pickerTarget.day}-${pickerTarget.halfDay}`)
    : null;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {ALL_CODES.map((code) => (
          <span
            key={code}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border",
              RMA_CODE_COLORS[code]
            )}
          >
            <span className="font-bold">{code}</span>
            <span className="hidden sm:inline">{RMA_CODE_LABELS[code]}</span>
          </span>
        ))}
      </div>

      {/* Quick-fill toolbar */}
      {!readOnly && (
        <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paintbrush className="h-3.5 w-3.5" />
            <span className="font-medium">Quick fill</span>
          </div>
          <div className="flex items-center gap-1">
            {SELECTABLE_CODES.map((code) => (
              <button
                key={code}
                type="button"
                className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded text-xs font-bold border transition-all",
                  RMA_CODE_COLORS[code],
                  activeCode === code
                    ? "ring-2 ring-primary ring-offset-1 scale-110"
                    : "hover:scale-105 opacity-75 hover:opacity-100"
                )}
                onClick={() => {
                  if (code === "G") {
                    if (activeCode === "G") {
                      setActiveCode(null);
                      setActiveGCategory(null);
                      setShowGToolbarPicker(false);
                    } else {
                      setShowGToolbarPicker(true);
                      setActiveCode(null);
                      setActiveGCategory(null);
                    }
                  } else {
                    setShowGToolbarPicker(false);
                    setActiveGCategory(null);
                    setActiveCode(activeCode === code ? null : code);
                  }
                }}
                title={RMA_CODE_LABELS[code]}
              >
                {code}
              </button>
            ))}
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded border transition-all",
                activeCode === "eraser"
                  ? "ring-2 ring-primary ring-offset-1 scale-110 bg-gray-100"
                  : "hover:scale-105 opacity-75 hover:opacity-100 bg-gray-50"
              )}
              onClick={() => {
                setShowGToolbarPicker(false);
                setActiveGCategory(null);
                setActiveCode(activeCode === "eraser" ? null : "eraser");
              }}
              title={t.common.remove}
            >
              <Eraser className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
          {activeCode === "G" && activeGCategory && (
            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">
              G — {t.rma.absenceCategories[activeGCategory]}
            </span>
          )}
          {(activeCode || showGToolbarPicker) && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={() => {
                setActiveCode(null);
                setActiveGCategory(null);
                setShowGToolbarPicker(false);
              }}
            >
              {t.common.cancel}
            </button>
          )}
        </div>
        {showGToolbarPicker && !activeGCategory && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              G —
            </span>
            {G_SUBCATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className="rounded border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs text-yellow-800 hover:bg-yellow-100 transition-colors"
                onClick={() => {
                  setActiveGCategory(cat);
                  setActiveCode("G" as RmaCode);
                  setShowGToolbarPicker(false);
                }}
              >
                {t.rma.absenceCategories[cat]}
              </button>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Days 1-16 */}
      <div className="overflow-x-auto rounded border">
        {renderTable(1, 16)}
      </div>

      {/* Days 17-31 */}
      <div className="overflow-x-auto rounded border">
        {renderTable(17, 31)}
      </div>

      {/* Fixed-position code picker */}
      {pickerTarget && !readOnly && (
        <div ref={pickerRef} style={pickerStyle}>
          <div className="bg-white border rounded-lg shadow-xl p-4">
            {/* Picker header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {t.common.day} {pickerTarget.day} —{" "}
                {pickerTarget.halfDay === "AM" ? t.common.morning : t.common.afternoon}
              </span>
              <button
                type="button"
                onClick={closePicker}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {showGSub ? (
              <>
                {/* G sub-category picker */}
                <button
                  type="button"
                  onClick={() => setShowGSub(false)}
                  className="text-xs text-primary hover:underline mb-2"
                >
                  &larr; {t.common.back}
                </button>
                <div className="grid grid-cols-1 gap-1.5">
                  {G_SUBCATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-orange-50"
                      onClick={() => selectGSubcategory(cat)}
                    >
                      <span className="leading-tight">{t.rma.absenceCategories[cat]}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : showMSub ? (
              <>
                {/* M sub-picker: Remote / On-site */}
                <button
                  type="button"
                  onClick={() => { setShowMSub(false); setShowMLocality(false); }}
                  className="text-xs text-primary hover:underline mb-2"
                >
                  &larr; {t.common.back}
                </button>
                {!showMLocality ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-blue-50"
                      onClick={selectMRemote}
                    >
                      <span className="leading-tight">{t.rma.remote}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-blue-50"
                      onClick={selectMOnsite}
                    >
                      <span className="leading-tight">{t.rma.onsite}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700">
                      {t.rma.mandateLocality}
                    </label>
                    <input
                      type="text"
                      value={mandateLocality}
                      onChange={(e) => setMandateLocality(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmMOnsite(); }}
                      autoFocus
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder={t.rma.mandateLocality}
                    />
                    <button
                      type="button"
                      className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                      onClick={confirmMOnsite}
                    >
                      {t.common.confirm}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Code buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  {SELECTABLE_CODES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                        RMA_CODE_COLORS[c],
                        currentCode === c && "ring-2 ring-primary ring-offset-1",
                        "hover:opacity-80"
                      )}
                      onClick={() =>
                        handleCodeClick(pickerTarget.day, pickerTarget.halfDay, c)
                      }
                    >
                      <span className="font-bold text-sm w-5">{c}</span>
                      <span className="leading-tight">{RMA_CODE_LABELS[c]}</span>
                    </button>
                  ))}
                </div>

                {/* Remove button */}
                {currentCode && (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 transition-colors"
                    onClick={() =>
                      removeCode(pickerTarget.day, pickerTarget.halfDay)
                    }
                  >
                    {t.common.remove}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

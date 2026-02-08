"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";
import type { Canton, PublicHoliday } from "@prisma/client";
import type { Locale } from "@/lib/i18n/types";

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

export function HolidaysClient({
  initialHolidays,
}: {
  initialHolidays: PublicHoliday[];
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [canton, setCanton] = useState<Canton>("FR");
  const [saving, setSaving] = useState(false);
  const [filterCanton, setFilterCanton] = useState<string>("all");

  const filtered =
    filterCanton === "all"
      ? initialHolidays
      : initialHolidays.filter((h) => h.canton === filterCanton);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, canton }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.holidayCreated);
      setShowForm(false);
      setName("");
      setDate("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/holidays/${id}`, { method: "DELETE" });
      toast.success(t.api.holidayDeleted);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {["all", "FR", "VD", "GE"].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCanton(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                filterCanton === c
                  ? "bg-primary text-white border-primary"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {c === "all" ? t.common.all : c}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.common.add}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.common.name}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.common.date}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canton
              </label>
              <select
                value={canton}
                onChange={(e) => setCanton(e.target.value as Canton)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="FR">Fribourg (FR)</option>
                <option value="VD">Vaud (VD)</option>
                <option value="GE">Genève (GE)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? t.common.loading : t.common.add}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.name}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.date}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Canton
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((holiday) => (
              <tr key={holiday.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium">
                  {holiday.name}
                </td>
                <td className="px-6 py-3 text-sm">
                  {format(new Date(holiday.date), "d MMMM yyyy", {
                    locale: DATE_LOCALE_MAP[locale],
                  })}
                </td>
                <td className="px-6 py-3 text-sm">{holiday.canton}</td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

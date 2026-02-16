"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";
import type { Formation, FormationSession, Teacher } from "@prisma/client";
import type { Locale } from "@/lib/i18n/types";

type SessionWithCount = FormationSession & {
  _count: { enrollments: number };
};

type FormationWithSessions = Formation & {
  teacher: Teacher | null;
  sessions: SessionWithCount[];
};

const DATE_LOCALE_MAP: Record<Locale, typeof fr> = { fr, en: enGB, de };

function formatDateList(dates: Date[], locale: Locale) {
  const sorted = dates
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  const formatted = sorted.map((d) =>
    format(d, "d MMM", { locale: DATE_LOCALE_MAP[locale] })
  );
  if (formatted.length <= 3) return formatted.join(", ");
  return `${formatted.slice(0, 3).join(", ")} +${formatted.length - 3}`;
}

function toDateInputValue(d: Date | string) {
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}

type SessionForm = { id?: string; dates: string[] };

export function FormationsClient({
  initialFormations,
  teachers,
}: {
  initialFormations: FormationWithSessions[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [sessions, setSessions] = useState<SessionForm[]>([{ dates: [] }]);
  const [maxCapacity, setMaxCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editSessions, setEditSessions] = useState<SessionForm[]>([]);
  const [editMaxCapacity, setEditMaxCapacity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          teacherId: teacherId || null,
          sessions: sessions.map((s) => ({
            dates: s.dates.filter(Boolean),
          })),
          maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.formationCreated);
      setShowForm(false);
      setName("");
      setTeacherId("");
      setSessions([{ dates: [] }]);
      setMaxCapacity("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(formation: FormationWithSessions) {
    setEditingId(formation.id);
    setEditName(formation.name);
    setEditTeacherId(formation.teacherId || "");
    setEditSessions(
      formation.sessions.length > 0
        ? formation.sessions.map((s) => ({
            id: s.id,
            dates: s.dates.map((d) => toDateInputValue(d)),
          }))
        : [{ dates: [] }]
    );
    setEditMaxCapacity(formation.maxCapacity?.toString() || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);

    try {
      const res = await fetch(`/api/formations/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          teacherId: editTeacherId || null,
          sessions: editSessions.map((s) => ({
            id: s.id,
            dates: s.dates.filter(Boolean),
          })),
          maxCapacity: editMaxCapacity ? parseInt(editMaxCapacity) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.formationUpdated);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.admin.formations.confirmDelete)) return;

    try {
      await fetch(`/api/formations/${id}`, { method: "DELETE" });
      toast.success(t.api.formationDeleted);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  function renderSessionInputs(
    sessionList: SessionForm[],
    setSessionList: (s: SessionForm[]) => void
  ) {
    return (
      <div className="space-y-3">
        {sessionList.map((session, si) => (
          <div key={si} className="rounded-md border p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t.admin.formations.sessionLabel} {si + 1}
              </span>
              {sessionList.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSessionList(sessionList.filter((_, j) => j !== si))
                  }
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  {t.admin.formations.removeSession}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {session.dates.map((d, di) => (
                <div key={di} className="flex items-center gap-1">
                  <input
                    type="date"
                    value={d}
                    onChange={(e) => {
                      const next = [...sessionList];
                      next[si] = {
                        ...next[si],
                        dates: next[si].dates.map((dd, j) =>
                          j === di ? e.target.value : dd
                        ),
                      };
                      setSessionList(next);
                    }}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...sessionList];
                      next[si] = {
                        ...next[si],
                        dates: next[si].dates.filter((_, j) => j !== di),
                      };
                      setSessionList(next);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const next = [...sessionList];
                  next[si] = {
                    ...next[si],
                    dates: [...next[si].dates, ""],
                  };
                  setSessionList(next);
                }}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-3 w-3" />
                {t.admin.formations.addDate}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSessionList([...sessionList, { dates: [] }])}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" />
          {t.admin.formations.addSession}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.admin.formations.addFormation}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.admin.formations.formationName}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.admin.formations.teacherName}
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">{t.admin.formations.selectTeacher}</option>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.admin.formations.maxCapacity}
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.admin.formations.sessions}
              </label>
              {renderSessionInputs(sessions, setSessions)}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? t.common.loading : t.common.add}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setName("");
                  setTeacherId("");
                  setSessions([{ dates: [] }]);
                  setMaxCapacity("");
                }}
                className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        {initialFormations.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.admin.formations.noFormations}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.formations.formationName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.formations.teacherName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.formations.sessions}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.formations.enrolled}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialFormations.map((formation) => {
                const isEditing = editingId === formation.id;
                const totalEnrolled = formation.sessions.reduce(
                  (sum, s) => sum + s._count.enrollments,
                  0
                );

                if (isEditing) {
                  return (
                    <tr key={formation.id}>
                      <td colSpan={5} className="px-6 py-4">
                        <form onSubmit={handleUpdate} className="space-y-4">
                          <div className="flex gap-4 items-end">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.admin.formations.formationName}
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                className="w-full rounded-md border px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.admin.formations.teacherName}
                              </label>
                              <select
                                value={editTeacherId}
                                onChange={(e) => setEditTeacherId(e.target.value)}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                              >
                                <option value="">{t.admin.formations.selectTeacher}</option>
                                {teachers.map((tc) => (
                                  <option key={tc.id} value={tc.id}>{tc.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.admin.formations.maxCapacity}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editMaxCapacity}
                                onChange={(e) => setEditMaxCapacity(e.target.value)}
                                placeholder="—"
                                className="w-full rounded-md border px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.admin.formations.sessions}
                            </label>
                            {renderSessionInputs(editSessions, setEditSessions)}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={editSaving}
                              className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                            >
                              {editSaving ? t.common.loading : t.common.save}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={formation.id} className="group hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium">
                      {formation.name}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {formation.teacher?.name || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {formation.sessions.length > 0 ? (
                        <div className="space-y-1">
                          {formation.sessions.map((s, i) => (
                            <div key={s.id} className="text-xs">
                              <span className="font-medium">
                                {t.admin.formations.sessionLabel} {i + 1}
                              </span>
                              {s.dates.length > 0 && (
                                <span className="ml-1 text-gray-500">
                                  {formatDateList(s.dates, locale)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={
                          formation.maxCapacity !== null &&
                          totalEnrolled >=
                            formation.maxCapacity * formation.sessions.length
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {totalEnrolled}
                        {formation.maxCapacity !== null
                          ? ` / ${formation.maxCapacity * formation.sessions.length}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(formation)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(formation.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

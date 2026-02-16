"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Users } from "lucide-react";
import { format } from "date-fns";
import { fr, enGB, de } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/context";
import type { Formation, Teacher } from "@prisma/client";
import type { Locale } from "@/lib/i18n/types";

type FormationWithTeacher = Formation & {
  teacher: Teacher | null;
  _count: { enrollments: number };
};

type Participant = {
  id: string;
  name: string;
  email: string;
  primaryCenter: string;
};

type Enrollment = {
  id: string;
  userId: string;
  user: Participant;
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
  return `${formatted.slice(0, 3).join(", ")} +${formatted.length - 3} more`;
}

function toDateInputValue(d: Date | string) {
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}

export function FormationsClient({
  initialFormations,
  teachers,
  participants,
}: {
  initialFormations: FormationWithTeacher[];
  teachers: Teacher[];
  participants: Participant[];
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [maxCapacity, setMaxCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editDates, setEditDates] = useState<string[]>([]);
  const [editMaxCapacity, setEditMaxCapacity] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Enrollment management
  const [enrollmentFormationId, setEnrollmentFormationId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

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
          dates: dates.filter(Boolean),
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
      setDates([]);
      setMaxCapacity("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(formation: FormationWithTeacher) {
    setEditingId(formation.id);
    setEditName(formation.name);
    setEditTeacherId(formation.teacherId || "");
    const formationDates = formation.dates || [];
    setEditDates(
      formationDates.length > 0
        ? formationDates.map((d) => toDateInputValue(d))
        : []
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
          dates: editDates.filter(Boolean),
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
      if (enrollmentFormationId === id) {
        setEnrollmentFormationId(null);
        setEnrollments([]);
      }
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  async function toggleEnrollments(formationId: string) {
    if (enrollmentFormationId === formationId) {
      setEnrollmentFormationId(null);
      setEnrollments([]);
      return;
    }

    setEnrollmentFormationId(formationId);
    setEnrollmentLoading(true);
    try {
      const res = await fetch(`/api/formations/${formationId}/enrollments`);
      if (res.ok) {
        setEnrollments(await res.json());
      }
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setEnrollmentLoading(false);
    }
  }

  async function handleAddEnrollment(formationId: string) {
    if (!selectedUserId) return;

    try {
      const res = await fetch(`/api/formations/${formationId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      const enrollment = await res.json();
      setEnrollments((prev) => [...prev, enrollment]);
      setSelectedUserId("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  async function handleRemoveEnrollment(formationId: string, enrollmentId: string) {
    try {
      const res = await fetch(
        `/api/formations/${formationId}/enrollments/${enrollmentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        toast.error(t.api.serverError);
        return;
      }

      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  function enrolledUserIds() {
    return new Set(enrollments.map((e) => e.userId));
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
                {t.admin.formations.sessionDates}
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {dates.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="date"
                      value={d}
                      onChange={(e) => {
                        const next = [...dates];
                        next[i] = e.target.value;
                        setDates(next);
                      }}
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setDates(dates.filter((_, j) => j !== i))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDates([...dates, ""])}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" />
                  {t.admin.formations.addDate}
                </button>
              </div>
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
                  setDates([]);
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
                  {t.admin.formations.sessionDates}
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
                const isEnrollmentOpen = enrollmentFormationId === formation.id;
                const enrolledCount = formation._count.enrollments;

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
                              {t.admin.formations.sessionDates}
                            </label>
                            <div className="flex flex-wrap gap-2 items-center">
                              {editDates.map((d, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <input
                                    type="date"
                                    value={d}
                                    onChange={(e) => {
                                      const next = [...editDates];
                                      next[i] = e.target.value;
                                      setEditDates(next);
                                    }}
                                    className="rounded-md border px-3 py-2 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditDates(
                                        editDates.filter((_, j) => j !== i)
                                      )
                                    }
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditDates([...editDates, ""])
                                }
                                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                              >
                                <Plus className="h-3 w-3" />
                                {t.admin.formations.addDate}
                              </button>
                            </div>
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
                  <Fragment key={formation.id}>
                    <tr className="group hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium">
                        {formation.name}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {formation.teacher?.name || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {(formation.dates || []).length > 0
                          ? formatDateList(formation.dates, locale)
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={
                            formation.maxCapacity !== null &&
                            enrolledCount >= formation.maxCapacity
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {enrolledCount}
                          {formation.maxCapacity !== null
                            ? ` / ${formation.maxCapacity}`
                            : ""}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleEnrollments(formation.id)}
                            className={`hover:text-blue-700 ${
                              isEnrollmentOpen
                                ? "text-blue-600"
                                : "text-gray-500"
                            }`}
                            title={t.admin.formations.manageStudents}
                          >
                            <Users className="h-4 w-4" />
                          </button>
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
                    {isEnrollmentOpen && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 border-t">
                          {enrollmentLoading ? (
                            <p className="text-sm text-gray-500">{t.common.loading}</p>
                          ) : (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium">
                                {t.admin.formations.manageStudents}
                                {formation.maxCapacity !== null && (
                                  <span className="ml-2 text-gray-500 font-normal">
                                    ({enrollments.length} / {formation.maxCapacity})
                                  </span>
                                )}
                              </h4>

                              {enrollments.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  {t.admin.formations.noStudents}
                                </p>
                              ) : (
                                <ul className="divide-y rounded-md border bg-white">
                                  {enrollments.map((enrollment) => (
                                    <li
                                      key={enrollment.id}
                                      className="flex items-center justify-between px-4 py-2 text-sm"
                                    >
                                      <div>
                                        <span className="font-medium">
                                          {enrollment.user.name}
                                        </span>
                                        <span className="ml-2 text-gray-500">
                                          {enrollment.user.email}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-400">
                                          {enrollment.user.primaryCenter}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleRemoveEnrollment(
                                            formation.id,
                                            enrollment.id
                                          )
                                        }
                                        className="text-red-500 hover:text-red-700 text-xs"
                                      >
                                        {t.admin.formations.removeStudent}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {(formation.maxCapacity === null ||
                                enrollments.length < formation.maxCapacity) && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                                  >
                                    <option value="">
                                      {t.admin.formations.selectStudent}
                                    </option>
                                    {participants
                                      .filter((p) => !enrolledUserIds().has(p.id))
                                      .map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} — {p.email}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={() => handleAddEnrollment(formation.id)}
                                    disabled={!selectedUserId}
                                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                                  >
                                    {t.admin.formations.addStudent}
                                  </button>
                                </div>
                              )}

                              {formation.maxCapacity !== null &&
                                enrollments.length >= formation.maxCapacity && (
                                  <p className="text-sm text-red-600 font-medium">
                                    {t.admin.formations.classFull}
                                  </p>
                                )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

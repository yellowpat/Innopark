"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Teacher } from "@prisma/client";

export function TeachersClient({
  initialTeachers,
}: {
  initialTeachers: Teacher[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.teacherCreated);
      setShowForm(false);
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(teacher: Teacher) {
    setEditingId(teacher.id);
    setEditName(teacher.name);
    setEditEmail(teacher.email || "");
    setEditPhone(teacher.phone || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);

    try {
      const res = await fetch(`/api/teachers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.teacherUpdated);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.admin.teachers.confirmDelete)) return;

    try {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      toast.success(t.api.teacherDeleted);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.admin.teachers.addTeacher}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.admin.teachers.teacherName}
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
                  {t.common.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.admin.teachers.phone}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
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
                  setEmail("");
                  setPhone("");
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
        {initialTeachers.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t.admin.teachers.noTeachers}
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.teachers.teacherName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.email}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.admin.teachers.phone}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialTeachers.map((teacher) =>
                editingId === teacher.id ? (
                  <tr key={teacher.id}>
                    <td colSpan={4} className="px-6 py-4">
                      <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.admin.teachers.teacherName}
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
                              {t.common.email}
                            </label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t.admin.teachers.phone}
                            </label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full rounded-md border px-3 py-2 text-sm"
                            />
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
                ) : (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium">
                      {teacher.name}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {teacher.email || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {teacher.phone || "—"}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(teacher)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

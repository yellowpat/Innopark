"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Formation } from "@prisma/client";

export function FormationsClient({
  initialFormations,
}: {
  initialFormations: Formation[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.formationCreated);
      setShowForm(false);
      setName("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
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
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
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
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialFormations.map((formation) => (
                <tr key={formation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium">
                    {formation.name}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleDelete(formation.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

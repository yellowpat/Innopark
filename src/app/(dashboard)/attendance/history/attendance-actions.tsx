"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Center, RmaCode } from "@prisma/client";

const CENTERS: Center[] = ["LAUSANNE", "FRIBOURG", "GENEVA"];
const CODES: RmaCode[] = ["X", "O", "A", "B", "C", "D", "E", "F", "G", "H", "I", "M"];

interface AttendanceActionsProps {
  recordId: string;
  center: Center;
  actualCode: RmaCode;
  notes: string | null;
}

export function AttendanceActions({
  recordId,
  center: initialCenter,
  actualCode: initialCode,
  notes: initialNotes,
}: AttendanceActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [center, setCenter] = useState<Center>(initialCenter);
  const [actualCode, setActualCode] = useState<RmaCode>(initialCode);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/attendance/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center, actualCode, notes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.attendance.updated);
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t.attendance.confirmDelete)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/attendance/${recordId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.attendance.deleted);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
        >
          <Pencil className="h-3 w-3" />
          {t.common.edit}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          {t.common.delete}
        </button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.common.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.common.center}
              </label>
              <div className="flex gap-2">
                {CENTERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCenter(c)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      center === c
                        ? "bg-primary text-white border-primary"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {t.centers[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.rma.code}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setActualCode(code)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                      actualCode === code
                        ? "bg-primary text-white border-primary"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.common.notes}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

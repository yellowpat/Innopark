"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function DeleteAttendance({ recordId }: { recordId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

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
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1"
    >
      <Trash2 className="h-3 w-3" />
      {t.common.delete}
    </button>
  );
}

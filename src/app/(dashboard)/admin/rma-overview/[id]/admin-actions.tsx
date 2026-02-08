"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export function RmaAdminActions({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t.admin.rmaOverview.confirmDeleteRma)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/rma/${submissionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.admin.rmaOverview.rmaDeleted);
      router.push("/admin/rma-overview");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Link
        href={`/rma/${submissionId}`}
        className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        <Pencil className="h-4 w-4" />
        {t.admin.rmaOverview.editRma}
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        {t.admin.rmaOverview.deleteRma}
      </button>
    </div>
  );
}

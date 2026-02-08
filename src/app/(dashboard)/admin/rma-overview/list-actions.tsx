"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export function RmaListActions({ submissionId }: { submissionId: string }) {
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
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Link
        href={`/admin/rma-overview/${submissionId}`}
        className="text-xs text-primary hover:underline"
      >
        {t.rma.viewDetails}
      </Link>
      <Link
        href={`/rma/${submissionId}`}
        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
      >
        <Pencil className="h-3 w-3" />
        {t.common.edit}
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1"
      >
        <Trash2 className="h-3 w-3" />
        {t.common.delete}
      </button>
    </div>
  );
}

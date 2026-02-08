"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function RmaReviewActions({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReview(action: "APPROVED" | "REVISION_REQUESTED") {
    setLoading(true);
    try {
      const res = await fetch(`/api/rma/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: notes || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(
        action === "APPROVED" ? t.api.rmaApproved : t.api.rmaRevisionRequested
      );
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 font-semibold">{t.common.actions}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.common.notes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t.admin.rmaOverview.revisionPlaceholder}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleReview("APPROVED")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {t.admin.rmaOverview.approve}
          </button>
          <button
            onClick={() => handleReview("REVISION_REQUESTED")}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t.admin.rmaOverview.requestRevision}
          </button>
        </div>
      </div>
    </div>
  );
}

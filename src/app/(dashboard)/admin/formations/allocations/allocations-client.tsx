"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  return `${formatted.slice(0, 3).join(", ")} +${formatted.length - 3}`;
}

export function AllocationsClient({
  initialFormations,
  participants,
}: {
  initialFormations: FormationWithSessions[];
  participants: Participant[];
}) {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [expandedFormationId, setExpandedFormationId] = useState<string | null>(null);
  // Per-session enrollments: { [sessionId]: Enrollment[] }
  const [sessionEnrollments, setSessionEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, string>>({});

  function toggleFormation(formationId: string) {
    if (expandedFormationId === formationId) {
      setExpandedFormationId(null);
      setSessionEnrollments({});
      return;
    }
    setExpandedFormationId(formationId);
    setSessionEnrollments({});
  }

  async function loadSessionEnrollments(formationId: string, sessionId: string) {
    if (sessionEnrollments[sessionId]) return;
    setLoadingSessionId(sessionId);
    try {
      const res = await fetch(
        `/api/formations/${formationId}/sessions/${sessionId}/enrollments`
      );
      if (res.ok) {
        const data = await res.json();
        setSessionEnrollments((prev) => ({ ...prev, [sessionId]: data }));
      }
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setLoadingSessionId(null);
    }
  }

  async function handleAddEnrollment(formationId: string, sessionId: string) {
    const userId = selectedUserIds[sessionId];
    if (!userId) return;

    try {
      const res = await fetch(
        `/api/formations/${formationId}/sessions/${sessionId}/enrollments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      const enrollment = await res.json();
      setSessionEnrollments((prev) => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), enrollment],
      }));
      setSelectedUserIds((prev) => ({ ...prev, [sessionId]: "" }));
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  async function handleRemoveEnrollment(
    formationId: string,
    sessionId: string,
    enrollmentId: string
  ) {
    try {
      const res = await fetch(
        `/api/formations/${formationId}/sessions/${sessionId}/enrollments/${enrollmentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        toast.error(t.api.serverError);
        return;
      }

      setSessionEnrollments((prev) => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).filter((e) => e.id !== enrollmentId),
      }));
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  function enrolledUserIdsForSession(sessionId: string) {
    return new Set((sessionEnrollments[sessionId] || []).map((e) => e.userId));
  }

  return (
    <div className="space-y-4">
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
                const isExpanded = expandedFormationId === formation.id;
                const totalEnrolled = formation.sessions.reduce(
                  (sum, s) => sum + s._count.enrollments,
                  0
                );

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
                        {formation.sessions.length}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {totalEnrolled}
                        {formation.maxCapacity !== null
                          ? ` / ${formation.maxCapacity * formation.sessions.length}`
                          : ""}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleFormation(formation.id)}
                          className={`hover:text-blue-700 ${
                            isExpanded ? "text-blue-600" : "text-gray-500"
                          }`}
                          title={t.admin.allocations.manageStudents}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 border-t">
                          <div className="space-y-4">
                            {formation.sessions.map((formationSession, si) => (
                              <SessionEnrollmentBlock
                                key={formationSession.id}
                                session={formationSession}
                                sessionIndex={si}
                                maxCapacity={formation.maxCapacity}
                                enrollments={sessionEnrollments[formationSession.id]}
                                isLoading={loadingSessionId === formationSession.id}
                                selectedUserId={selectedUserIds[formationSession.id] || ""}
                                participants={participants}
                                enrolledUserIds={enrolledUserIdsForSession(formationSession.id)}
                                locale={locale}
                                t={t}
                                onLoad={() =>
                                  loadSessionEnrollments(formation.id, formationSession.id)
                                }
                                onAdd={() =>
                                  handleAddEnrollment(formation.id, formationSession.id)
                                }
                                onRemove={(enrollmentId) =>
                                  handleRemoveEnrollment(
                                    formation.id,
                                    formationSession.id,
                                    enrollmentId
                                  )
                                }
                                onSelectUser={(userId) =>
                                  setSelectedUserIds((prev) => ({
                                    ...prev,
                                    [formationSession.id]: userId,
                                  }))
                                }
                              />
                            ))}
                            {formation.sessions.length === 0 && (
                              <p className="text-sm text-gray-500">
                                {t.admin.formations.noFormations}
                              </p>
                            )}
                          </div>
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

function SessionEnrollmentBlock({
  session,
  sessionIndex,
  maxCapacity,
  enrollments,
  isLoading,
  selectedUserId,
  participants,
  enrolledUserIds,
  locale,
  t,
  onLoad,
  onAdd,
  onRemove,
  onSelectUser,
}: {
  session: SessionWithCount;
  sessionIndex: number;
  maxCapacity: number | null;
  enrollments: Enrollment[] | undefined;
  isLoading: boolean;
  selectedUserId: string;
  participants: Participant[];
  enrolledUserIds: Set<string>;
  locale: Locale;
  t: ReturnType<typeof import("@/lib/i18n/context").useTranslation>["t"];
  onLoad: () => void;
  onAdd: () => void;
  onRemove: (enrollmentId: string) => void;
  onSelectUser: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    if (!expanded) {
      onLoad();
    }
    setExpanded(!expanded);
  }

  const enrollmentCount = enrollments?.length ?? session._count.enrollments;
  const isFull = maxCapacity !== null && enrollmentCount >= maxCapacity;

  return (
    <div className="rounded-md border bg-white">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span className="font-medium">
            {t.admin.formations.sessionLabel} {sessionIndex + 1}
          </span>
          {session.dates.length > 0 && (
            <span className="text-gray-500">
              {formatDateList(session.dates, locale)}
            </span>
          )}
        </div>
        <span
          className={`text-sm ${isFull ? "text-red-600 font-medium" : "text-gray-500"}`}
        >
          {enrollmentCount}
          {maxCapacity !== null ? ` / ${maxCapacity}` : ""}
        </span>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">{t.common.loading}</p>
          ) : (
            <>
              {(!enrollments || enrollments.length === 0) ? (
                <p className="text-sm text-gray-500">
                  {t.admin.allocations.noStudents}
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
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
                        onClick={() => onRemove(enrollment.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        {t.admin.allocations.removeStudent}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!isFull && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => onSelectUser(e.target.value)}
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {t.admin.allocations.selectStudent}
                    </option>
                    {participants
                      .filter((p) => !enrolledUserIds.has(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.email}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={onAdd}
                    disabled={!selectedUserId}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t.admin.allocations.addStudent}
                  </button>
                </div>
              )}

              {isFull && (
                <p className="text-sm text-red-600 font-medium">
                  {t.admin.allocations.classFull}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

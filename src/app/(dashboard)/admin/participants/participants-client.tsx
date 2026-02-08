"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Pencil } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import type { Role, Center } from "@prisma/client";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  primaryCenter: Center;
  active: boolean;
  createdAt: Date;
}

export function ParticipantsClient({
  initialUsers,
  isAdmin,
}: {
  initialUsers: UserData[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PARTICIPANT");
  const [center, setCenter] = useState<Center>("FRIBOURG");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<Role>("PARTICIPANT");
  const [editCenter, setEditCenter] = useState<Center>("FRIBOURG");
  const [editSaving, setEditSaving] = useState(false);

  const ROLE_LABELS: Record<Role, string> = {
    PARTICIPANT: t.roleSwitcher.participant,
    CENTER_STAFF: t.roleSwitcher.staff,
    ADMIN: t.roleSwitcher.admin,
  };

  const filtered = initialUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          role,
          primaryCenter: center,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.participantCreated);
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const user = initialUsers.find((u) => u.id === id);
      if (!user) return;
      await fetch(`/api/participants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          primaryCenter: user.primaryCenter,
          active: !active,
        }),
      });
      toast.success(active ? t.admin.participants.deactivate : t.admin.participants.activate);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    }
  }

  function startEdit(user: UserData) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.role);
    setEditCenter(user.primaryCenter);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);

    try {
      const res = await fetch(`/api/participants/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
          role: editRole,
          primaryCenter: editCenter,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.api.serverError);
        return;
      }

      toast.success(t.api.participantUpdated);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error(t.api.serverError);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.admin.participants.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t.common.add}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-4">{t.admin.participants.addParticipant}</h3>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder={t.common.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder={t.common.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder={t.common.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="PARTICIPANT">{t.roleSwitcher.participant}</option>
              {isAdmin && <option value="CENTER_STAFF">{t.roleSwitcher.staff}</option>}
              {isAdmin && <option value="ADMIN">{t.roleSwitcher.admin}</option>}
            </select>
            <select
              value={center}
              onChange={(e) => setCenter(e.target.value as Center)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="FRIBOURG">Fribourg</option>
              <option value="LAUSANNE">Lausanne</option>
              <option value="GENEVA">Geneva / Genève</option>
            </select>
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
                onClick={() => setShowForm(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.name}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.email}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.role}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.center}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.status}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t.common.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((user) =>
              editingId === user.id ? (
                <tr key={user.id} className="bg-blue-50">
                  <td colSpan={6} className="px-6 py-4">
                    <form onSubmit={handleEdit} className="space-y-3">
                      <h4 className="text-sm font-semibold">{t.admin.participants.editParticipant}</h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={t.common.name}
                          required
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder={t.common.email}
                          required
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder={`${t.common.password} (${t.common.noResults})`}
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as Role)}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          <option value="PARTICIPANT">{t.roleSwitcher.participant}</option>
                          {isAdmin && <option value="CENTER_STAFF">{t.roleSwitcher.staff}</option>}
                          {isAdmin && <option value="ADMIN">{t.roleSwitcher.admin}</option>}
                        </select>
                        <select
                          value={editCenter}
                          onChange={(e) => setEditCenter(e.target.value as Center)}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          <option value="FRIBOURG">{t.centers.FRIBOURG}</option>
                          <option value="LAUSANNE">{t.centers.LAUSANNE}</option>
                          <option value="GENEVA">{t.centers.GENEVA}</option>
                        </select>
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
                          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium">{user.name}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-6 py-3 text-sm">{ROLE_LABELS[user.role]}</td>
                  <td className="px-6 py-3 text-sm">{t.centers[user.primaryCenter]}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.active ? t.common.active : t.common.inactive}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        {t.common.edit}
                      </button>
                      <Link
                        href={`/admin/participants/${user.id}/history`}
                        className="text-primary hover:underline text-xs"
                      >
                        {t.rma.history}
                      </Link>
                      <button
                        onClick={() => toggleActive(user.id, user.active)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {user.active ? t.admin.participants.deactivate : t.admin.participants.activate}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

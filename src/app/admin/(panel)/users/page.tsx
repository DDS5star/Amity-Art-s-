"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson, useAdminAuth } from "@/components/admin/auth";

interface Row {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  role: "SUPER_ADMIN" | "MANAGER" | "WHOLESALER" | "CUSTOMER";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  wholesalerProfile: { companyName: string; status: string } | null;
}

const ROLES = ["ALL", "CUSTOMER", "WHOLESALER", "MANAGER", "SUPER_ADMIN"] as const;

export default function AdminUsersPage() {
  const me = useAdminAuth((s) => s.user);
  const [role, setRole] = useState<(typeof ROLES)[number]>("ALL");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    const q = role === "ALL" ? "" : `&role=${role}`;
    const data = await adminJson<{ items: Row[] }>(`/api/admin/users?limit=50${q}`);
    setRows(data.items);
  }, [role]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const act = async (id: string, action: "SUSPEND" | "ACTIVATE" | "PROMOTE_MANAGER" | "DEMOTE_MANAGER") => {
    setError("");
    try {
      await adminJson(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (me?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-ink-500">Only the super admin can manage users.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-950">Users</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
              role === r ? "bg-ink-950 text-white" : "bg-white border border-ivory-300 text-ink-700"
            }`}
          >
            {r === "ALL" ? "All" : r.replace("_", " ").toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 bg-white rounded-xl border border-ivory-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-ivory-200">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last login</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {rows === null ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">Loading…</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-ivory-50">
                  <td className="px-5 py-3">
                    <p className="text-ink-950">{u.firstName} {u.lastName ?? ""}</p>
                    <p className="text-xs text-ink-400">
                      {u.email}
                      {u.wholesalerProfile ? ` · ${u.wholesalerProfile.companyName}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-ink-700 capitalize">{u.role.replace("_", " ").toLowerCase()}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {u.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-500">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "never"}
                  </td>
                  <td className="px-5 py-3">
                    {u.role === "SUPER_ADMIN" || u.id === me.id ? (
                      <span className="text-xs text-ink-400">—</span>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {u.isActive ? (
                          <button type="button" onClick={() => act(u.id, "SUSPEND")} className="text-xs px-3 py-1.5 rounded-lg border border-ivory-300 text-ink-700 hover:border-red-300 hover:text-red-700 cursor-pointer">
                            Suspend
                          </button>
                        ) : (
                          <button type="button" onClick={() => act(u.id, "ACTIVATE")} className="text-xs px-3 py-1.5 rounded-lg border border-ivory-300 text-ink-700 hover:border-emerald-400 hover:text-emerald-700 cursor-pointer">
                            Activate
                          </button>
                        )}
                        {u.role === "CUSTOMER" && (
                          <button type="button" onClick={() => act(u.id, "PROMOTE_MANAGER")} className="text-xs px-3 py-1.5 rounded-lg border border-ivory-300 text-ink-700 hover:border-ink-500 cursor-pointer">
                            Make manager
                          </button>
                        )}
                        {u.role === "MANAGER" && (
                          <button type="button" onClick={() => act(u.id, "DEMOTE_MANAGER")} className="text-xs px-3 py-1.5 rounded-lg border border-ivory-300 text-ink-700 hover:border-ink-500 cursor-pointer">
                            Remove manager
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

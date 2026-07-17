"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson, useAdminAuth } from "@/components/admin/auth";

interface Setting {
  key: string;
  value: unknown;
  group: string;
}

const GROUP_LABELS: Record<string, string> = {
  general: "Store",
  shipping: "Shipping & warehouse",
  tax: "GST",
  checkout: "Checkout",
  integrations: "Integrations",
  growth: "Loyalty & growth",
};

export default function AdminSettingsPage() {
  const role = useAdminAuth((s) => s.user?.role);
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setSettings(await adminJson<Setting[]>("/api/admin/settings"));
  }, []);

  useEffect(() => {
    if (role === "SUPER_ADMIN") load().catch((e) => setMessage({ kind: "err", text: e.message }));
  }, [load, role]);

  if (role !== "SUPER_ADMIN") {
    return <p className="text-sm text-ink-500">Only the super admin can manage settings.</p>;
  }

  const save = async (s: Setting) => {
    const draft = drafts[s.key];
    if (draft === undefined) return;
    setMessage(null);
    // Preserve the original JSON type: numbers stay numbers, booleans booleans.
    let value: unknown = draft;
    if (typeof s.value === "number") value = Number(draft);
    if (typeof s.value === "boolean") value = draft === "true";
    try {
      await adminJson("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: s.key, value, group: s.group }),
      });
      setMessage({ kind: "ok", text: `Saved ${s.key}` });
      setDrafts((d) => {
        const next = { ...d };
        delete next[s.key];
        return next;
      });
      await load();
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    }
  };

  const groups = settings
    ? [...new Set(settings.map((s) => s.group))].map((g) => ({
        group: g,
        items: settings.filter((s) => s.group === g),
      }))
    : [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl text-ink-950">Settings</h1>
      <p className="mt-1 text-sm text-ink-400">
        Warehouse pincode drives delivery estimates. Values are validated per key.
      </p>

      {message && (
        <p className={`mt-4 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {settings === null ? (
        <p className="mt-6 text-sm text-ink-400">Loading…</p>
      ) : (
        groups.map(({ group, items }) => (
          <section key={group} className="mt-6 bg-white rounded-xl border border-ivory-200">
            <h2 className="px-5 py-3.5 border-b border-ivory-200 text-sm font-semibold text-ink-950">
              {GROUP_LABELS[group] ?? group}
            </h2>
            <div className="divide-y divide-ivory-200">
              {items.map((s) => {
                const isBool = typeof s.value === "boolean";
                const current = drafts[s.key] ?? String(s.value ?? "");
                const dirty = drafts[s.key] !== undefined && drafts[s.key] !== String(s.value ?? "");
                return (
                  <div key={s.key} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="w-64 shrink-0">
                      <p className="text-sm text-ink-950">{s.key}</p>
                    </div>
                    {isBool ? (
                      <select
                        className="px-3 py-2 rounded-lg border border-ivory-300 bg-white text-sm"
                        value={current}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        className="flex-1 px-3 py-2 rounded-lg border border-ivory-300 bg-white text-sm text-ink-950 focus:border-gold-600"
                        value={current}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                      />
                    )}
                    <button
                      type="button"
                      disabled={!dirty}
                      onClick={() => save(s)}
                      className="px-4 py-2 rounded-lg bg-ink-950 text-white text-xs font-medium disabled:opacity-30 hover:bg-ink-800 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  SquaresFour,
  Package,
  Receipt,
  TreeStructure,
  Storefront,
  Users,
  GearSix,
  SignOut,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useAdminAuth, tryRestoreSession } from "@/components/admin/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: SquaresFour, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: TreeStructure },
  { href: "/admin/wholesalers", label: "Wholesalers", icon: Storefront },
  { href: "/admin/users", label: "Users", icon: Users, superOnly: true },
  { href: "/admin/settings", label: "Settings", icon: GearSix, superOnly: true },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { status, user, clear } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unknown") void tryRestoreSession();
    if (status === "guest") router.replace("/admin/login");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-ivory-100">
        <p className="text-sm text-ink-500 animate-pulse">Checking session…</p>
      </div>
    );
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.replace("/admin/login");
  };

  const visibleNav = NAV.filter((n) => !n.superOnly || user.role === "SUPER_ADMIN");

  return (
    <div className="min-h-[100dvh] flex bg-ivory-100">
      <aside className="w-60 shrink-0 bg-white border-r border-ivory-200 flex flex-col sticky top-0 h-[100dvh]">
        <div className="px-5 py-5 border-b border-ivory-200">
          <Link href="/admin">
            <Image src="/brand/logo.png" alt="Amity Arts" width={140} height={70} className="h-11 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-ink-950 text-white font-medium"
                    : "text-ink-700 hover:bg-ivory-100"
                }`}
              >
                <item.icon size={18} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-ivory-200 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-500 hover:bg-ivory-100 transition-colors"
          >
            <ArrowSquareOut size={18} /> View store
          </Link>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-500 hover:bg-ivory-100 transition-colors cursor-pointer"
          >
            <SignOut size={18} /> Sign out
          </button>
          <p className="px-3 pt-2 text-xs text-ink-400 truncate">
            {user.firstName} · {user.role === "SUPER_ADMIN" ? "Super admin" : "Manager"}
          </p>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 lg:p-10">{children}</main>
    </div>
  );
}

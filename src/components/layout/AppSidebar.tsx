"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/layout/NavIcons";
import type { AppPath } from "@/lib/navigation/appPaths";
import { appPaths } from "@/lib/navigation/appPaths";
import { navigationGroups } from "@/lib/navigation/navConfig";
import { appPathToModule } from "@/lib/permissions/routeModules";
import { usePermissions } from "@/hooks/permissions/usePermissions";

function NavLink({
  href,
  label,
  description,
  onNavigate,
}: {
  href: string;
  label: string;
  description?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const [base, fragment] = href.split("#");
  const pathPart = base ?? href;
  const wantsHash = fragment != null && fragment !== "";

  let active = false;
  if (pathname === pathPart || pathname.startsWith(`${pathPart}/`)) {
    if (wantsHash) {
      active = hash === `#${fragment}`;
    } else if (pathPart === appPaths.dashboard && href === appPaths.dashboard) {
      active = hash === "" || hash === "#";
    } else {
      active =
        pathname === href ||
        (pathPart !== appPaths.dashboard && pathname.startsWith(`${pathPart}/`));
    }
  }
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-teal-500/14 to-cyan-500/10 text-teal-950 shadow-sm ring-1 ring-teal-500/22 dark:from-teal-500/18 dark:to-cyan-500/10 dark:text-teal-50 dark:ring-teal-400/28"
          : "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
      }`}
    >
      <NavIcon href={href} active={active} />
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-snug">{label}</span>
        {description ? (
          <span
            className={`mt-0.5 block truncate text-[10px] font-normal leading-tight ${
              active
                ? "text-teal-900/70 dark:text-teal-100/70"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { canView, isSuperAdmin, isUserLoading } = usePermissions();

  const canSeeHref = (href: string) => {
    if (isUserLoading) return true;
    if (isSuperAdmin) return true;
    const mod = appPathToModule[href as AppPath];
    if (!mod) return true;
    return canView(mod);
  };

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200/45 bg-gradient-to-b from-white/96 via-teal-50/[0.07] to-white/92 shadow-[4px_0_40px_-16px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-zinc-800/65 dark:from-zinc-950 dark:via-zinc-950/98 dark:to-zinc-950/92 dark:shadow-[4px_0_44px_-10px_rgba(0,0,0,0.52)]">
      <div className="relative border-b border-zinc-200/50 px-4 py-6 dark:border-zinc-800/70">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/45 to-transparent" />
        <Link
          href={appPaths.dashboard}
          onClick={onNavigate}
          className="block transition hover:opacity-90"
        >
          <span className="bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-teal-300 dark:via-teal-400 dark:to-cyan-300">
            Billing
          </span>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Accounts
          </p>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {navigationGroups.map((group) => {
          const visible = group.items.filter((item) => canSeeHref(item.href));
          if (visible.length === 0) return null;
          return (
            <div
              key={group.title}
              className="mb-7 last:mb-0 rounded-2xl border border-zinc-200/40 bg-zinc-50/40 p-2 dark:border-zinc-800/50 dark:bg-zinc-900/35"
            >
              <p className="mb-2 px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      description={item.description}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

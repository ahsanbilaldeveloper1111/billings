"use client";

import { HeaderCurrencySelect } from "@/components/layout/HeaderCurrencySelect";
import { useAuth } from "@/contexts/auth-context";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";

function initials(name: string | null | undefined): string {
  if (name == null) return "?";
  const s = typeof name === "string" ? name : String(name);
  if (!s.trim()) return "?";
  const parts = s.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export function AppTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { token, logout } = useAuth();
  const userQuery = useCurrentUser();

  const userRecord =
    userQuery.data?.user && typeof userQuery.data.user === "object"
      ? (userQuery.data.user as Record<string, unknown>)
      : null;
  const displayName =
    (userRecord?.name as string | undefined) ??
    (userRecord?.samaccountname as string | undefined) ??
    null;

  const sub = userQuery.isFetching ? "Syncing profile…" : " ";

  return (
    <header className="sticky top-0 z-30 flex h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b border-zinc-200/35 bg-white/75 px-3 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_8px_32px_-20px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-zinc-800/40 dark:bg-zinc-950/72 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_10px_40px_-20px_rgba(0,0,0,0.35)] sm:h-14 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 lg:hidden"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-xs font-semibold text-white shadow-md shadow-teal-600/22"
            aria-hidden
          >
            {initials(displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {displayName ?? "Signed out"}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {sub}
            </p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {token ? <HeaderCurrencySelect /> : null}
        {token ? (
          <span className="hidden rounded-full bg-teal-500/12 px-2.5 py-1 text-[11px] font-medium text-teal-900 ring-1 ring-teal-500/22 dark:text-teal-200 dark:ring-teal-400/25 sm:inline">
            Session
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-xl bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-zinc-900/10 transition hover:bg-zinc-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

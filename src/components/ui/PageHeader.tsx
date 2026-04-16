import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="relative mb-10 sm:mb-12">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white via-white to-teal-50/35 p-6 shadow-[0_12px_48px_-20px_rgba(15,23,42,0.08)] ring-1 ring-zinc-900/[0.035] dark:border-zinc-800/85 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/20 dark:shadow-[0_16px_56px_-24px_rgba(0,0,0,0.5)] dark:ring-white/[0.05] sm:rounded-3xl sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br from-teal-300/20 via-cyan-200/12 to-transparent blur-3xl dark:from-teal-500/15 dark:via-cyan-600/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-gradient-to-tr from-violet-200/15 to-fuchsia-200/8 blur-2xl dark:from-violet-500/10 dark:to-fuchsia-600/8"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4 sm:gap-5">
            <span
              className="mt-1 hidden h-[min(100%,5.5rem)] min-h-[3.25rem] w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-500 via-teal-600 to-cyan-600 shadow-[0_4px_16px_-4px_rgba(13,148,136,0.4)] sm:block dark:shadow-[0_4px_18px_-4px_rgba(45,212,191,0.25)]"
              aria-hidden
            />
            <div className="min-w-0 space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl sm:leading-tight">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5 sm:pt-1">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

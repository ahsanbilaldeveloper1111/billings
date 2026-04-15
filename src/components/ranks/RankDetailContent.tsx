"use client";

function formatWhen(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function actionPillClass(action: string): string {
  const a = action.toLowerCase();
  const base =
    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  if (a === "admin") return `${base} bg-violet-600 text-white`;
  if (a === "delete") return `${base} bg-rose-600 text-white`;
  if (a === "update") return `${base} bg-sky-600 text-white`;
  if (a === "create") return `${base} bg-emerald-600 text-white`;
  return `${base} bg-zinc-500 text-white`;
}

type RankDetailContentProps = {
  rank: Record<string, unknown>;
};

export function RankDetailContent({ rank }: RankDetailContentProps) {
  const name = String(rank.name ?? "—");
  const description =
    typeof rank.description === "string" && rank.description.trim()
      ? rank.description.trim()
      : null;
  const id = rank.id;
  const idLabel =
    typeof id === "number" || typeof id === "string" ? String(id) : "—";
  const usersCount =
    typeof rank.users_count === "number" ? rank.users_count : null;

  const rawPerms = rank.permissions;
  const permissions: Record<string, unknown>[] = Array.isArray(rawPerms)
    ? (rawPerms as Record<string, unknown>[])
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-5 shadow-sm dark:border-zinc-800 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Permission rank
        </p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {name}
        </h3>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ID
            </dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">{idLabel}</dd>
          </div>
          {usersCount != null ? (
            <div>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Users
              </dt>
              <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {usersCount}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Created
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {formatWhen(rank.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Updated
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {formatWhen(rank.updated_at)}
            </dd>
          </div>
        </dl>
      </div>

      {description ? (
        <section className="rounded-xl border border-zinc-200/60 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Description
          </h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {description}
          </p>
        </section>
      ) : (
        <p className="text-sm text-zinc-400">No description.</p>
      )}

      <section className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-950/40">
        <div className="border-b border-zinc-200/60 px-4 py-3 dark:border-zinc-800">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Permissions
          </h4>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {permissions.length === 0
              ? "No permissions attached."
              : `${permissions.length} permission${permissions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {permissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    ID
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    Action
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    Module
                  </th>
                  <th className="min-w-[12rem] px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p, i) => {
                  const pid = p.id;
                  const key =
                    typeof pid === "number" || typeof pid === "string"
                      ? String(pid)
                      : `p-${i}`;
                  const act = String(p.action ?? "—");
                  return (
                    <tr
                      key={key}
                      className="border-b border-zinc-100 odd:bg-white/50 even:bg-zinc-50/40 dark:border-zinc-800/80 dark:odd:bg-transparent dark:even:bg-zinc-900/25"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                        {String(p.id ?? "—")}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {String(p.name ?? "—")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={actionPillClass(act)}>{act}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                        {String(p.module_id ?? "—")}
                      </td>
                      <td className="max-w-[18rem] px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        <span className="line-clamp-2" title={String(p.description ?? "")}>
                          {typeof p.description === "string" && p.description.trim()
                            ? p.description
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

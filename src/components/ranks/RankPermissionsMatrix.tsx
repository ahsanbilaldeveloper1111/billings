"use client";

import type { ReactNode } from "react";
import type { Module } from "@/models/Module";
import type { Permission } from "@/models/Permission";
import { PermissionAction } from "@/models/Permission";
import type { Rank } from "@/models/Rank";

const ACTION_ORDER: readonly PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.CREATE,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
  PermissionAction.ADMIN,
] as const;

function humanizeModuleName(name: string) {
  return name.replace(/_/g, " ");
}

function actionsAvailableForModule(module: Module): PermissionAction[] {
  const perms = module.permissions ?? [];
  const set = new Set(perms.map((p) => String(p.action).toLowerCase()));
  return ACTION_ORDER.filter((a) => set.has(String(a).toLowerCase()));
}

function selectedActionsForCell(rank: Rank, moduleId: number): string[] {
  const list = (rank.permissions ?? []) as Permission[];
  return list
    .filter((p) => Number(p.module_id) === moduleId)
    .map((p) => String(p.action).toLowerCase());
}

type RankPermissionsMatrixProps = {
  modules: Module[];
  ranks: Rank[];
  canEditCells: boolean;
  /** When true, permission checkboxes are disabled (e.g. while a save is in flight). */
  cellsBusy?: boolean;
  renderRankActions?: (rank: Rank & { id: number }) => ReactNode;
  onCommitModuleActions: (
    rankId: number,
    moduleId: number,
    actions: string[],
  ) => void;
};

export function RankPermissionsMatrix({
  modules,
  ranks,
  canEditCells,
  cellsBusy = false,
  renderRankActions,
  onCommitModuleActions,
}: RankPermissionsMatrixProps) {
  const cellsEnabled = canEditCells && !cellsBusy;
  const ranksWithId = ranks.filter(
    (r): r is Rank & { id: number } =>
      typeof r.id === "number" && Number.isFinite(r.id),
  );

  if (modules.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        No modules returned from GET /ranks/module-list. Cannot build the
        permission matrix.
      </p>
    );
  }

  if (ranksWithId.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        No ranks returned. Create a rank above, or adjust filters on the API.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-zinc-300 bg-zinc-50/90 dark:border-zinc-600 dark:bg-zinc-900/50">
              <th className="sticky left-0 z-20 min-w-[10rem] border-r border-zinc-200/80 bg-zinc-50/95 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300">
                Rank
              </th>
              {modules.map((mod) => (
                <th
                  key={mod.id ?? mod.name}
                  className="min-w-[9.5rem] px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                >
                  <span className="line-clamp-2" title={mod.name}>
                    {humanizeModuleName(mod.name)}
                  </span>
                </th>
              ))}
              {renderRankActions ? (
                <th className="sticky right-0 z-20 min-w-[8.5rem] border-l border-zinc-200/80 bg-zinc-50/95 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {ranksWithId.map((rank) => (
              <tr
                key={rank.id}
                className="border-b border-zinc-200 odd:bg-white/60 even:bg-zinc-50/40 dark:border-zinc-800 dark:odd:bg-transparent dark:even:bg-zinc-900/20"
              >
                <td className="sticky left-0 z-10 border-r border-zinc-200/80 bg-white/95 px-3 py-2 align-top dark:border-zinc-800 dark:bg-zinc-950/95">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {rank.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                    ID {rank.id}
                    {typeof rank.users_count === "number"
                      ? ` · ${rank.users_count} user${rank.users_count === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </td>
                {modules.map((mod) => {
                  const mid = mod.id;
                  if (mid == null || !Number.isFinite(mid)) {
                    return (
                      <td key={`${rank.id}-${mod.name}`} className="px-2 py-2">
                        —
                      </td>
                    );
                  }
                  const options = actionsAvailableForModule(mod);
                  const selected = selectedActionsForCell(rank, mid);
                  return (
                    <td
                      key={`${rank.id}-${mid}`}
                      className="align-top px-2 py-2 text-center"
                    >
                      <div className="flex flex-col items-stretch gap-1.5">
                        {options.map((act) => {
                          const actKey = String(act).toLowerCase();
                          const on = selected.includes(actKey);
                          return (
                            <label
                              key={act}
                              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-1.5 py-1 text-[10px] font-medium ${
                                on
                                  ? "border-emerald-500/60 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                                  : "border-zinc-200/80 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              } ${!cellsEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                checked={on}
                                disabled={!cellsEnabled}
                                onChange={(ev) => {
                                  if (!cellsEnabled) return;
                                  const next = new Set(selected);
                                  if (ev.target.checked) next.add(actKey);
                                  else next.delete(actKey);
                                  onCommitModuleActions(rank.id, mid, [...next]);
                                }}
                              />
                              <span className="uppercase">{act}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
                {renderRankActions ? (
                  <td className="sticky right-0 z-10 border-l border-zinc-200/80 bg-white/95 px-2 py-2 align-middle dark:border-zinc-800 dark:bg-zinc-950/95">
                    <div className="flex flex-col items-stretch gap-1">
                      {renderRankActions(rank)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

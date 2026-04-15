"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { FormField, FormModal } from "@/components/crud/FormModal";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import { RankDetailContent } from "@/components/ranks/RankDetailContent";
import { RankPermissionsMatrix } from "@/components/ranks/RankPermissionsMatrix";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useRank } from "@/hooks/ranks/useRank";
import { useRankModuleList } from "@/hooks/ranks/useRankModuleList";
import { useRankMutations } from "@/hooks/ranks/useRankMutations";
import { useRanks } from "@/hooks/ranks/useRanks";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import type { ApiSuccessResponse } from "@/lib/api/types";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Module } from "@/models/Module";
import { ModuleName } from "@/models/Module";
import type { Permission } from "@/models/Permission";
import type { Rank } from "@/models/Rank";

const RANK_LIST_CAP = 500;

export function RankCrudView() {
  const mod = ModuleName.RANK;
  const {
    isSuperAdmin,
    isUserLoading,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  } = usePermissions();

  const allowView = isSuperAdmin || canView(mod);

  const listQuery = useRanks({ limit: RANK_LIST_CAP });
  const moduleQuery = useRankModuleList();
  const mutations = useRankMutations();

  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [newRank, setNewRank] = useState({ name: "", description: "" });
  const [createBusy, setCreateBusy] = useState(false);
  const [blockDeleteInfoOpen, setBlockDeleteInfoOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const detailQuery = useRank(detailId);
  const editQuery = useRank(editId);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["name", "title"],
      }),
    [listQuery.data, deleteId],
  );

  const modules = useMemo(() => {
    const { rows } = extractListRows(
      moduleQuery.data === undefined
        ? null
        : (moduleQuery.data as ApiSuccessResponse<unknown>),
    );
    return rows as unknown as Module[];
  }, [moduleQuery.data]);

  const ranks = useMemo(() => {
    const { rows } = extractListRows(
      listQuery.data === undefined
        ? null
        : (listQuery.data as ApiSuccessResponse<unknown>),
    );
    return rows as unknown as Rank[];
  }, [listQuery.data]);

  const modulePermissionRows = useMemo(
    () => modules.flatMap((m) => (m.permissions ?? []) as Permission[]),
    [modules],
  );

  const rankPermissionMap = useMemo(() => {
    const acc: Record<number, Permission[]> = {};
    for (const r of ranks) {
      if (typeof r.id === "number")
        acc[r.id] = (r.permissions ?? []) as Permission[];
    }
    return acc;
  }, [ranks]);

  useEffect(() => {
    if (!formOpen) return;
    if (editId == null) {
      setName("");
      setDescription("");
      return;
    }
    const raw = unwrapApiSuccessData<Rank>(editQuery.data);
    if (!raw) return;
    setName(raw.name ?? "");
    setDescription(raw.description ?? "");
  }, [formOpen, editId, editQuery.data]);

  async function handleCreateRank() {
    if (!canCreate(mod)) {
      showAppToast("You do not have permission to create ranks.", "error");
      return;
    }
    if (!newRank.name.trim()) {
      showAppToast("Enter a rank name.", "error");
      return;
    }
    setCreateBusy(true);
    try {
      await mutations.create.mutateAsync({
        name: newRank.name.trim(),
        description: newRank.description.trim(),
      });
      showAppToast("Rank created.", "success");
      setNewRank({ name: "", description: "" });
    } catch (err) {
      showBillingBackendErrorToast(err);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handlePermissionChange(
    rankId: number,
    moduleId: number,
    actions: string[],
  ) {
    if (!canUpdate(mod)) {
      showAppToast(
        "You do not have permission to update rank permissions.",
        "error",
      );
      return;
    }
    const selectedLower = actions.map((a) => a.toLowerCase());
    const permissionsIds = modulePermissionRows
      .map((p) =>
        selectedLower.includes(String(p.action).toLowerCase()) &&
        Number(p.module_id) === moduleId
          ? p.id
          : null,
      )
      .filter((id): id is number => typeof id === "number");
    const rankPermissionsIds = (rankPermissionMap[rankId] ?? [])
      .filter((p) => Number(p.module_id) !== moduleId)
      .map((p) => p.id)
      .filter((id): id is number => typeof id === "number");

    try {
      await mutations.assignPermissions.mutateAsync({
        rankId,
        permissionIds: [...permissionsIds, ...rankPermissionsIds],
      });
      showAppToast("Permissions updated.", "success");
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  function handleDeleteClick(rank: Rank) {
    if (!canDelete(mod)) {
      showAppToast("You do not have permission to delete ranks.", "error");
      return;
    }
    const uid = rank.id;
    if (uid == null) return;
    const uc = rank.users_count;
    if (typeof uc === "number" && uc > 0) {
      setBlockDeleteInfoOpen(true);
      return;
    }
    setDeleteId(uid);
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Rank deleted.", "success");
      setDeleteId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId == null) return;
    try {
      await mutations.update.mutateAsync({
        id: editId,
        body: {
          name: name.trim(),
          description: description.trim(),
        },
      });
      showAppToast("Rank updated.", "success");
      setFormOpen(false);
      setEditId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  if (isUserLoading) {
    return (
      <div className="space-y-3 rounded-2xl border border-zinc-200/60 bg-white/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-md bg-gradient-to-r from-zinc-100 via-zinc-200/80 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700/50 dark:to-zinc-800"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </div>
    );
  }

  if (!allowView) {
    return (
      <p className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        You do not have permission to view rank permissions.
      </p>
    );
  }

  const loading = listQuery.isPending || moduleQuery.isPending;
  const loadError =
    listQuery.isError || moduleQuery.isError
      ? [listQuery.error, moduleQuery.error].filter(Boolean).join(" · ")
      : null;

  return (
    <div className="space-y-8">
      {canCreate(mod) ? (
        <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Create new rank
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Adds a row via POST /ranks. Assign module access in the matrix
            below.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-5">
              <label className={formLabelClass}>
                Rank name
              </label>
              <input
                type="text"
                value={newRank.name}
                onChange={(ev) =>
                  setNewRank((s) => ({ ...s, name: ev.target.value }))
                }
                placeholder="Enter rank name"
                className={formControlClass}
              />
            </div>
            <div className="lg:col-span-5">
              <label className={formLabelClass}>
                Description
              </label>
              <input
                type="text"
                value={newRank.description}
                onChange={(ev) =>
                  setNewRank((s) => ({ ...s, description: ev.target.value }))
                }
                placeholder="Optional"
                className={formControlClass}
              />
            </div>
            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={() => void handleCreateRank()}
                disabled={createBusy}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 dark:hover:bg-emerald-500"
              >
                {createBusy ? "Creating…" : "Create rank"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Rank permissions
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One column per module (GET /ranks/module-list). Changes POST to
            /ranks/{"{id}"}/permissions.
          </p>
        </div>

        {loadError ? (
          <div
            className="rounded-2xl border border-rose-200/90 bg-rose-50/80 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"
            role="alert"
          >
            {loadError}
          </div>
        ) : loading ? (
          <div className="space-y-3 rounded-2xl border border-zinc-200/60 bg-white/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded-md bg-gradient-to-r from-zinc-100 via-zinc-200/80 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700/50 dark:to-zinc-800"
                style={{ width: `${100 - i * 10}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <RankPermissionsMatrix
              modules={modules}
              ranks={ranks}
              canEditCells={isSuperAdmin || canUpdate(mod)}
              cellsBusy={mutations.assignPermissions.isPending}
              onCommitModuleActions={handlePermissionChange}
              renderRankActions={(rank) => (
                <>
                  {canUpdate(mod) ? (
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600/10 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-600/20 dark:text-emerald-200"
                      onClick={() => {
                        setEditId(rank.id);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                  {canDelete(mod) ? (
                    <button
                      type="button"
                      className="rounded-lg bg-rose-600/10 px-2 py-1 text-[10px] font-semibold text-rose-800 hover:bg-rose-600/20 dark:text-rose-200"
                      onClick={() => handleDeleteClick(rank)}
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg bg-zinc-200/80 px-2 py-1 text-[10px] font-semibold text-zinc-800 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    onClick={() => setDetailId(rank.id)}
                  >
                    View
                  </button>
                </>
              )}
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Showing up to {RANK_LIST_CAP} ranks from GET /ranks. Use Edit to
              change name and description.
            </p>
          </div>
        )}
      </section>

      <RecordDetailModal
        open={detailId != null}
        title="Rank"
        subtitle="Name, description, users, and permission matrix."
        data={detailQuery.data ?? null}
        loading={detailQuery.isPending && detailId != null}
        error={detailQuery.isError ? String(detailQuery.error) : null}
        onClose={() => setDetailId(null)}
        renderData={(inner) =>
          inner != null && typeof inner === "object" && !Array.isArray(inner) ? (
            <RankDetailContent rank={inner as Record<string, unknown>} />
          ) : (
            <p className="text-sm text-zinc-500">Nothing to display.</p>
          )
        }
      />

      <FormModal
        open={formOpen}
        title="Edit rank"
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        onSubmit={handleSubmit}
        loading={mutations.create.isPending || mutations.update.isPending}
      >
        <FormField label="Name">
          <input
            required
            className={formControlClass}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            required
            className={`${formControlClass} min-h-[100px]`}
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
        </FormField>
      </FormModal>

      <DeleteConfirmationDialog
        show={deleteId != null}
        title="Delete rank?"
        message="Deletes via DELETE /ranks/{id}. This may fail if users are still assigned to this rank."
        itemName={deleteItemLabel}
        onConfirm={() => void confirmDelete()}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />

      {blockDeleteInfoOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rank-delete-blocked-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/45 backdrop-blur-sm dark:bg-black/55"
            aria-label="Dismiss"
            onClick={() => setBlockDeleteInfoOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3
              id="rank-delete-blocked-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Cannot delete rank
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This rank has users assigned to it. Remove all users from this
              rank before deleting.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setBlockDeleteInfoOpen(false)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

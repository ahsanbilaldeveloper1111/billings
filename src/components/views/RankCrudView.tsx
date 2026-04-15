"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CrudEntityTable } from "@/components/crud/CrudEntityTable";
import { FormField, FormModal } from "@/components/crud/FormModal";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import { RankDetailContent } from "@/components/ranks/RankDetailContent";
import { useRank } from "@/hooks/ranks/useRank";
import { useRankMutations } from "@/hooks/ranks/useRankMutations";
import { useRanks } from "@/hooks/ranks/useRanks";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Rank } from "@/models/Rank";

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

export function RankCrudView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const listParams = useMemo(
    () => ({ page, limit }),
    [page, limit],
  );
  const listQuery = useRanks(listParams);
  const mutations = useRankMutations();
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["name", "title"],
      }),
    [listQuery.data, deleteId],
  );

  const detailQuery = useRank(detailId);
  const editQuery = useRank(editId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate create/edit rank form when modal opens or GET /ranks/:id resolves */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId == null) {
        await mutations.create.mutateAsync({
          name: name.trim(),
          description: description.trim(),
        });
        showAppToast("Rank created.", "success");
      } else {
        await mutations.update.mutateAsync({
          id: editId,
          body: {
            name: name.trim(),
            description: description.trim(),
          },
        });
        showAppToast("Rank updated.", "success");
      }
      setFormOpen(false);
      setEditId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
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

  return (
    <>
      <CrudEntityTable
        query={listQuery}
        title="Ranks"
        onCreate={openCreate}
        onView={(id) => setDetailId(id)}
        onEdit={(id) => {
          setEditId(id);
          setFormOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
        onPageChange={(next) => setPage(next)}
        limit={limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

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
        title={editId == null ? "New rank" : "Edit rank"}
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            required
            className="min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CreateUpdateProductCategoryModal } from "@/components/product-categories/CreateUpdateProductCategoryModal";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { useProductCategories } from "@/hooks/product-categories/useProductCategories";
import { useProductCategoryMutations } from "@/hooks/product-categories/useProductCategoryMutations";
import { extractListRows } from "@/lib/api/extractApiData";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { showAppToast, showBillingBackendErrorToast } from "@/lib/toast/appToast";
import type { IndexProductCategoryParams, ProductCategory } from "@/models/ProductCategory";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

type Row = ProductCategory & Record<string, unknown>;

const SORTABLE = ["name", "created_at"] as const;

function SortChevron({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  if (!active) {
    return (
      <span className="ml-1 text-zinc-400 opacity-60" aria-hidden>
        {"\u2195"}
      </span>
    );
  }
  return (
    <span className="ml-1 text-zinc-700 dark:text-zinc-200" aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function formatCreated(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parentLabel(c: Row): string {
  const p = c.parent;
  if (
    p &&
    typeof p === "object" &&
    typeof p.name === "string" &&
    p.name.trim()
  ) {
    return p.name;
  }
  return "Root category";
}

type ProductCategoryManagementModalProps = {
  open: boolean;
  onClose: () => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function ProductCategoryManagementModal({
  open,
  onClose,
}: ProductCategoryManagementModalProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const listParams = useMemo((): IndexProductCategoryParams => {
    return {
      page,
      limit,
      "order[column]": sortField,
      "order[dir]": sortDir,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    };
  }, [page, limit, sortField, sortDir, debouncedSearch]);

  const listQ = useProductCategories(listParams, { enabled: open });
  const mutations = useProductCategoryMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formModalKey, setFormModalKey] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { rows, pagination } = useMemo(() => {
    return extractListRows<Row>(listQ.data);
  }, [listQ.data]);

  function handleSort(column: string) {
    setPage(1);
    if (sortField === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(column);
      setSortDir("asc");
    }
  }

  const bumpFormModalKey = () => setFormModalKey((k) => k + 1);

  function openCreate() {
    setEditId(null);
    bumpFormModalKey();
    setFormOpen(true);
  }

  function openEdit(id: number) {
    setEditId(id);
    bumpFormModalKey();
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Category deleted.", "success");
      setDeleteId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  async function toggleActive(row: Row) {
    const nextActive = row.is_active === false;
    try {
      await mutations.update.mutateAsync({
        id: row.id,
        body: {
          name: row.name ?? "",
          is_active: nextActive,
          ...(row.description != null ? { description: row.description } : {}),
        },
      });
      showAppToast(
        nextActive ? "Category activated." : "Category deactivated.",
        "success",
      );
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
          aria-label="Close"
          onClick={onClose}
        />
        <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Product categories
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={formLabelClass}>
                  Search
                </label>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or description…"
                  className={formControlClass}
                />
              </div>
              <div className="w-full sm:w-36">
                <label className={formLabelClass}>
                  Page size
                </label>
                <select
                  className={formControlClass}
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {listQ.isLoading || listQ.isPaused ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
                    style={{ width: `${100 - i * 10}%` }}
                  />
                ))}
              </div>
            ) : listQ.isError ? (
              <p className="text-sm text-rose-600">{String(listQ.error)}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/40">
                        {(SORTABLE as readonly string[]).map((col) => (
                          <th key={col} className="whitespace-nowrap px-3 py-2.5">
                            <button
                              type="button"
                              className="inline-flex items-center font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
                              onClick={() => handleSort(col)}
                            >
                              {col === "created_at" ? "Created" : col}
                              <SortChevron
                                active={sortField === col}
                                dir={sortDir}
                              />
                            </button>
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                          Description
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                          Parent
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                          Status
                        </th>
                        <th className="min-w-[12rem] whitespace-nowrap px-3 py-2.5 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-10 text-center text-sm text-zinc-500"
                          >
                            {debouncedSearch.trim()
                              ? "No categories match your search."
                              : "No categories yet."}
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/40 dark:border-zinc-800 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/25"
                          >
                            <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                              {row.name?.trim()
                                ? row.name
                                : `— (${row.id})`}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                              {formatCreated(row.created_at)}
                            </td>
                            <td className="max-w-[12rem] truncate px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                              {row.description?.trim() ? (
                                row.description
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="max-w-[8rem] truncate px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                              {parentLabel(row)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                  row.is_active === false
                                    ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                                }`}
                              >
                                {row.is_active === false
                                  ? "Inactive"
                                  : "Active"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => void toggleActive(row)}
                                  disabled={mutations.update.isPending}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                                    row.is_active === false
                                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                                      : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                                  } disabled:opacity-50`}
                                >
                                  {row.is_active === false
                                    ? "Activate"
                                    : "Deactivate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEdit(row.id)}
                                  className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium dark:bg-zinc-800"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteId(row.id)}
                                  className="rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {pagination ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <span>
                      Page {pagination.page} of {pagination.last_page} ·{" "}
                      {pagination.total} total
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={pagination.page >= pagination.last_page}
                        onClick={() =>
                          setPage((p) =>
                            pagination ? Math.min(pagination.last_page, p + 1) : p,
                          )
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        show={deleteId != null}
        title="Delete category?"
        message="This cannot be undone. The API may reject the delete if categories are in use."
        itemName={
          deleteId != null
            ? rows.find((r) => r.id === deleteId)?.name ?? undefined
            : undefined
        }
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />

      <CreateUpdateProductCategoryModal
        key={formModalKey}
        open={formOpen}
        categoryId={editId}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setEditId(null);
        }}
      />
    </>
  );
}

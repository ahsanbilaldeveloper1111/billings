"use client";

import { useCallback, useMemo, useState } from "react";
import {
  extractListRows,
  formatCellValue,
} from "@/lib/api/extractApiData";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import {
  createExpenseFormDefaults,
  omitUndefined,
} from "@/lib/forms";
import type { CreateExpenseData, Expense, UpdateExpenseData } from "@/models/Expense";
import { useExpenseCategories } from "@/hooks/expense-categories/useExpenseCategories";
import {
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "@/hooks/expenses/useExpenseMutations";
import { useExpenses } from "@/hooks/expenses/useExpenses";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import {
  stripLeadingZerosDigitOnly,
  stripNumericLeadingZerosForControlledInput,
} from "@/lib/forms/stripNumericLeadingZeros";

type ExpenseFormFields = {
  expense_date: string;
  description: string;
  amount: string;
  company_id: string;
  category_id: string;
  currency: string;
  tax_type: "" | "percentage" | "amount";
  tax_amount: string;
  exchange_rate: string;
  notes: string;
  crm_company_id: string;
  tenant_id: string;
};

function emptyForm(): ExpenseFormFields {
  const d = createExpenseFormDefaults();
  return {
    expense_date: d.expense_date,
    description: d.description ?? "",
    amount: String(d.amount ?? 0),
    company_id: "",
    category_id: "",
    currency: "",
    tax_type: "",
    tax_amount: "",
    exchange_rate: "",
    notes: "",
    crm_company_id: "",
    tenant_id: "",
  };
}

function expenseToForm(e: Expense): ExpenseFormFields {
  return {
    expense_date: e.expense_date?.slice(0, 10) ?? "",
    description: e.description ?? "",
    amount: String(e.amount ?? 0),
    company_id: e.company_id != null ? String(e.company_id) : "",
    category_id: e.category_id != null ? String(e.category_id) : "",
    currency: e.currency ?? "",
    tax_type: e.tax_type ?? "",
    tax_amount:
      e.tax_amount != null && !Number.isNaN(Number(e.tax_amount))
        ? String(e.tax_amount)
        : "",
    exchange_rate:
      e.exchange_rate != null && !Number.isNaN(Number(e.exchange_rate))
        ? String(e.exchange_rate)
        : "",
    notes: e.notes ?? "",
    crm_company_id: e.crm_company_id != null ? String(e.crm_company_id) : "",
    tenant_id: e.tenant_id != null ? String(e.tenant_id) : "",
  };
}

/** Populate form from a list row (API may omit optional fields). */
function listRowToForm(row: Record<string, unknown>): ExpenseFormFields {
  return expenseToForm(row as unknown as Expense);
}

function formToCreatePayload(fields: ExpenseFormFields): CreateExpenseData {
  const base: Record<string, unknown> = {
    expense_date: fields.expense_date,
    description: fields.description.trim(),
    amount: Number(fields.amount),
    company_id: fields.company_id ? Number(fields.company_id) : undefined,
    category_id: fields.category_id ? Number(fields.category_id) : undefined,
    currency: fields.currency.trim() || undefined,
    tax_type: fields.tax_type || undefined,
    tax_amount: fields.tax_amount ? Number(fields.tax_amount) : undefined,
    exchange_rate: fields.exchange_rate
      ? Number(fields.exchange_rate)
      : undefined,
    notes: fields.notes.trim() || undefined,
    crm_company_id: fields.crm_company_id.trim() || null,
    tenant_id: fields.tenant_id.trim() || null,
  };
  return omitUndefined(base) as unknown as CreateExpenseData;
}

function formToUpdatePayload(fields: ExpenseFormFields): UpdateExpenseData {
  const base: Record<string, unknown> = {
    expense_date: fields.expense_date,
    description: fields.description.trim(),
    amount: Number(fields.amount),
    company_id: fields.company_id ? Number(fields.company_id) : undefined,
    category_id: fields.category_id ? Number(fields.category_id) : undefined,
    currency: fields.currency.trim() || undefined,
    tax_type: fields.tax_type || undefined,
    tax_amount: fields.tax_amount ? Number(fields.tax_amount) : undefined,
    exchange_rate: fields.exchange_rate
      ? Number(fields.exchange_rate)
      : undefined,
    notes: fields.notes.trim() || undefined,
    crm_company_id: fields.crm_company_id.trim() || null,
    tenant_id: fields.tenant_id.trim() || null,
  };
  return omitUndefined(base) as unknown as UpdateExpenseData;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400/30 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500";

const labelClass = "block text-xs font-medium text-zinc-600 dark:text-zinc-400";

export function ExpensesModuleView() {
  const listQuery = useExpenses();
  const categoriesQuery = useExpenseCategories();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseFormFields>(() => emptyForm());

  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  const { rows } = useMemo(
    () => extractListRows(listQuery.data ?? null),
    [listQuery.data],
  );

  const deleteExpenseLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteExpenseId, {
        labelKeys: ["description"],
      }),
    [listQuery.data, deleteExpenseId],
  );

  const categoryOptions = useMemo(() => {
    const { rows: cats } = extractListRows(categoriesQuery.data ?? null);
    return cats as { id: number; name: string }[];
  }, [categoriesQuery.data]);

  const resetToCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    if (editingId != null) {
      updateMut.mutate(
        { id: editingId, body: formToUpdatePayload(form) },
        { onSuccess: resetToCreate },
      );
    } else {
      createMut.mutate(formToCreatePayload(form), {
        onSuccess: resetToCreate,
      });
    }
  };

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const mutError =
    createMut.error ?? updateMut.error ?? deleteMut.error ?? null;

  function confirmDeleteExpense() {
    if (deleteExpenseId == null) return;
    const id = deleteExpenseId;
    deleteMut.mutate(id, {
      onSuccess: () => {
        setDeleteExpenseId(null);
        if (editingId === id) resetToCreate();
      },
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {editingId != null ? `Edit expense #${editingId}` : "Create expense"}
          </h2>
          {editingId != null ? (
            <button
              type="button"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
              onClick={resetToCreate}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="expense_date">
                Expense date
              </label>
              <input
                id="expense_date"
                type="date"
                required
                className={inputClass}
                value={form.expense_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expense_date: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="amount">
                Amount
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                required
                className={inputClass}
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    amount: stripNumericLeadingZerosForControlledInput(
                      e.target.value,
                    ),
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={2}
              className={inputClass}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="company_id">
                Company ID
              </label>
              <input
                id="company_id"
                type="number"
                className={inputClass}
                value={form.company_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    company_id: stripLeadingZerosDigitOnly(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="category_id">
                Category
              </label>
              <select
                id="category_id"
                className={inputClass}
                value={form.category_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category_id: e.target.value }))
                }
              >
                <option value="">—</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="currency">
                Currency
              </label>
              <input
                id="currency"
                type="text"
                placeholder="e.g. USD"
                className={inputClass}
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tax_type">
                Tax type
              </label>
              <select
                id="tax_type"
                className={inputClass}
                value={form.tax_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tax_type: e.target.value as ExpenseFormFields["tax_type"],
                  }))
                }
              >
                <option value="">—</option>
                <option value="percentage">Percentage</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="tax_amount">
                Tax amount
              </label>
              <input
                id="tax_amount"
                type="number"
                step="0.01"
                className={inputClass}
                value={form.tax_amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tax_amount: stripNumericLeadingZerosForControlledInput(
                      e.target.value,
                    ),
                  }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="exchange_rate">
                Exchange rate
              </label>
              <input
                id="exchange_rate"
                type="number"
                step="0.000001"
                className={inputClass}
                value={form.exchange_rate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    exchange_rate: stripNumericLeadingZerosForControlledInput(
                      e.target.value,
                    ),
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="crm_company_id">
                CRM company ID
              </label>
              <input
                id="crm_company_id"
                type="text"
                className={inputClass}
                value={form.crm_company_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, crm_company_id: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="tenant_id">
                Tenant ID
              </label>
              <input
                id="tenant_id"
                type="text"
                className={inputClass}
                value={form.tenant_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tenant_id: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              className={inputClass}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          {mutError ? (
            <p
              className="text-sm text-rose-600 dark:text-rose-400"
              role="alert"
            >
              {String(mutError)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {editingId != null ? "Save changes" : "Create expense"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          All expenses
        </h2>
        {listQuery.isPending ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : listQuery.isError ? (
          <p className="text-sm text-rose-600">{String(listQuery.error)}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No expenses yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200/60 bg-zinc-50/80 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const id = row.id as number | string | undefined;
                  const idNum =
                    typeof id === "number"
                      ? id
                      : id != null
                        ? Number(id)
                        : NaN;
                  return (
                    <tr
                      key={String(id ?? `row-${index}`)}
                      className="border-b border-zinc-100/80 last:border-0 dark:border-zinc-800/60"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {formatCellValue(row.id)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCellValue(row.expense_date)}
                      </td>
                      <td className="max-w-xs truncate px-3 py-2">
                        {formatCellValue(row.description)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCellValue(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-2 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                          onClick={() => {
                            if (!Number.isFinite(idNum)) return;
                            setEditingId(idNum);
                            setForm(listRowToForm(row));
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
                          disabled={busy}
                          onClick={() => {
                            if (!Number.isFinite(idNum)) return;
                            setDeleteExpenseId(idNum);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DeleteConfirmationDialog
        show={deleteExpenseId != null}
        title="Delete expense?"
        message="This removes the expense via DELETE /expenses/{id}. This cannot be undone."
        itemName={deleteExpenseLabel}
        onHide={() => setDeleteExpenseId(null)}
        onConfirm={confirmDeleteExpense}
        isDeleting={deleteMut.isPending}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { FormField, FormModal } from "@/components/crud/FormModal";
import { CurrencyIsoCombobox } from "@/components/currencies/CurrencyIsoCombobox";
import { useCurrencyMutations } from "@/hooks/currencies/useCurrencyMutations";
import { parseBillingBackendApiError } from "@/lib/api/parseBillingBackendApiError";
import {
  buildWorldCurrencyMap,
  worldCurrencyDropdownRows,
} from "@/lib/currencies/worldCurrencyMap";
import type { Currency } from "@/models/Currency";
import { formControlClass } from "@/lib/uiFormClasses";

function isBaseRow(c: Currency): boolean {
  return !!(c.is_base_currency ?? c.is_base);
}

type FormState = {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_active: boolean;
  is_base_currency: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  symbol: "",
  exchange_rate: 1,
  is_active: true,
  is_base_currency: false,
});

type CreateUpdateCurrencyModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: Currency | null;
};

export function CreateUpdateCurrencyModal({
  open,
  onClose,
  onSuccess,
  currency,
}: CreateUpdateCurrencyModalProps) {
  const isEdit = currency != null;
  const mutations = useCurrencyMutations();

  const worldCurrencyMap = useMemo(() => buildWorldCurrencyMap(), []);
  const dropdownOptions = useMemo(
    () => worldCurrencyDropdownRows(worldCurrencyMap),
    [worldCurrencyMap],
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (isEdit && currency) {
      setForm({
        code: currency.code || "",
        name: currency.name || "",
        symbol: currency.symbol || "",
        exchange_rate: Number(currency.exchange_rate ?? 1),
        is_active: currency.is_active ?? true,
        is_base_currency: isBaseRow(currency),
      });
    } else {
      setForm(emptyForm());
    }
    setError(null);
  }, [open, isEdit, currency]);

  useEffect(() => {
    if (form.is_base_currency) {
      setForm((prev) => ({ ...prev, exchange_rate: 1 }));
    }
  }, [form.is_base_currency]);

  const loading =
    mutations.create.isPending || mutations.update.isPending;
  const isBaseCurrency = !!form.is_base_currency;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEdit && !form.code.trim()) {
      setError("Select or enter a currency code.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      exchange_rate: isBaseCurrency ? 1 : Number(form.exchange_rate),
      is_active: !!form.is_active,
      is_base_currency: !!form.is_base_currency,
      is_base: !!form.is_base_currency,
    };

    if (!isBaseCurrency) {
      const r = Number(form.exchange_rate);
      if (!Number.isFinite(r) || r < 0.000001) {
        setError("Enter a valid exchange rate (minimum 0.000001).");
        return;
      }
    }

    try {
      if (isEdit && currency?.id) {
        await mutations.update.mutateAsync({
          id: currency.id,
          body: payload,
        });
      } else {
        await mutations.create.mutateAsync({
          code: form.code.trim().toUpperCase(),
          ...payload,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const { headline, messages } = parseBillingBackendApiError(err);
      setError(messages[0] ?? headline ?? "Failed to save currency");
    }
  }

  return (
    <FormModal
      open={open}
      title={isEdit ? "Update currency" : "Create currency"}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Save" : "Save"}
      loading={loading}
      panelClassName="max-w-2xl"
    >
      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <FormField label="Code (ISO 4217)">
            {isEdit ? (
              <input
                type="text"
                readOnly
                disabled
                value={form.code}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm uppercase opacity-80 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="USD"
              />
            ) : (
              <CurrencyIsoCombobox
                value={form.code}
                metaMap={worldCurrencyMap}
                options={dropdownOptions}
                onSelect={(code) => {
                  const meta = worldCurrencyMap.get(code);
                  setForm((p) => ({
                    ...p,
                    code,
                    name: meta?.name ?? p.name,
                    symbol: meta?.symbol ?? p.symbol,
                  }));
                }}
                onClear={() =>
                  setForm((p) => ({
                    ...p,
                    code: "",
                    name: "",
                    symbol: "",
                  }))
                }
              />
            )}
          </FormField>
        </div>
        <div className="sm:col-span-8">
          <FormField label="Name">
            <input
              required
              className={formControlClass}
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="US Dollar"
            />
          </FormField>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <FormField label="Symbol">
            <input
              required
              className={formControlClass}
              value={form.symbol}
              onChange={(e) =>
                setForm((p) => ({ ...p, symbol: e.target.value }))
              }
              placeholder="$"
            />
          </FormField>
        </div>
        <div className="sm:col-span-8">
          <FormField label="Exchange rate (vs base)">
            <input
              required
              type="number"
              step="0.000001"
              min={0.000001}
              disabled={isBaseCurrency}
              className={`${formControlClass} disabled:cursor-not-allowed disabled:opacity-60`}
              value={isBaseCurrency ? 1 : form.exchange_rate}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  exchange_rate: Number(e.target.value),
                }))
              }
            />
            {isBaseCurrency ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Base currency exchange rate is always 1.0
              </p>
            ) : null}
          </FormField>
        </div>
      </div>

      <div className="flex flex-wrap gap-8">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={!!form.is_active}
            onChange={(e) =>
              setForm((p) => ({ ...p, is_active: e.target.checked }))
            }
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          Active
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={!!form.is_base_currency}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                is_base_currency: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          Base currency
        </label>
      </div>
    </FormModal>
  );
}

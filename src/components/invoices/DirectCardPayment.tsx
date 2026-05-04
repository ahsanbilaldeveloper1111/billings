"use client";

/**
 * Stripe card checkout with **Saved method** vs **One-time card** tabs (legacy DirectCardPayment).
 * Must render inside `<Elements stripe={...}>` (e.g. `InvoicePaymentSection` already wraps children).
 */

import { useStripe } from "@stripe/react-stripe-js";
import { useEffect, useMemo, useState } from "react";
import { DirectPayForm } from "@/components/invoices/DirectPayForm";
import { usePaymentMutations } from "@/hooks/payments/usePaymentMutations";
import { useStripeCompletePaymentMutation } from "@/hooks/stripe/useStripeCompletePaymentMutation";
import {
  useStripePaymentMethods,
  useStripePaymentMethodsForCustomer,
} from "@/hooks/stripe/useStripeEndpoints";
import { formatCurrency } from "@/lib/currency";
import { handleStripePaymentCreateResult } from "@/lib/invoices/handleStripePaymentCreateResult";
import { parseStripePaymentMethods } from "@/lib/stripe/parseStripePaymentMethods";
import type { Invoice } from "@/models/Invoice";
import type { CreatePaymentData } from "@/models/Payment";

export type DirectCardPaymentProps = {
  invoice: Invoice;
  /** Amount in major units (e.g. USD dollars). */
  amount: number;
  companyId: number;
  tenantId?: string | null;
  /** When set, loads Stripe PMs for CRM customer; otherwise company profile PMs. */
  crmCompanyId?: string | null;
  onPaymentSuccess: (paymentData?: unknown) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
  /** Default true — charge amount + 3% card fee (invoice-style). */
  includeProcessingFee?: boolean;
  defaultTab?: "saved-method" | "new-card";
};

function SavedMethodPanel({
  invoice,
  amount,
  companyId,
  tenantId,
  crmCompanyId,
  includeProcessingFee,
  disabled,
  onPaymentSuccess,
  onPaymentError,
}: Omit<DirectCardPaymentProps, "defaultTab">) {
  const stripe = useStripe();
  const { create } = usePaymentMutations();
  const completePay = useStripeCompletePaymentMutation();
  const [selectedPm, setSelectedPm] = useState("");
  const [busy, setBusy] = useState(false);

  const crm = crmCompanyId?.trim() || null;
  const companyPm = useStripePaymentMethods(!crm && companyId > 0 ? companyId : null);
  const customerPm = useStripePaymentMethodsForCustomer(crm);
  const pmRes = crm ? customerPm.data : companyPm.data;
  const pmPending = crm ? customerPm.isPending : companyPm.isPending;
  const pmError = crm ? customerPm.isError : companyPm.isError;

  const paymentMethods = useMemo(() => parseStripePaymentMethods(pmRes), [pmRes]);

  useEffect(() => {
    if (paymentMethods.length === 0 || selectedPm) return;
    const def = paymentMethods.find((p) => p.is_default);
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- pick default PM when list loads */
    setSelectedPm(def?.id ?? paymentMethods[0]!.id);
  }, [paymentMethods, selectedPm]);

  const processingFee = includeProcessingFee
    ? Math.round(amount * 0.03 * 100) / 100
    : 0;
  const totalWithFee = includeProcessingFee ? amount + processingFee : amount;

  const pay = async () => {
    if (!selectedPm) {
      onPaymentError("Please select a payment method");
      return;
    }
    setBusy(true);
    try {
      const body: CreatePaymentData = {
        invoice_id: invoice.id,
        payment_method: "stripe",
        payment_mode: "one_time",
        amount: totalWithFee,
        processing_fee: processingFee,
        base_amount: amount,
        payment_method_id: selectedPm,
        currency_code: invoice.currency_code?.toLowerCase(),
        notes: `Payment for invoice ${invoice.invoice_number}`,
        customer_id: companyId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };
      const res = await create.mutateAsync(body);
      await handleStripePaymentCreateResult(res, {
        stripe,
        selectedPaymentMethodId: selectedPm,
        completePayment: (args) => completePay.mutateAsync(args),
        onSuccess: () => onPaymentSuccess(res),
        setProcessing: setBusy,
      });
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Payment processing failed";
      onPaymentError(msg);
      setBusy(false);
    }
  };

  if (pmPending) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Loading saved payment methods…
      </p>
    );
  }

  if (pmError) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load saved payment methods.
      </p>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          No saved payment methods
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Use the <strong>One-time payment</strong> tab or add a card from the
          company/customer profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Select card
        </p>
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/30">
          {paymentMethods.map((pm) => (
            <label
              key={pm.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                selectedPm === pm.id
                  ? "border-emerald-500 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-950/30"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="saved-pm"
                className="text-emerald-600"
                checked={selectedPm === pm.id}
                onChange={() => setSelectedPm(pm.id)}
              />
              <span>
                {(pm.card?.brand ?? "Card").toString()} •••• {pm.card?.last4}
                {pm.is_default ? (
                  <span className="ml-2 text-xs text-sky-600 dark:text-sky-400">
                    Default
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <span className="text-xs text-zinc-500">🔒 Secure payment</span>
        <div className="text-right">
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(
              includeProcessingFee ? totalWithFee : amount,
              invoice.currency_code,
            )}
          </p>
          <p className="text-[11px] text-zinc-500">
            {includeProcessingFee ? "Total incl. fee" : "Payment amount"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!selectedPm || busy || create.isPending || disabled}
        onClick={() => void pay()}
        className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy || create.isPending ? "Processing…" : "Pay with saved method"}
      </button>
    </div>
  );
}

export function DirectCardPayment({
  invoice,
  amount,
  companyId,
  tenantId = null,
  crmCompanyId = null,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  includeProcessingFee = true,
  defaultTab = "new-card",
}: DirectCardPaymentProps) {
  const [tab, setTab] = useState<"saved-method" | "new-card">(defaultTab);

  const tenant = tenantId ?? invoice.tenant_id ?? invoice.company?.tenant_id ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setTab("saved-method")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            tab === "saved-method"
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
        >
          Saved method
        </button>
        <button
          type="button"
          onClick={() => setTab("new-card")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            tab === "new-card"
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
        >
          One-time payment
        </button>
      </div>

      {tab === "saved-method" ? (
        <SavedMethodPanel
          invoice={invoice}
          amount={amount}
          companyId={companyId}
          tenantId={tenant}
          crmCompanyId={crmCompanyId}
          includeProcessingFee={includeProcessingFee}
          disabled={disabled}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      ) : (
        <DirectPayForm
          invoice={invoice}
          amount={amount}
          companyId={companyId}
          tenantId={tenant}
          includeProcessingFee={includeProcessingFee}
          showFeeDetails={includeProcessingFee}
          onSuccess={() => onPaymentSuccess()}
        />
      )}
    </div>
  );
}

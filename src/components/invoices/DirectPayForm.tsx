"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import { usePaymentMutations } from "@/hooks/payments/usePaymentMutations";
import { useStripeCompletePaymentMutation } from "@/hooks/stripe/useStripeCompletePaymentMutation";
import { formatCurrency } from "@/lib/currency";
import { handleStripePaymentCreateResult } from "@/lib/invoices/handleStripePaymentCreateResult";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Invoice } from "@/models/Invoice";
import type { CreatePaymentData } from "@/models/Payment";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

export type DirectPayFormProps = {
  invoice: Invoice;
  /** Amount to apply to the invoice (major units, before fee when fee is enabled). */
  amount: number;
  companyId: number;
  tenantId: string | null;
  onSuccess: () => void;
  showFeeDetails?: boolean;
  onAddCard?: () => void;
  /**
   * When true (default), charge amount + 3% processing fee like the invoice detail flow.
   * When false, charge `amount` flat (legacy-style one-time / import flows).
   */
  includeProcessingFee?: boolean;
};

export function DirectPayForm({
  invoice,
  amount,
  companyId,
  tenantId,
  onSuccess,
  showFeeDetails = false,
  onAddCard,
  includeProcessingFee = true,
}: DirectPayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { create } = usePaymentMutations();
  const completePay = useStripeCompletePaymentMutation();
  const [cardholderName, setCardholderName] = useState("");
  const [postal, setPostal] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  const processingFee = includeProcessingFee
    ? Math.round(amount * 0.03 * 100) / 100
    : 0;
  const totalWithFee = includeProcessingFee ? amount + processingFee : amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      showAppToast("Stripe has not loaded yet.", "warning");
      return;
    }
    if (!cardholderName.trim()) {
      showAppToast("Enter cardholder name.", "error");
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      showAppToast("Card field not found.", "error");
      return;
    }
    setBusy(true);
    setCardError(null);
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });
      if (error || !paymentMethod) {
        setCardError(error?.message || "Could not read card.");
        setBusy(false);
        return;
      }
      const body: CreatePaymentData = {
        invoice_id: invoice.id,
        amount: totalWithFee,
        base_amount: includeProcessingFee ? amount : amount,
        processing_fee: processingFee,
        currency_code: invoice.currency_code?.toLowerCase() ?? "usd",
        payment_method: "stripe",
        payment_mode: "one_time",
        payment_method_id: paymentMethod.id,
        customer_id: companyId,
        notes: `Card payment for invoice ${invoice.invoice_number}`,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(cardholderName.trim()
          ? { cardholder_name: cardholderName.trim() }
          : {}),
        ...(postal.trim() ? { billing_postal_code: postal.trim() } : {}),
      };
      const res = await create.mutateAsync(body);
      await handleStripePaymentCreateResult(res, {
        stripe,
        selectedPaymentMethodId: paymentMethod.id,
        completePayment: (args) => completePay.mutateAsync(args),
        onSuccess,
        setProcessing: setBusy,
      });
    } catch (err) {
      showBillingBackendErrorToast(err);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div>
        <label className={formLabelClass}>
          Cardholder name *
        </label>
        <input
          className={formControlClass}
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={formLabelClass}>
          Card
        </label>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#18181b",
                  "::placeholder": { color: "#71717a" },
                },
              },
            }}
            onChange={(ev) => {
              setCardError(ev.error?.message ?? null);
              setCardComplete(ev.complete);
            }}
          />
        </div>
        {cardError ? (
          <p className="mt-1 text-xs text-rose-600">{cardError}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-500">
          Card details are processed by Stripe; not stored on this form.
        </p>
      </div>
      <div>
        <label className={formLabelClass}>
          Billing postal code (optional)
        </label>
        <input
          className={formControlClass}
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
        />
      </div>
      {includeProcessingFee ? (
        showFeeDetails ? (
          <div className="space-y-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              Full payment: invoice will be marked paid when this succeeds.
            </p>
            <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>Payment amount</span>
              <span>{formatCurrency(amount, invoice.currency_code)}</span>
            </div>
            <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>Processing fee (3%)</span>
              <span className="text-rose-600">
                + {formatCurrency(processingFee, invoice.currency_code)}
              </span>
            </div>
            <hr className="border-emerald-200/60 dark:border-emerald-900/50" />
            <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-50">
              <span>Total charged</span>
              <span>{formatCurrency(totalWithFee, invoice.currency_code)}</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Estimated fee; actual fee is determined at payment time.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-3 text-sm dark:border-sky-900/40 dark:bg-sky-950/20">
            <p>
              Amount: {formatCurrency(amount, invoice.currency_code)} + fee
              (3%): {formatCurrency(processingFee, invoice.currency_code)} ={" "}
              <strong>
                {formatCurrency(totalWithFee, invoice.currency_code)}
              </strong>
            </p>
          </div>
        )
      ) : (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-3 text-sm dark:border-sky-900/40 dark:bg-sky-950/20">
          <p>
            <span className="text-zinc-600">Payment amount: </span>
            <strong className="text-emerald-700 dark:text-emerald-300">
              {formatCurrency(amount, invoice.currency_code)}
            </strong>
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={
            busy ||
            create.isPending ||
            !cardComplete ||
            !cardholderName.trim()
          }
          className="w-full flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy || create.isPending ? "Processing…" : "Pay with card"}
        </button>
        {onAddCard ? (
          <button
            type="button"
            onClick={onAddCard}
            disabled={busy || create.isPending}
            className="w-full flex-1 rounded-xl border border-sky-300 bg-white py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-800 dark:bg-zinc-900 dark:text-sky-100 dark:hover:bg-sky-950/40"
          >
            Add card
          </button>
        ) : null}
      </div>
    </form>
  );
}

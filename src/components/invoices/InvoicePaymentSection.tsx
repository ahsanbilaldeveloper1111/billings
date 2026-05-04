"use client";

import { Elements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePaymentMutations } from "@/hooks/payments/usePaymentMutations";
import { useStripeCompletePaymentMutation } from "@/hooks/stripe/useStripeCompletePaymentMutation";
import {
  useStripePaymentMethods,
  useStripePaymentMethodsForCustomer,
} from "@/hooks/stripe/useStripeEndpoints";
import { useStripePublishableKey } from "@/hooks/stripe/useStripePublishableKey";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { formatCurrency } from "@/lib/currency";
import { DirectPayForm } from "@/components/invoices/DirectPayForm";
import { InvoiceAddCardForm } from "@/components/invoices/InvoiceAddCardForm";
import { computeInvoiceOutstanding } from "@/lib/invoices/computeInvoiceOutstanding";
import { handleStripePaymentCreateResult } from "@/lib/invoices/handleStripePaymentCreateResult";
import { parseStripePaymentMethods } from "@/lib/stripe/parseStripePaymentMethods";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Invoice } from "@/models/Invoice";
import type { CreatePaymentData } from "@/models/Payment";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

function unwrapPublishableKey(payload: unknown): string | null {
  const d = unwrapApiSuccessData<Record<string, unknown>>(payload);
  if (!d) return null;
  const k = d.publishable_key ?? d.publishableKey;
  if (typeof k === "string" && k.startsWith("pk_")) return k;
  return null;
}

type TabKey = "saved" | "direct" | "manual";

function InvoiceAlreadyPaid({ invoice }: { invoice: Invoice }) {
  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <p className="font-semibold text-emerald-900 dark:text-emerald-100">
        Invoice is fully paid or has no balance due.
      </p>
      {invoice.paid_amount != null ? (
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          Total paid:{" "}
          {formatCurrency(invoice.paid_amount, invoice.currency_code)}
        </p>
      ) : null}
    </div>
  );
}

export type InvoicePaymentSectionProps = {
  invoice: Invoice;
  onPaymentSuccess?: () => void;
  /**
   * When true, shows full processing-fee breakdown (3%) on saved + direct card flows.
   * Omit or false for compact UI (e.g. customer-facing).
   */
  showFeeDetails?: boolean;
};

function InvoicePaymentInner({
  invoice,
  onPaymentSuccess,
  showFeeDetails = false,
}: InvoicePaymentSectionProps) {
  const [tab, setTab] = useState<TabKey>("saved");
  const [directSubView, setDirectSubView] = useState<"pay" | "addCard">("pay");
  const [selectedPm, setSelectedPm] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [manualDate, setManualDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [manualMethod, setManualMethod] = useState("");
  const [refNum, setRefNum] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inFlight = useRef(false);

  const { create } = usePaymentMutations();
  const completePay = useStripeCompletePaymentMutation();
  const stripe = useStripe();

  const crmId =
    invoice.crm_company_id != null && String(invoice.crm_company_id).trim()
      ? String(invoice.crm_company_id).trim()
      : null;
  const companyNumericId =
    invoice.company_id ?? invoice.company?.id ?? null;
  const companyId = companyNumericId ?? 0;

  const companyPmQuery = useStripePaymentMethods(
    !crmId && companyNumericId != null ? companyNumericId : null,
  );
  const customerPmQuery = useStripePaymentMethodsForCustomer(
    crmId ? crmId : null,
  );
  const pmData = crmId ? customerPmQuery.data : companyPmQuery.data;
  const pmLoading = crmId ? customerPmQuery.isPending : companyPmQuery.isPending;

  const paymentMethods = useMemo(
    () => parseStripePaymentMethods(pmData),
    [pmData],
  );

  const outstanding = useMemo(
    () => computeInvoiceOutstanding(invoice),
    [invoice],
  );

  /** Keep amount in sync for card tabs; on Manual, only reset when the invoice changes (partial amounts must persist). */
  const paymentAmountInvoiceId = useRef<number | null>(null);
  useEffect(() => {
    if (paymentAmountInvoiceId.current !== invoice.id) {
      paymentAmountInvoiceId.current = invoice.id;
      setPaymentAmount(outstanding > 0 ? outstanding : 0);
      return;
    }
    if (tab === "manual") return;
    if (outstanding > 0) setPaymentAmount(outstanding);
    else setPaymentAmount(0);
  }, [outstanding, invoice.id, tab]);

  useEffect(() => {
    if (tab !== "saved" || paymentMethods.length === 0) return;
    if (selectedPm) return;
    const def = paymentMethods.find((p) => p.is_default);
    setSelectedPm(def?.id ?? paymentMethods[0]!.id);
  }, [tab, paymentMethods, selectedPm]);

  useEffect(() => {
    if (tab !== "direct") setDirectSubView("pay");
  }, [tab]);

  const processingFee =
    tab === "saved" || tab === "direct"
      ? Math.round(paymentAmount * 0.03 * 100) / 100
      : 0;
  const totalWithFee = paymentAmount + processingFee;

  const handleSavedPay = async () => {
    if (!selectedPm) {
      showAppToast("Select a saved card.", "warning");
      return;
    }
    if (Math.abs(paymentAmount - outstanding) > 0.01) {
      showAppToast("Saved card payments must be for the full outstanding amount.", "error");
      setPaymentAmount(outstanding);
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
        base_amount: paymentAmount,
        payment_method_id: selectedPm,
        currency_code: invoice.currency_code?.toLowerCase(),
        notes: `Payment for invoice ${invoice.invoice_number}`,
        ...(companyId > 0 ? { customer_id: companyId } : {}),
      };
      const res = await create.mutateAsync(body);
      await handleStripePaymentCreateResult(res, {
        stripe,
        selectedPaymentMethodId: selectedPm,
        completePayment: (args) => completePay.mutateAsync(args),
        onSuccess: () => onPaymentSuccess?.(),
        setProcessing: setBusy,
      });
    } catch (e) {
      showBillingBackendErrorToast(e);
      setBusy(false);
    }
  };

  const handleManualPay = async () => {
    if (inFlight.current || busy || create.isPending) return;
    if (!manualMethod) {
      showAppToast("Select a payment method.", "warning");
      return;
    }
    if (paymentAmount <= 0 || paymentAmount > outstanding) {
      showAppToast("Invalid amount.", "error");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    const remainingAfterPayment = Math.max(0, outstanding - paymentAmount);
    const isPartialPayment = remainingAfterPayment > 0.001;
    try {
      if (files.length > 0) {
        const fd = new FormData();
        fd.append("invoice_id", String(invoice.id));
        fd.append("payment_method", manualMethod);
        fd.append("payment_mode", "one_time");
        fd.append("amount", String(paymentAmount));
        fd.append("processing_fee", "0");
        fd.append("payment_date", manualDate);
        if (refNum.trim()) fd.append("reference_number", refNum.trim());
        fd.append(
          "notes",
          notes.trim() || `Manual payment for invoice ${invoice.invoice_number}`,
        );
        files.forEach((f, i) => fd.append(`evidence_files[${i}]`, f));
        await create.mutateAsync(fd);
      } else {
        await create.mutateAsync({
          invoice_id: invoice.id,
          payment_method: manualMethod,
          payment_mode: "one_time",
          amount: paymentAmount,
          processing_fee: 0,
          payment_date: manualDate,
          reference_number: refNum.trim() || undefined,
          notes:
            notes.trim() ||
            `Manual payment for invoice ${invoice.invoice_number}`,
        });
      }
      if (isPartialPayment) {
        showAppToast(
          `Manual payment recorded. Remaining amount to pay: ${formatCurrency(
            remainingAfterPayment,
            invoice.currency_code,
          )}.`,
          "success",
        );
      } else {
        showAppToast("Manual payment recorded. Invoice fully paid.", "success");
      }
      setRefNum("");
      setNotes("");
      setFiles([]);
      onPaymentSuccess?.();
    } catch (e) {
      showBillingBackendErrorToast(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const validEvidenceTypes = useMemo(
    () =>
      new Set([
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]),
    [],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const maxSize = 10 * 1024 * 1024;
      const picked = Array.from(e.target.files);
      const ok: File[] = [];
      const bad: string[] = [];
      for (const file of picked) {
        if (!validEvidenceTypes.has(file.type)) {
          bad.push(`${file.name}: unsupported type`);
          continue;
        }
        if (file.size > maxSize) {
          bad.push(`${file.name}: max 10MB`);
          continue;
        }
        ok.push(file);
      }
      if (bad.length) {
        showAppToast(
          `Some files were skipped: ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "…" : ""}`,
          "warning",
        );
      }
      if (ok.length) setFiles((prev) => [...prev, ...ok]);
      e.target.value = "";
    },
    [validEvidenceTypes],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (invoice.status === "paid" || outstanding <= 0) {
    return <InvoiceAlreadyPaid invoice={invoice} />;
  }

  const tenantId =
    invoice.tenant_id ?? invoice.company?.tenant_id ?? null;

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
        Process payment
      </h3>
      <p className="text-xs text-zinc-500">
        Outstanding:{" "}
        <strong>{formatCurrency(outstanding, invoice.currency_code)}</strong>
      </p>

      <div className="flex flex-wrap gap-2">
        {(["saved", "direct", "manual"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === k
                ? "bg-emerald-600 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            {k === "saved"
              ? "Saved cards"
              : k === "direct"
                ? "New card"
                : "Manual"}
          </button>
        ))}
      </div>

      {tab === "saved" ? (
        <div className="space-y-3">
          {pmLoading ? (
            <p className="text-sm text-zinc-500">Loading cards…</p>
          ) : paymentMethods.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              No saved cards for this{" "}
              {crmId ? "customer (CRM)" : "tenant"}. Add a card in the customer
              or company profile, or use <strong>New card</strong>.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPm(pm.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                      selectedPm === pm.id
                        ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span>
                      {(pm.card?.brand ?? "Card").toString()} ****{" "}
                      {pm.card?.last4}
                      {pm.is_default ? (
                        <span className="ml-2 text-xs text-sky-600">Default</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500">
                Saved card payments use the full outstanding amount including a
                3% processing fee.
              </p>
              {showFeeDetails ? (
                <div className="space-y-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">
                    Full payment: invoice will be marked paid when this succeeds.
                  </p>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                    <span>Payment amount</span>
                    <span>{formatCurrency(outstanding, invoice.currency_code)}</span>
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
              ) : null}
              <button
                type="button"
                disabled={
                  busy || !selectedPm || create.isPending || outstanding <= 0
                }
                onClick={() => void handleSavedPay()}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy || create.isPending ? "Processing…" : "Pay with saved card"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {tab === "direct" ? (
        directSubView === "addCard" ? (
          <InvoiceAddCardForm
            companyProfileId={companyId}
            crmCompanyId={crmId}
            onBack={() => setDirectSubView("pay")}
            onSuccess={() => {
              setDirectSubView("pay");
              setTab("saved");
              onPaymentSuccess?.();
            }}
          />
        ) : (
          <DirectPayForm
            invoice={invoice}
            amount={outstanding}
            companyId={companyId}
            tenantId={tenantId}
            showFeeDetails={showFeeDetails}
            onAddCard={() => setDirectSubView("addCard")}
            onSuccess={() => onPaymentSuccess?.()}
          />
        )
      ) : null}

      {tab === "manual" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/40">
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              Outstanding
            </span>
            <strong className="text-base text-sky-700 dark:text-sky-300">
              {formatCurrency(outstanding, invoice.currency_code)}
            </strong>
          </div>
          <div>
            <label className={formLabelClass}>
              Method
            </label>
            <select
              className={formControlClass}
              value={manualMethod}
              onChange={(e) => setManualMethod(e.target.value)}
            >
              <option value="">Select…</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="card_payment">Card payment</option>
            </select>
          </div>
          <div>
            <label className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-500">
              <span>Amount</span>
              {paymentAmount > 0 && paymentAmount < outstanding - 0.001 ? (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                  Partial
                </span>
              ) : null}
              {paymentAmount > 0 &&
              paymentAmount >= outstanding - 0.001 &&
              outstanding > 0 ? (
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                  Full
                </span>
              ) : null}
            </label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              max={outstanding}
              className={formControlClass}
              value={paymentAmount || ""}
              onChange={(e) =>
                setPaymentAmount(
                  Number.parseFloat(
                    stripNumericLeadingZerosForControlledInput(e.target.value),
                  ) || 0,
                )
              }
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-[11px] font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                onClick={() => setPaymentAmount(outstanding)}
              >
                Pay full amount
              </button>
              <span className="text-[11px] text-zinc-500">
                Max {formatCurrency(outstanding, invoice.currency_code)}
              </span>
            </div>
          </div>
          {paymentAmount > 0 && paymentAmount < outstanding - 0.001 ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Partial payment:{" "}
              {formatCurrency(paymentAmount, invoice.currency_code)} of{" "}
              {formatCurrency(outstanding, invoice.currency_code)} outstanding.
            </p>
          ) : null}
          {paymentAmount > 0 &&
          paymentAmount >= outstanding - 0.001 &&
          outstanding > 0 ? (
            <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
              This amount covers the remaining balance; the invoice can be marked
              paid when the API applies it.
            </p>
          ) : null}
          <div className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/40">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Remaining after this payment</span>
              <strong
                className={
                  outstanding - paymentAmount > 0.001
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }
              >
                {formatCurrency(
                  Math.max(0, outstanding - paymentAmount),
                  invoice.currency_code,
                )}
              </strong>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>
                Payment date
              </label>
              <input
                type="date"
                className={formControlClass}
                value={manualDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            <div>
              <label className={formLabelClass}>
                Reference (optional)
              </label>
              <input
                className={formControlClass}
                value={refNum}
                onChange={(e) => setRefNum(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={formLabelClass}>
              Notes
            </label>
            <input
              className={formControlClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Evidence files (optional)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,application/pdf,image/*"
              className={formControlClass}
              onChange={onFile}
              disabled={busy || create.isPending}
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              PDF, images, DOC/DOCX — max 10MB per file.
            </p>
            {files.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/60"
                  >
                    <span className="truncate">
                      {file.name}{" "}
                      <span className="text-zinc-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-rose-600 hover:underline dark:text-rose-400"
                      onClick={() => removeFile(index)}
                      disabled={busy || create.isPending}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            disabled={
              busy || !manualMethod || paymentAmount <= 0 || create.isPending
            }
            onClick={() => void handleManualPay()}
            className="w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
          >
            {busy ? "Saving…" : "Record manual payment"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function InvoicePaymentSection(props: InvoicePaymentSectionProps) {
  const pkQuery = useStripePublishableKey();
  const publishableKey = useMemo(
    () => unwrapPublishableKey(pkQuery.data),
    [pkQuery.data],
  );
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(
    null,
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync Stripe.js promise from publishable key */
    if (!publishableKey) {
      setStripePromise(null);
      return;
    }
    setStripePromise(loadStripe(publishableKey));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [publishableKey]);

  const [liveKeyOnHttp, setLiveKeyOnHttp] = useState(false);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- warn when live key used off HTTPS */
    if (
      typeof globalThis.window === "undefined" ||
      !publishableKey?.startsWith("pk_live_")
    ) {
      setLiveKeyOnHttp(false);
      return;
    }
    setLiveKeyOnHttp(globalThis.window.location.protocol !== "https:");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [publishableKey]);

  if (pkQuery.isPending && !publishableKey) {
    return (
      <p className="text-sm text-zinc-500">Loading payment configuration…</p>
    );
  }

  if (!stripePromise) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Stripe is not configured. Card payments are unavailable until a
        publishable key is returned by the API.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {liveKeyOnHttp ? (
        <p
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          Live Stripe keys require HTTPS. Use HTTPS in production or test keys
          (pk_test_…) for local HTTP development; card flows may fail otherwise.
        </p>
      ) : null}
      <Elements stripe={stripePromise}>
        <InvoicePaymentInner {...props} />
      </Elements>
    </div>
  );
}

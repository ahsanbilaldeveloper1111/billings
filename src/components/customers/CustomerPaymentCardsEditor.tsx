"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CustomerAddCardForm } from "@/components/customers/CustomerAddCardForm";
import { useStripePaymentMethodsForCustomer } from "@/hooks/stripe/useStripeEndpoints";
import { useStripeCustomerPaymentMutations } from "@/hooks/stripe/useStripeCustomerPaymentMutations";
import { useStripePublishableKey } from "@/hooks/stripe/useStripePublishableKey";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { parseStripePaymentMethods } from "@/lib/stripe/parseStripePaymentMethods";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";

function unwrapPublishableKey(payload: unknown): string | null {
  const d = unwrapApiSuccessData<Record<string, unknown>>(payload);
  if (!d) return null;
  const k = d.publishable_key ?? d.publishableKey;
  if (typeof k === "string" && k.startsWith("pk_")) return k;
  return null;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type CustomerPaymentCardsEditorProps = {
  crmCompanyId: string;
  customerName: string;
  /** When false, skip loading payment methods and reset add-card UI. */
  active: boolean;
};

export function CustomerPaymentCardsEditor({
  crmCompanyId,
  customerName,
  active,
}: CustomerPaymentCardsEditorProps) {
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

  const { data: stripePmData, refetch: refetchCards } =
    useStripePaymentMethodsForCustomer(active ? crmCompanyId : null);

  const paymentMethods = useMemo(
    () => parseStripePaymentMethods(stripePmData),
    [stripePmData],
  );

  const { setDefault, remove } =
    useStripeCustomerPaymentMutations(crmCompanyId);

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  useEffect(() => {
    if (active) return;
    /* eslint-disable react-hooks/set-state-in-effect -- collapse add-card when section inactive */
    setAddCardOpen(false);
    setAddCardError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active]);

  const handleCardAdded = () => {
    setAddCardError(null);
    setAddCardOpen(false);
    void refetchCards();
    showAppToast("Card added successfully.", "success");
  };

  const handleSetDefault = (pmId: string) => {
    setDefault.mutate(pmId, {
      onSuccess: () => {
        void refetchCards();
        showAppToast("Default card updated.", "success");
      },
      onError: (e) => showBillingBackendErrorToast(e),
    });
  };

  const handleDeletePm = (pmId: string) => {
    if (!globalThis.confirm("Remove this card?")) return;
    remove.mutate(pmId, {
      onSuccess: () => {
        void refetchCards();
        showAppToast("Card removed.", "success");
      },
      onError: (e) => showBillingBackendErrorToast(e),
    });
  };

  return (
    <SectionCard title="Payment cards">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Saved cards for invoice payments (Stripe).
        </p>
        <button
          type="button"
          onClick={() => {
            setAddCardOpen((o) => !o);
            setAddCardError(null);
          }}
          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100"
        >
          {addCardOpen ? "Hide add card" : "Add card"}
        </button>
      </div>

      {paymentMethods.length === 0 && !addCardOpen ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No cards on file. Add a card to use for invoice payments.
        </p>
      ) : null}

      {paymentMethods.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {paymentMethods.map((pm) => (
            <li
              key={pm.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 py-2 last:border-0 dark:border-zinc-700"
            >
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] font-medium uppercase text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                  {pm.card?.brand ?? "Card"}
                </span>{" "}
                **** {pm.card?.last4}
                {pm.card?.exp_month != null && pm.card?.exp_year != null ? (
                  <span className="ml-1 text-xs text-zinc-500">
                    ({String(pm.card.exp_month).padStart(2, "0")}/
                    {pm.card.exp_year})
                  </span>
                ) : null}
                {pm.is_default ? (
                  <span className="ml-2 rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                    Default
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap gap-1">
                {!pm.is_default ? (
                  <button
                    type="button"
                    disabled={setDefault.isPending}
                    onClick={() => handleSetDefault(pm.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    Set default
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => handleDeletePm(pm.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {addCardOpen ? (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
          {!publishableKey || !stripePromise ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {pkQuery.isPending
                ? "Loading Stripe configuration…"
                : "Stripe publishable key is not available. Cards cannot be added until the backend exposes a valid key."}
            </p>
          ) : (
            <Elements stripe={stripePromise}>
              <CustomerAddCardForm
                crmCompanyId={crmCompanyId}
                customerName={customerName || "Customer"}
                onCardAdded={handleCardAdded}
                onError={(msg) => setAddCardError(msg)}
              />
            </Elements>
          )}
          {addCardError ? (
            <p
              className="mt-3 rounded-lg border border-rose-200/90 bg-rose-50/90 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
              role="alert"
            >
              {addCardError}
            </p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

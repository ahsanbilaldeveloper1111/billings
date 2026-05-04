"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";
import { useStripeCustomerPaymentMutations } from "@/hooks/stripe/useStripeCustomerPaymentMutations";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { formControlClass } from "@/lib/uiFormClasses";

type Props = Readonly<{
  crmCompanyId: string;
  customerName: string;
  onCardAdded: () => void;
  onError: (msg: string) => void;
}>;

function extractActionPayload(res: unknown): Record<string, unknown> | null {
  const inner = unwrapApiSuccessData<Record<string, unknown>>(res);
  if (inner) return inner;
  if (res && typeof res === "object" && "data" in res) {
    const d = (res as { data: unknown }).data;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      return d as Record<string, unknown>;
    }
  }
  return null;
}

export function CustomerAddCardForm({
  crmCompanyId,
  customerName,
  onCardAdded,
  onError,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { createAndConfirm, saveFromIntent } =
    useStripeCustomerPaymentMutations(crmCompanyId);

  const [cardholderName, setCardholderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!customerName.trim()) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- sync default cardholder from customer name */
    setCardholderName(customerName.trim());
  }, [customerName]);

  const isProcessing =
    createAndConfirm.isPending || saveFromIntent.isPending;

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onError("Stripe has not loaded yet.");
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError("Card element not found.");
      return;
    }
    const nameOnCard =
      cardholderName.trim() || customerName.trim() || "Customer";
    try {
      const { error, token } = await stripe.createToken(cardElement, {
        name: nameOnCard,
      });
      if (error) {
        onError(error.message || "Failed to create card token.");
        return;
      }
      if (!token) {
        onError("Failed to create card token.");
        return;
      }
      const res = await createAndConfirm.mutateAsync({
        cardholderName: nameOnCard,
        isDefault,
        stripeToken: token.id,
      });
      const payload = extractActionPayload(res);
      const needsAction =
        payload &&
        Boolean(payload.requires_action) &&
        typeof payload.client_secret === "string";

      if (needsAction && payload) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          payload.client_secret as string,
        );
        if (confirmError) {
          onError(
            confirmError.message || "Authentication failed.",
          );
          return;
        }
        const piRaw =
          payload.payment_intent_id ??
          payload.paymentIntentId;
        if (piRaw == null || String(piRaw).trim() === "") {
          onError("Missing payment intent after verification.");
          return;
        }
        await saveFromIntent.mutateAsync({
          payment_intent_id: String(piRaw),
          isDefault: Boolean(payload.is_default),
        });
        onCardAdded();
        return;
      }
      onCardAdded();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Payment processing failed.";
      onError(msg);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Cardholder name
        </label>
        <input
          type="text"
          className={formControlClass}
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder={customerName ? customerName : "Name on card"}
          autoComplete="cc-name"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-zinc-300"
        />
        Set as default payment method
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isProcessing || !stripe || !elements}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {isProcessing ? "Adding…" : "Add card"}
        </button>
        {(!stripe || !elements) && (
          <span className="text-xs text-zinc-500">Loading Stripe…</span>
        )}
      </div>
    </div>
  );
}

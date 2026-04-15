"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import { useStripeCustomerPaymentMutations } from "@/hooks/stripe/useStripeCustomerPaymentMutations";
import { useStripeProfileAddCardMutation } from "@/hooks/stripe/useStripeProfileAddCardMutation";
import { showAppToast, showBillingBackendErrorToast } from "@/lib/toast/appToast";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

const cardElOpts = {
  style: {
    base: {
      fontSize: "16px",
      color: "#18181b",
      "::placeholder": { color: "#71717a" },
    },
    invalid: { color: "#b91c1c" },
  },
  hidePostalCode: true,
} as const;

type InvoiceAddCardFormProps = {
  companyProfileId: number;
  crmCompanyId: string | null;
  onSuccess: () => void;
  onBack: () => void;
};

export function InvoiceAddCardForm({
  companyProfileId,
  crmCompanyId,
  onSuccess,
  onBack,
}: InvoiceAddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const customerMut = useStripeCustomerPaymentMutations(
    crmCompanyId?.trim() || null,
  );
  const profileMut = useStripeProfileAddCardMutation(
    crmCompanyId ? null : companyProfileId,
  );

  const [cardholderName, setCardholderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  const saving =
    busy ||
    customerMut.createAndConfirm.isPending ||
    profileMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
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
      const { error, token } = await stripe.createToken(card, {
        name: cardholderName.trim(),
      });
      if (error) {
        setCardError(error.message || "Failed to create card token");
        setBusy(false);
        return;
      }
      if (!token) {
        showAppToast("Failed to create card token.", "error");
        setBusy(false);
        return;
      }

      const body = {
        cardholderName: cardholderName.trim(),
        isDefault,
        stripeToken: token.id,
      };

      if (crmCompanyId?.trim()) {
        await customerMut.createAndConfirm.mutateAsync(body);
      } else if (companyProfileId > 0) {
        await profileMut.mutateAsync(body);
      } else {
        showAppToast("Missing profile or customer id for saving card.", "error");
        setBusy(false);
        return;
      }

      showAppToast("Card added.", "success");
      setCardholderName("");
      setIsDefault(false);
      setCardComplete(false);
      onSuccess();
    } catch (err) {
      showBillingBackendErrorToast(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Back to payment
        </button>
      </div>

      <div>
        <label className={formLabelClass}>
          Card *
        </label>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <CardElement
            options={cardElOpts}
            onChange={(ev) => {
              setCardError(ev.error?.message ?? null);
              setCardComplete(ev.complete);
            }}
          />
        </div>
        {cardError ? (
          <p className="mt-1 text-xs text-rose-600">{cardError}</p>
        ) : null}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
          <span aria-hidden>🔒</span>
          Your card is processed securely by Stripe.
        </p>
      </div>

      <div>
        <label className={formLabelClass}>
          Cardholder name *
        </label>
        <input
          className={formControlClass}
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          disabled={saving}
          placeholder="Name on card"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          disabled={saving}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Set as default
      </label>

      <button
        type="submit"
        disabled={!cardComplete || !cardholderName.trim() || saving}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {saving ? "Adding card…" : "Add card"}
      </button>
    </form>
  );
}

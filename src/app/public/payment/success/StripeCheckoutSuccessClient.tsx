"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { publicApiService } from "@/services/public-api.service";
import { appPaths } from "@/lib/navigation/appPaths";

type VerifyPayload = {
  verified?: boolean;
  pending?: boolean;
  invoice_number?: string;
  invoice_status?: string;
  message?: string;
};

type ApiEnvelope = {
  success?: boolean;
  data?: VerifyPayload;
  message?: string;
};

/**
 * Stripe `success_url` target (`?session_id=…`).
 * Polls the billing API until the session is verified or limits are hit.
 */
export function StripeCheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const verifyOnce = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;
    const res = (await publicApiService.verifyCheckoutSession({
      session_id: sessionId,
    })) as ApiEnvelope;
    const data = res.data;
    if (!res.success || data == null) {
      setErrMsg(res.message ?? "Verification failed");
      setPhase("error");
      return false;
    }
    if (data.pending || !data.verified) {
      return false;
    }
    setPayload(data);
    setPhase("done");
    return true;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      /* eslint-disable react-hooks/set-state-in-effect -- derive terminal error when URL lacks session_id */
      setErrMsg(
        "Missing session. Return from Stripe Checkout using the success link.",
      );
      setPhase("error");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25;
    const intervalMs = 2000;

    const run = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const ok = await verifyOnce();
          if (ok || cancelled) return;
        } catch (e: unknown) {
          const msg =
            e &&
            typeof e === "object" &&
            "response" in e &&
            (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
              ? String(
                  (e as { response: { data: { message?: string } } }).response
                    .data.message,
                )
              : e instanceof Error
                ? e.message
                : "Verification failed";
          if (attempts >= 3) {
            setErrMsg(String(msg));
            setPhase("error");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      if (!cancelled) {
        setErrMsg(
          "Payment is taking longer than expected. Your invoice will update when processing completes, or contact support with your session id.",
        );
        setPhase("error");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, verifyOnce]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          Invalid return link (no session id).
        </p>
        <div className="mt-4">
          <Link
            href={appPaths.login}
            className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <span
          className="mb-4 inline-block size-10 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600 dark:border-zinc-600 dark:border-t-emerald-400"
          aria-hidden
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Confirming payment and updating your invoice…
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Could not confirm yet
          </h1>
          <p
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            {errMsg}
          </p>
          <p className="mt-3 font-mono text-xs text-zinc-500">
            Session: {sessionId}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => globalThis.location.reload()}
            >
              Try again
            </button>
            <Link
              href={appPaths.login}
              className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paid = payload?.invoice_status === "paid";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {paid ? "Invoice paid" : "Payment recorded"}
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {payload?.message ?? "Thank you for your payment."}
        </p>
        {payload?.invoice_number ? (
          <p className="mt-4 text-sm text-zinc-800 dark:text-zinc-200">
            <strong>Invoice #{payload.invoice_number}</strong>
            {payload.invoice_status ? (
              <span className="text-zinc-500"> — {payload.invoice_status}</span>
            ) : null}
          </p>
        ) : null}
        <div className="mt-6">
          <Link
            href={appPaths.login}
            className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

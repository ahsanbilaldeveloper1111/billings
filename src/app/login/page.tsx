"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLoginFormState } from "@/hooks/forms/useLoginFormState";
import { appPaths } from "@/lib/navigation/appPaths";
import { showBillingBackendErrorToast } from "@/lib/toast/appToast";
import { formControlClass, formLabelPlainClass } from "@/lib/uiFormClasses";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginMutation } = useAuth();
  const { values, setValues } = useLoginFormState();
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const result = await login(values);
      if (result.requires_google_auth_verification) {
        setFormError(
          "This account requires Google 2FA verification before continuing.",
        );
        return;
      }
      router.replace(appPaths.dashboard);
    } catch (err) {
      showBillingBackendErrorToast(err);
      setFormError(null);
    }
  }

  const pending = loginMutation.isPending;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(13,148,136,0.09),transparent_50%),radial-gradient(ellipse_50%_45%_at_100%_0%,rgba(99,102,241,0.05),transparent_45%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(45,212,191,0.08),transparent_48%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-white via-white to-teal-50/30 p-8 shadow-[0_12px_48px_-20px_rgba(15,23,42,0.1)] ring-1 ring-teal-900/[0.04] dark:border-zinc-800/80 dark:from-zinc-900 dark:via-zinc-900 dark:to-teal-950/20 dark:shadow-[0_16px_56px_-24px_rgba(0,0,0,0.55)] dark:ring-white/[0.05]">
        <div
          className="pointer-events-none absolute -right-16 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-teal-300/20 to-transparent blur-3xl dark:from-teal-500/12"
          aria-hidden
        />
        <div className="relative">
          <h1 className="text-center text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Billing workspace
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="samaccountname"
                className={formLabelPlainClass}
              >
                Username
              </label>
              <input
                id="samaccountname"
                name="samaccountname"
                autoComplete="username"
                value={values.samaccountname}
                onChange={(e) =>
                  setValues((v) => ({ ...v, samaccountname: e.target.value }))
                }
                className={formControlClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className={formLabelPlainClass}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={(e) =>
                  setValues((v) => ({ ...v, password: e.target.value }))
                }
                className={formControlClass}
                required
              />
            </div>
            {formError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-md shadow-zinc-900/15 transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-teal-600 dark:shadow-teal-900/25 dark:hover:bg-teal-500"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

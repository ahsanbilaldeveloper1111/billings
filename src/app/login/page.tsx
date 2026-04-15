"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLoginFormState } from "@/hooks/forms/useLoginFormState";
import { appPaths } from "@/lib/navigation/appPaths";
import { showBillingBackendErrorToast } from "@/lib/toast/appToast";
import { formControlClass } from "@/lib/uiFormClasses";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Billing · billing backend
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="samaccountname"
              className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200"
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
              className="mb-1.5 block text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200"
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
            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

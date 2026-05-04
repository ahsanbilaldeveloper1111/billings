"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { useAuth } from "@/contexts/auth-context";
import { appPaths } from "@/lib/navigation/appPaths";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- client hydration gate for auth redirect */
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Wait for client hydration before guarding; token is null during SSR snapshot.
    if (!hydrated) return;
    if (!token) {
      router.replace(appPaths.login);
    }
  }, [hydrated, token, router]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* Ambient mesh — depth behind content */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_58%_at_50%_-16%,rgba(13,148,136,0.065),transparent_54%),radial-gradient(ellipse_55%_42%_at_100%_0%,rgba(99,102,241,0.04),transparent_46%),radial-gradient(ellipse_45%_38%_at_0%_95%,rgba(244,114,182,0.03),transparent_48%)] dark:bg-[radial-gradient(ellipse_88%_55%_at_50%_-18%,rgba(45,212,191,0.08),transparent_52%),radial-gradient(ellipse_48%_38%_at_100%_0%,rgba(56,189,248,0.055),transparent_45%),radial-gradient(ellipse_40%_35%_at_0%_90%,rgba(167,139,250,0.04),transparent_50%)]"
        aria-hidden
      />

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] transform transition-transform duration-300 ease-out lg:static lg:z-0 lg:flex lg:w-56 lg:max-w-none lg:translate-x-0 xl:w-64 ${
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        <AppTopBar onMenuClick={() => setMobileNavOpen((o) => !o)} />
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-7xl flex-1 px-5 pb-12 pt-8 sm:px-7 sm:pb-14 sm:pt-10 lg:px-10 lg:pb-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(100%,52rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent dark:via-teal-400/22"
        aria-hidden
      />
      {children}
    </div>
  );
}

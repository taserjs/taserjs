"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-orange-300">
          Something went wrong
        </p>
        <h1 className="text-3xl font-bold tracking-tight">This page crashed.</h1>
        <p className="mt-4 text-base text-slate-300">
          An unexpected error occurred while rendering this page. You can try again or head back to
          the home page.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}

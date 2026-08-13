import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-sm">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-orange-300">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-base text-slate-300">
          The page you were looking for doesn’t exist or may have moved.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Go back home
          </Link>
        </div>
      </div>
    </main>
  )
}

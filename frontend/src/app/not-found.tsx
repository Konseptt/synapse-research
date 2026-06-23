import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="label-caps mb-2">404</p>
      <h1 className="font-serif text-2xl font-medium text-ink">Page not found</h1>
      <p className="mt-3 text-sm text-ink-muted">
        That link does not exist. Try search or go back to the home page.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/search"
          className="rounded-sm border border-rule bg-surface-elevated px-4 py-2 text-sm font-medium text-ink hover:border-accent-muted"
        >
          Search studies
        </Link>
        <Link href="/" className="px-4 py-2 text-sm font-medium text-accent hover:text-accent-hover">
          Home
        </Link>
      </div>
    </div>
  );
}

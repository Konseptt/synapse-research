"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-5 text-center">
      <p className="label-caps mb-2">Something went wrong</p>
      <h1 className="font-serif text-2xl font-medium text-ink">We hit an unexpected error</h1>
      <p className="mt-3 max-w-md text-sm text-ink-muted">
        {error.message || "Try refreshing the page. If this keeps happening, check your connection."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

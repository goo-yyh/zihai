"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="rounded-2xl bg-rose-50 p-4 text-danger">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-black">Something went sideways</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The request could not be completed. No changes were made.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

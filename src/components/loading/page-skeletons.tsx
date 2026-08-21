import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

function LoadingRegion({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true">
      {children}
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border bg-white">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-5">
        <Skeleton className="h-6 w-2/3" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </article>
  );
}

export function HomePageSkeleton() {
  return (
    <LoadingRegion>
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="size-9 rounded-xl" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[1fr_19rem]">
          <main className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-56 flex-1">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="mt-4 h-12 w-3/4 max-w-lg" />
                <div className="mt-4 flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
            <Skeleton className="mt-9 aspect-[16/9] w-full rounded-2xl" />
            <div className="mt-3 flex justify-center gap-2">
              <Skeleton className="h-2.5 w-7 rounded-full" />
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="size-2.5 rounded-full" />
            </div>
            <div className="mt-10 rounded-2xl border bg-white p-6 sm:p-8">
              <Skeleton className="h-5 w-2/5" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="mt-12">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-9 w-44" />
              <div className="mt-6 space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </main>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-white p-5">
              <Skeleton className="h-3 w-20" />
              <div className="mt-4 flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-4 w-32" />
            </div>
          </aside>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ProfilePageSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border bg-foreground p-7 sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Skeleton className="size-24 rounded-full bg-white/15" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-28 bg-white/15" />
              <Skeleton className="h-11 w-56 bg-white/15" />
              <Skeleton className="h-4 w-44 bg-white/15" />
            </div>
          </div>
        </header>
        <section className="mt-12">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-3 h-4 w-36" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}

function PageHeadingSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {action ? <Skeleton className="h-10 w-32 rounded-xl" /> : null}
    </div>
  );
}

export function WorkspaceOverviewSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-8">
        <PageHeadingSkeleton action />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border bg-white p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-4 h-9 w-14" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <Skeleton className="h-6 w-40" />
          <div className="mt-5 divide-y">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex justify-between gap-4 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function WorkspaceListSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-6">
        <PageHeadingSkeleton action />
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-5"
            >
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function FormPageSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-7">
        <PageHeadingSkeleton />
        <div className="space-y-6 rounded-2xl border bg-white p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="aspect-[16/10] rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function SubmitProjectSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-7 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-4/5 max-w-lg" />
        </div>
        <div className="rounded-2xl border bg-white">
          <div className="space-y-3 border-b p-5 sm:p-6">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-3/4 max-w-md" />
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-60 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <Skeleton className="h-4 w-44" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-8">
        <PageHeadingSkeleton />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border bg-white p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-10 w-16" />
            </div>
          ))}
        </div>
        <TablePanelSkeleton rows={5} />
      </div>
    </LoadingRegion>
  );
}

function TablePanelSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b p-4">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-5 px-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminTableSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <TablePanelSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function AdminDetailSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-7">
        <PageHeadingSkeleton action />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/10] rounded-2xl" />
          ))}
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <Skeleton className="h-6 w-40" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AuthPageSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <div className="rounded-[2rem] border bg-white p-6 sm:p-9">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

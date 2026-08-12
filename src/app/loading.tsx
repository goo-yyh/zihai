export default function Loading() {
  return <div className="mx-auto max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8"><div className="h-4 w-28 rounded bg-muted" /><div className="mt-4 h-12 max-w-lg rounded-xl bg-muted" /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/3] rounded-2xl border bg-white/70" />)}</div></div>;
}

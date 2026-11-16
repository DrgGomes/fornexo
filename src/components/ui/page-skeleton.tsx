function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-zinc-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Bar className="mb-2 h-7 w-48" />
      <Bar className="mb-6 h-4 w-72" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-24" />
        ))}
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Bar className="size-11 shrink-0" />
            <div className="flex-1">
              <Bar className="mb-2 h-3.5 w-2/3" />
              <Bar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder bars while a screen loads. Announced once as "Loading", not read line by line. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" className="space-y-3 rounded-2xl border border-black/10 bg-white p-5">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-pulse rounded-md bg-[#ECEEF2]"
          style={{ width: `${92 - ((i * 17) % 40)}%` }}
        />
      ))}
    </div>
  );
}

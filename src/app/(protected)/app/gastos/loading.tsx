export default function GastosLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-56 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        <div className="h-9 w-32 rounded-lg bg-gray-100 animate-pulse" />
      </div>

      {/* Group skeletons */}
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-2">
          <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ animationDelay: `${(g * 3 + i) * 50}ms` }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                <div className="w-7 h-7 rounded-md bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

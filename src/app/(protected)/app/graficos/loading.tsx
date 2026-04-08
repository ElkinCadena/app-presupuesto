export default function GraficosLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-36 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-7 w-32 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-lg bg-gray-50 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-lg bg-gray-50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

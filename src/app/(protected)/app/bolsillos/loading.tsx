export default function BolsillosLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-40 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-72 rounded bg-gray-100 animate-pulse" />
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

      {/* Cards skeleton */}
      <div>
        <div className="h-5 w-24 rounded bg-gray-100 animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex justify-between">
                <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-14 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-2 rounded-full bg-gray-100 animate-pulse" />
              <div className="flex justify-between">
                <div className="h-5 w-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-5 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

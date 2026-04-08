export default function DetalleMesLoading() {
  return (
    <div className="space-y-8">
      {/* Back link + header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-44 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-56 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-5 space-y-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-7 w-32 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Expense list skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-28 rounded bg-gray-100 animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Pockets skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-24 rounded bg-gray-100 animate-pulse mb-1" />
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

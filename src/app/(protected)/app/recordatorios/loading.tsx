export default function RecordatoriosLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-44 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-72 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        <div className="h-9 w-40 rounded-lg bg-gray-100 animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-5 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="w-10 h-6 rounded-full bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

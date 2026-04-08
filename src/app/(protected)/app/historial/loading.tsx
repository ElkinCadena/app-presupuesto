export default function HistorialLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="h-8 w-36 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

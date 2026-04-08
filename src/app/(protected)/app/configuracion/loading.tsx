export default function ConfiguracionLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-24 rounded-t-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

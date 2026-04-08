export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-md space-y-6">
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
        </div>
        {/* Input skeleton */}
        <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        {/* Button skeleton */}
        <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

"use client";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`.trim()} aria-hidden />;
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4 py-1">
      <SkeletonBlock className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-10 w-40" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-2 px-2">
      <SkeletonBlock className="h-8 w-full" />
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full" />
    </div>
  );
}

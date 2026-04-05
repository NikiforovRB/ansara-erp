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

const colsSkeletonFull = (showBacklogColumn: boolean) =>
  showBacklogColumn
    ? "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,1.05fr)_40px] gap-x-10"
    : "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_40px] gap-x-10";

const colsSkeletonMobile = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-x-4";

/** Скелетон основной таблицы проектов (сетка как у шапки таблицы). */
export function DashboardMainTableSkeleton({
  showBacklogColumn = true,
  narrow = false,
}: {
  showBacklogColumn?: boolean;
  /** Две колонки, как на экране &lt; 700px */
  narrow?: boolean;
}) {
  const cols = narrow ? colsSkeletonMobile : colsSkeletonFull(showBacklogColumn);
  return (
    <div className={narrow ? "min-w-0 w-full" : showBacklogColumn ? "min-w-[900px]" : "min-w-[760px]"}>
      <div className={`${cols} border-b border-[var(--table-divider)] pb-2`}>
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-28" />
        {!narrow ? (
          <>
            <SkeletonBlock className="mx-auto h-4 w-20" />
            <SkeletonBlock className="h-4 w-32" />
            {showBacklogColumn ? <SkeletonBlock className="h-4 w-16" /> : null}
            <div aria-hidden className="h-4 w-4" />
          </>
        ) : null}
      </div>
      <div className="mt-2 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`${cols} items-center py-2`}>
            <SkeletonBlock className="h-10 w-full max-w-[200px]" />
            <SkeletonBlock className="h-8 w-full max-w-[180px]" />
            {!narrow ? (
              <>
                <SkeletonBlock className="h-8 w-24 justify-self-center" />
                <SkeletonBlock className="h-8 w-full max-w-[220px]" />
                {showBacklogColumn ? <SkeletonBlock className="h-8 w-20" /> : null}
                <SkeletonBlock className="h-6 w-6 rounded" />
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerPanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-4 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
      <div className="space-y-1">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </div>
  );
}

export function LkEditorPanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-4 w-48" />
      <div className="space-y-1">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-10 w-full max-w-md" />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <SkeletonBlock className="h-6 w-56" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-28 w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DeadlinePanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-4 w-36" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        <div className="space-y-1">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-20 w-full" />
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="mt-16 h-40 w-full max-w-[500px]" />
    </div>
  );
}

export function PaymentsPanelSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-4 w-40" />
      <div className="flex flex-wrap gap-6">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <SkeletonBlock className="h-8 w-72" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-32 w-full" />
    </div>
  );
}

export function BacklogPanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-4 w-44" />
      <SkeletonBlock className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-[var(--foreground)]/10 p-3">
          <SkeletonBlock className="h-5 w-2/3 max-w-xs" />
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonBlock className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function MyProfilePanelSkeleton() {
  return (
    <div className="flex flex-wrap gap-4">
      <SkeletonBlock className="h-20 w-20 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function SettingsPanelSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-4 w-40" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-28" />
        ))}
        <SkeletonBlock className="h-10 w-10 rounded-lg" />
      </div>
      <SkeletonBlock className="h-4 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-2">
          <SkeletonBlock className="h-10 flex-1" />
          <SkeletonBlock className="h-8 w-8" />
          <SkeletonBlock className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}

export function GroupsPanelSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-16 w-full max-w-md" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-10 flex-1 max-w-sm" />
        <SkeletonBlock className="h-10 w-10 rounded-lg" />
      </div>
      <SkeletonBlock className="h-4 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonBlock className="h-10 flex-1" />
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-6 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AddProjectPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      ))}
      <div className="col-span-full space-y-1">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
    </div>
  );
}

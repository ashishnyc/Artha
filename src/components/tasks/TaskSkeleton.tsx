function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className={`h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${width}`}
    />
  )
}

function TaskSkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-3/4" />
      </div>
      <SkeletonLine width="w-12" />
    </li>
  )
}

const WIDTHS = ['w-2/3', 'w-4/5', 'w-1/2', 'w-3/4', 'w-2/5']

export default function TaskSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-0.5" data-testid="task-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
          <div className={`h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${WIDTHS[i % WIDTHS.length]}`} />
        </div>
      ))}
    </ul>
  )
}

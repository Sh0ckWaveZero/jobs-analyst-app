import { cn } from 'cn'

import { Badge } from './badge'

export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended'

const STATUS_STYLES: Record<UserStatus, { label: string; className: string }> =
  {
    active: {
      label: 'Active',
      className:
        'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-400/60 dark:bg-teal-950/40 dark:text-teal-200',
    },
    inactive: {
      label: 'Inactive',
      className:
        'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    },
    invited: {
      label: 'Invited',
      className:
        'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-400/60 dark:bg-sky-950/40 dark:text-sky-200',
    },
    suspended: {
      label: 'Suspended',
      className:
        'border-red-200 bg-red-50 text-red-600 dark:border-red-400/60 dark:bg-red-950/40 dark:text-red-200',
    },
  }

export function StatusBadge({
  status,
  className,
}: {
  status: UserStatus
  className?: string
}) {
  const appearance = STATUS_STYLES[status]

  return (
    <Badge
      variant="outline"
      data-status={status}
      className={cn(
        'rounded-md px-2.5 py-0.5 text-xs font-medium leading-4',
        appearance.className,
        className,
      )}
    >
      {appearance.label}
    </Badge>
  )
}

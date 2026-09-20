import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import { cn } from 'cn'

import { Button } from './button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isPending?: boolean
  summary?: React.ReactNode
  pageLabel?: React.ReactNode
  pageSize?: number
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (pageSize: number) => void
  pageSizeLabel?: React.ReactNode
  showFirstLast?: boolean
  showButtonLabels?: boolean
  ariaLabel?: string
  className?: string
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  isPending = false,
  summary,
  pageLabel,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
  pageSizeLabel = 'Rows per page',
  showFirstLast = true,
  showButtonLabels = false,
  ariaLabel = 'Pagination',
  className,
}: PaginationProps) {
  const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1))
  const lastPage = Math.max(totalPages, 1)
  const previousDisabled = currentPage <= 1 || isPending
  const nextDisabled = currentPage >= lastPage || isPending
  const canChangePageSize =
    pageSize !== undefined && onPageSizeChange !== undefined

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center',
        className,
      )}
    >
      {summary}
      <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
        {canChangePageSize && (
          <label className="flex items-center gap-2 whitespace-nowrap">
            <span>{pageSizeLabel}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange?.(Number(value))}
              disabled={isPending}
            >
              <SelectTrigger
                aria-label={String(pageSizeLabel)}
                className="h-9 w-18 bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <span className="min-w-18 text-center font-medium text-foreground">
          {pageLabel ?? `Page ${currentPage} of ${lastPage}`}
        </span>

        <div className="flex items-center gap-1">
          {showFirstLast && (
            <PaginationButton
              label="First page"
              disabled={previousDisabled}
              onClick={() => onPageChange(1)}
              showLabel={false}
            >
              <ChevronsLeft className="size-4" />
            </PaginationButton>
          )}
          <PaginationButton
            label="Previous page"
            disabled={previousDisabled}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            showLabel={showButtonLabels}
          >
            <ChevronLeft className="size-4" />
            {showButtonLabels && 'Previous'}
          </PaginationButton>
          <PaginationButton
            label="Next page"
            disabled={nextDisabled}
            onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
            showLabel={showButtonLabels}
          >
            {showButtonLabels && 'Next'}
            <ChevronRight className="size-4" />
          </PaginationButton>
          {showFirstLast && (
            <PaginationButton
              label="Last page"
              disabled={nextDisabled}
              onClick={() => onPageChange(lastPage)}
              showLabel={false}
            >
              <ChevronsRight className="size-4" />
            </PaginationButton>
          )}
        </div>
      </div>
    </nav>
  )
}

function PaginationButton({
  label,
  disabled,
  onClick,
  showLabel,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  showLabel: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? 'sm' : 'icon'}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={showLabel ? 'gap-1.5' : 'size-9'}
    >
      {children}
    </Button>
  )
}

export { Pagination }
export type { PaginationProps }

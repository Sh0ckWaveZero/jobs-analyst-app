import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * โครงตารางข้อมูลร่วมของหน้า entries — ห่อ thead/tbody/skeleton/empty-state
 * กันโครงสร้าง JSX ซ้ำระหว่างหน้า
 */
export function EntriesTableShell({
  headers,
  isLoading,
  isEmpty,
  emptyText,
  children,
}: {
  headers: string[]
  isLoading: boolean
  isEmpty: boolean
  emptyText: string
  children: ReactNode
}) {
  return (
    <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={headers.length} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </section>
  )
}

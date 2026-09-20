import { Skeleton } from '@/components/ui/skeleton'

// แสดงระหว่างรอ route loader (เกิน pendingMs) — โครงร่างหน้าทั่วไป:
// หัวเรื่อง + การ์ดสถิติ 4 ใบ + บล็อกเนื้อหาหลัก
export function RouteSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

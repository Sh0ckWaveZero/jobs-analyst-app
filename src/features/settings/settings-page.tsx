import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'

import { authClient } from '@/features/auth/auth-client'
import { listDepartments } from '@/features/users/users.functions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin — จัดการได้ทุกอย่าง',
  manager: 'Manager — จัดการโปรเจกต์ที่เป็นเจ้าของ + ดูชั่วโมงทีม',
  member: 'Member — บันทึกชั่วโมงและดูข้อมูลของตัวเอง',
}

// format วันที่เป็น helper ระดับโมดูล — กันค่าต่าง timezone SSR/client
function formatJoinedDate(date: Date | string) {
  return new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' })
}

export function SettingsPage() {
  const { data: session, isPending } = authClient.useSession()
  const departments = useServerFn(listDepartments)
  const qDepartments = useQuery({
    queryKey: ['pm', 'departments'],
    queryFn: () => departments(),
  })
  const u = session?.user
  const joinedText = useMemo(
    () => (u ? formatJoinedDate(u.createdAt) : ''),
    [u],
  )
  const departmentName = qDepartments.data?.find(
    (d) => String(d.id) === String(u?.departmentId ?? ''),
  )?.name

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          โปรไฟล์และสิทธิ์การใช้งาน
        </p>
      </header>

      <section className="max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : u ? (
          <div className="flex items-start gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm font-semibold">
                {u.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{u.name}</p>
                <Badge variant="secondary" className="uppercase">
                  {u.role}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {u.email}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {ROLE_LABELS[u.role ?? ''] ?? ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                แผนก: {departmentName ?? 'ไม่สังกัดแผนก'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                เข้าร่วมเมื่อ {joinedText}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ไม่พบ session</p>
        )}
      </section>
    </div>
  )
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

// recharts เป็น heavy library — dashboard lazy-load ไฟล์นี้ (React.lazy)
// เพื่อไม่ให้อยู่ใน bundle หลักของหน้าอื่น
export function WorkHourChart({
  data,
}: {
  data: Array<{ date: string; hours: number }>
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          fontSize={10}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          width={28}
          unit="h"
        />
        <ChartTooltip formatter={(v) => [`${v}h`, 'Work']} />
        <Bar
          dataKey="hours"
          fill="hsl(var(--primary))"
          radius={[3, 3, 0, 0]}
          animationDuration={300}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

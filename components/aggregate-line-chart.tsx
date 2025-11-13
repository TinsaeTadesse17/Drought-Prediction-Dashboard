"use client"

import { useMemo, memo } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"

type Props = {
  values: number[]
  title?: string
}

const monthLabels = [
  "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"
]

function AggregateLineChart({ values, title = "Aggregated SPEI (12 months)" }: Props) {
  // Memoize data transformation to prevent recalculation on every render
  const data = useMemo(() => {
    return (values?.length ? values : Array(12).fill(null)).map((v, i) => ({
      idx: i,
      month: monthLabels[i % monthLabels.length],
      spei: typeof v === 'number' ? Number(v) : null
    }))
  }, [values])

  // Memoize domain calculation to prevent recalculation on every render
  const domain = useMemo(() => {
    const nums = (values || []).filter((x) => typeof x === 'number' && Number.isFinite(x)) as number[]
    if (!nums.length) return [-1, 1]
    let min = Math.min(...nums)
    let max = Math.max(...nums)
    if (min === max) {
      // Expand a flat line so it becomes visible
      const pad = Math.max(0.2, Math.abs(max) * 0.2)
      return [min - pad, max + pad]
    }
    // Pad by 10% of range, with a minimum padding of 0.1
    const range = max - min
    const pad = Math.max(range * 0.1, 0.1)
    min -= pad
    max += pad
    // Safety clamp to a reasonable band
    min = Math.max(min, -3)
    max = Math.min(max, 3)
    if (min >= max) return [-1, 1]
    return [min, max]
  }, [values])

  return (
    <ChartContainer
      className="w-full h-[260px] rounded-md border"
      config={{
        spei: { label: "SPEI", color: "hsl(var(--primary))" },
        // Theme the dot color: light uses the line color; dark uses white for maximum contrast
        dot: {
          theme: {
            light: "var(--color-spei)",
            dark: "#ffffff"
          }
        }
      }}
    >
      <LineChart data={data} margin={{ left: 16, right: 16, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis domain={domain as any} tickLine={false} axisLine={false} width={36} allowDecimals tickFormatter={(v)=>Number(v).toFixed(1)} />
        <ReferenceLine y={0} stroke="#8884d8" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="spei"
          stroke="var(--color-spei)"
          strokeWidth={2}
          dot={{ r: 3, stroke: '#000', strokeWidth: 1.25, fill: 'var(--color-dot, var(--color-spei))' }}
          activeDot={{ r: 4, stroke: '#000', strokeWidth: 1.5, fill: 'var(--color-dot, var(--color-spei))' }}
          isAnimationActive={false}
          connectNulls
        />
        <ChartTooltip cursor={{ stroke: 'var(--border)' }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}

// Export memoized version to prevent unnecessary re-renders
export default memo(AggregateLineChart)
export { AggregateLineChart }

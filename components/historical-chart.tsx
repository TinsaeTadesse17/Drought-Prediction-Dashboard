"use client"

import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { month: "Jan", value: 2.1 },
  { month: "Feb", value: 1.8 },
  { month: "Mar", value: 2.3 },
  { month: "Apr", value: 1.9 },
  { month: "May", value: 2.7 },
  { month: "Jun", value: 2.4 },
  { month: "Jul", value: 3.1 },
  { month: "Aug", value: 2.8 },
  { month: "Sep", value: 2.2 },
  { month: "Oct", value: 1.7 },
  { month: "Nov", value: 2.0 },
  { month: "Dec", value: 2.5 },
]

export function HistoricalChart() {
  return (
    <ChartContainer
      config={{
        value: {
          label: "Drought Index",
          color: "hsl(var(--chart-1))",
        },
        // Theme-aware colors for dot fill and ring
        dotFill: {
          theme: {
            light: "var(--color-value)",
            dark: "#ffffff",
          },
        },
        dotRing: {
          theme: {
            light: "hsl(var(--foreground))",
            dark: "var(--color-value)",
          },
        },
      }}
      className="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{
              fill: "var(--color-dotFill)",
              stroke: "var(--color-dotRing)",
              strokeWidth: 2,
              r: 5,
            }}
            activeDot={{
              r: 7,
              fill: "var(--color-dotFill)",
              stroke: "var(--color-dotRing)",
              strokeWidth: 2,
            }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

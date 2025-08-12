"use client"

import { Progress } from "@/components/ui/progress"

const regions = [
  { name: "Region A", value: 85, severity: "high" },
  { name: "Region B", value: 65, severity: "medium" },
  { name: "Region C", value: 45, severity: "low" },
  { name: "Region D", value: 90, severity: "critical" },
]

export function RegionalComparison() {
  return (
    <div className="space-y-4">
      {regions.map((region, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">{region.name}</span>
            <span className="text-sm text-muted-foreground">{region.value}%</span>
          </div>
          <Progress
            value={region.value}
            className={`h-3 ${
              region.severity === "critical"
                ? "[&>div]:bg-red-600"
                : region.severity === "high"
                  ? "[&>div]:bg-orange-500"
                  : region.severity === "medium"
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-green-500"
            }`}
          />
        </div>
      ))}
    </div>
  )
}

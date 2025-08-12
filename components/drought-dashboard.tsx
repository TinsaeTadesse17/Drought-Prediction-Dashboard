"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Settings } from "lucide-react"
import { DroughtMap } from "@/components/drought-map"
import { HistoricalChart } from "@/components/historical-chart"
import { RegionalComparison } from "@/components/regional-comparison"
import { ThemeToggle } from "@/components/theme-toggle"

const aiModels = [
  { id: "feed-forward", label: "Feed forward" },
  { id: "cnn-lstm", label: "CNN-LSTM" },
  { id: "transformer", label: "Transformer-based" },
]

const droughtLevels = [
  { level: "Extreme drought", color: "bg-red-600", textColor: "text-red-600" },
  { level: "Severe drought", color: "bg-orange-500", textColor: "text-orange-500" },
  { level: "Moderate drought", color: "bg-yellow-500", textColor: "text-yellow-500" },
  { level: "Mild drought", color: "bg-blue-400", textColor: "text-blue-400" },
  { level: "No drought", color: "bg-green-500", textColor: "text-green-500" },
]

export function DroughtDashboard() {
  const [activeTab, setActiveTab] = useState("Overview")
  const [selectedModel, setSelectedModel] = useState("feed-forward")
  const [year, setYear] = useState([2023])

  // Accuracy decays as year increases; tweak this ratio later as needed
  const MIN_YEAR = 2020
  const ACCURACY_DECAY_PER_YEAR = 10 // percent per year step (editable)
  const accuracy = Math.max(0, Math.min(100, 100 - (year[0] - MIN_YEAR) * ACCURACY_DECAY_PER_YEAR))

  const tabs = ["Overview", "Data", "Reports", "Alerts"]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <h1 className="text-lg font-semibold">Disaster Risk Management</h1>
            </div>
          </div>

          <nav className="flex items-center space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {activeTab === "Overview" && (
          <aside className="w-80 border-r bg-card p-6 space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">Information Bar</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Region</label>
                  <Select defaultValue="afar">
                    <SelectTrigger className="w-full min-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="afar">Afar</SelectItem>
                      <SelectItem value="tigray">Tigray</SelectItem>
                      <SelectItem value="amhara">Amhara</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Woreda</label>
                  <Select defaultValue="zone1">
                    <SelectTrigger className="w-full min-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zone1">Zone 1</SelectItem>
                      <SelectItem value="zone2">Zone 2</SelectItem>
                      <SelectItem value="zone3">Zone 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Drought Index</label>
                  <Select defaultValue="spi">
                    <SelectTrigger className="w-full min-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spi">SPI</SelectItem>
                      <SelectItem value="spei">SPEI</SelectItem>
                      <SelectItem value="vhi">VHI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Watch/Warn/Alert Progress Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Watch</span>
                      <span className="text-muted-foreground">Moderate</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Warn</span>
                      <span className="text-muted-foreground">High</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Alert</span>
                      <span className="text-muted-foreground">Critical</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </div>

                {/* Year Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Year</label>
                    <Badge variant="secondary">{year[0]}</Badge>
                  </div>
                  <div className="px-2">
                    <Slider value={year} onValueChange={setYear} max={2024} min={2020} step={1} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>2020</span>
                      <span>2024</span>
                    </div>
                  </div>

                  {/* Accuracy (decreases as year increases) */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Accuracy</span>
                      <span className="text-muted-foreground">{Math.round(accuracy)}%</span>
                    </div>
                    <Progress value={accuracy} className="h-2" />
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ratio: {ACCURACY_DECAY_PER_YEAR}% per year (editable in code)
                    </div>
                  </div>
                </div>

                {/* AI Model Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">AI Model Selection</label>
                  <div className="space-y-2">
                    {aiModels.map((model) => (
                      <Button
                        key={model.id}
                        variant={selectedModel === model.id ? "default" : "outline"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedModel(model.id)}
                      >
                        {model.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Drought Severity Legend */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Drought Severity Legend</label>
                  <div className="space-y-2">
                    {droughtLevels.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded ${item.color}`} />
                        <span className="text-sm">{item.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className={`flex-1 p-6 ${activeTab !== "Overview" ? "max-w-full" : ""}`}>
          {activeTab === "Overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">Drought Early Warning System</h1>
                <p className="text-muted-foreground">
                  Monitor drought conditions across regions with real-time data and historical trends. Watch for early
                  indicators. Warn for potential risks and historical trends. Alert for immediate action required.
                </p>
              </div>

              {/* Map */}
              <CardContent className="p-0">
                <DroughtMap />
              </CardContent>

              {/* Key Metrics */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Average Drought Severity Index
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2.5</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Area Affected by Severe Drought
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">45%</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Population at Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12M</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Historical Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Drought Index</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Drought Severity Index Over Time</span>
                    <Badge variant="secondary">2.5</Badge>
                    <span className="text-green-600">2020-2024 +10%</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <HistoricalChart />
                </CardContent>
              </Card>

              {/* Regional Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Regional Drought Severity Comparison</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    <span>Drought Severity by Region</span>
                    <div className="mt-1">
                      <Badge variant="secondary">2.5</Badge>
                      <span className="ml-2">Current 15%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RegionalComparison />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "Data" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Data Management</h1>
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Satellite Imagery</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Weather Stations</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Ground Sensors</span>
                        <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                          Offline
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Completeness</span>
                          <span>95%</span>
                        </div>
                        <Progress value={95} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Accuracy</span>
                          <span>88%</span>
                        </div>
                        <Progress value={88} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "Reports" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Drought Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Comprehensive analysis of drought conditions across all monitored regions.
                    </p>
                    <Button>Download Report</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>High Risk Areas</span>
                        <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                          3 Regions
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Medium Risk Areas</span>
                        <Badge variant="secondary">5 Regions</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Low Risk Areas</span>
                        <Badge variant="secondary">8 Regions</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "Alerts" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Active Alerts</h1>
              <div className="space-y-4">
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <CardHeader>
                    <CardTitle className="text-red-800 dark:text-red-200">Critical Drought Alert</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-red-700 dark:text-red-300">
                      Severe drought conditions detected in Afar Region Zone 1. Immediate intervention required.
                    </p>
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">Issued: 2 hours ago</div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <CardHeader>
                    <CardTitle className="text-orange-800 dark:text-orange-200">Warning Alert</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-700 dark:text-orange-300">
                      Moderate drought conditions developing in Tigray Region. Monitor closely.
                    </p>
                    <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">Issued: 6 hours ago</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

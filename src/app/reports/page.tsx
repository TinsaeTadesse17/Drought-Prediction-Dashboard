import ReportsPanel from '@/components/reports-panel'

export const dynamic = 'force-dynamic'

export default function ReportsPage(){
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <ReportsPanel />
      </main>
    </div>
  )
}

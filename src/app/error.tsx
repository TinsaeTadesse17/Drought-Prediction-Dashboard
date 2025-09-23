'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold">Error</h1>
        <p className="text-muted-foreground">{error.message || 'An unexpected error occurred.'}</p>
        <button
          className="mt-3 inline-flex items-center rounded bg-primary px-3 py-1.5 text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  )
}

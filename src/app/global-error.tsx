"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">An unexpected error occurred. Please try again later.</p>
        {error?.digest ? (
          <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}

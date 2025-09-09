export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">The page you’re looking for doesn’t exist.</p>
      </div>
    </main>
  );
}

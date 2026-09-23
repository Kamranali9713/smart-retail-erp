export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl font-bold">404</div>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The requested ERP page does not exist.</p>
        <a href="/dashboard" className="inline-block mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Go to dashboard</a>
      </div>
    </div>
  );
}

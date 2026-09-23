import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="text-5xl font-bold text-destructive mb-4">403</div>

        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>

        <p className="text-muted-foreground mb-6">
          You do not have permission to access this page.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

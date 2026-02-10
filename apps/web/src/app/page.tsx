export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-5xl font-bold text-center mb-6">
          AusGrant-Automate
        </h1>
        <p className="text-xl text-center text-muted-foreground mb-12">
          AI-Powered Tender & Grant Engine for Australian Government Opportunities
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">🔍 The Scout</h2>
            <p className="text-muted-foreground">
              Aggregates tenders and grants from Federal, State, and Local government portals.
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">✍️ The Veteran</h2>
            <p className="text-muted-foreground">
              AI writer with 30+ years of experience crafting compelling grant applications.
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">🚀 The Closer</h2>
            <p className="text-muted-foreground">
              Automated form filling and submission with human-in-the-loop verification.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

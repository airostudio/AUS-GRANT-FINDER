import { GrantWizard } from '@/components/grant-wizard';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col p-8 md:p-16">
      {/* Header */}
      <div className="max-w-6xl w-full mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
          AusGrant-Automate
        </h1>
        <p className="text-lg md:text-xl text-center text-muted-foreground mb-8">
          AI-Powered Tender & Grant Engine for Australian Government Opportunities
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="px-4 py-2 bg-accent rounded-full text-sm font-medium">
            🔍 The Scout - Aggregates Opportunities
          </div>
          <div className="px-4 py-2 bg-accent rounded-full text-sm font-medium">
            ✍️ The Veteran - AI Grant Writer
          </div>
          <div className="px-4 py-2 bg-accent rounded-full text-sm font-medium">
            🚀 The Closer - Automated Submission
          </div>
        </div>
      </div>

      {/* Wizard */}
      <div className="flex-1">
        <GrantWizard />
      </div>
    </main>
  );
}

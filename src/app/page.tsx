import Link from "next/link";
import { Zap, Clock, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Transcript Invoicer
          </h1>
          <p className="text-muted-foreground mt-2">
            Convert consulting transcripts into billable invoices in seconds.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-left">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <FileText className="w-4 h-4 text-accent mb-2" />
            <p className="text-xs font-medium">Paste transcript</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <Zap className="w-4 h-4 text-accent mb-2" />
            <p className="text-xs font-medium">AI analyzes</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <Clock className="w-4 h-4 text-accent mb-2" />
            <p className="text-xs font-medium">Invoice ready</p>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

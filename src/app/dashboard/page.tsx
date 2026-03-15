"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Plus, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TranscriptForm } from "@/components/transcript-form";
import { AnalysisResults } from "@/components/analysis-results";
import { SessionList } from "@/components/session-list";
import type { AnalysisResult } from "@/types";

type View = "dashboard" | "create" | "results";

export default function DashboardPage() {
  const [view, setView] = useState<View>("dashboard");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAnalysisComplete = (result: AnalysisResult, sid?: string) => {
    setAnalysisResult(result);
    setSessionId(sid || null);
    setView("results");
  };

  const handleSelectSession = (analysis: AnalysisResult, sid?: string) => {
    setAnalysisResult(analysis);
    setSessionId(sid || null);
    setView("results");
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="font-semibold text-sm">Transcript Invoicer</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">
                Invoices
              </h1>
              <Button onClick={() => setView("create")}>
                <Plus className="w-4 h-4" />
                Create Invoice
              </Button>
            </div>
            <SessionList onSelect={handleSelectSession} />
          </div>
        )}

        {view === "create" && (
          <TranscriptForm
            onAnalysisComplete={handleAnalysisComplete}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "results" && analysisResult && (
          <AnalysisResults
            result={analysisResult}
            sessionId={sessionId || undefined}
            onBack={() => setView("dashboard")}
          />
        )}
      </main>
    </div>
  );
}

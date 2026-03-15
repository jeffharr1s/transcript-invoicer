"use client";

import { useEffect, useState } from "react";
import { Clock, DollarSign, ChevronRight } from "lucide-react";
import type { AnalysisResult } from "@/types";

interface SessionSummary {
  id: string;
  client_name: string;
  created_at: string;
  analysis_json: AnalysisResult | null;
}

interface SessionListProps {
  onSelect: (analysis: AnalysisResult, sessionId?: string) => void;
}

export function SessionList({ onSelect }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No invoices yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => session.analysis_json && onSelect(session.analysis_json, session.id)}
          disabled={!session.analysis_json}
          className="w-full flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left cursor-pointer disabled:opacity-50"
        >
          <div>
            <p className="font-medium">{session.client_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(session.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          {session.analysis_json && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.analysis_json.invoice.total_hours} hrs
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  {session.analysis_json.invoice.total_amount.toFixed(2)}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

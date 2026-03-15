"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Zap, ArrowLeft, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult, Client } from "@/types";

interface TranscriptFormProps {
  onAnalysisComplete: (result: AnalysisResult, sessionId?: string) => void;
  onBack: () => void;
}

export function TranscriptForm({ onAnalysisComplete, onBack }: TranscriptFormProps) {
  const [transcript, setTranscript] = useState("");
  const [clientName, setClientName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("175");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client dropdown state
  const [clients, setClients] = useState<Client[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.data || []))
      .catch(() => {});
  }, []);

  // Filter clients as user types
  useEffect(() => {
    if (clientName.trim()) {
      const filtered = clients.filter((c) =>
        c.client_name.toLowerCase().includes(clientName.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientName, clients]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectClient = (client: Client) => {
    setClientName(client.client_name);
    if (client.default_rate) {
      setHourlyRate(String(client.default_rate));
    }
    setShowDropdown(false);
  };

  const saveNewClient = async () => {
    if (!clientName.trim()) return;
    const existing = clients.find(
      (c) => c.client_name.toLowerCase() === clientName.trim().toLowerCase()
    );
    if (existing) return; // Already saved

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          default_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setClients((prev) => [...prev, data.data]);
      }
    } catch {
      // Silent fail — not critical
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTranscript(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "text/markdown": [".md"] },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (!transcript.trim() || !clientName.trim() || !hourlyRate) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    // Auto-save client if new
    await saveNewClient();

    try {
      const res = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          client_name: clientName.trim(),
          hourly_rate: parseFloat(hourlyRate),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      onAnalysisComplete(data.data, data.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isNewClient =
    clientName.trim() &&
    !clients.some(
      (c) => c.client_name.toLowerCase() === clientName.trim().toLowerCase()
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Invoice
          </h1>
          <p className="text-muted-foreground mt-1">
            Paste or upload a consulting session transcript
          </p>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium mb-1.5">
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type or select a client"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {isNewClient && (
            <span className="absolute right-3 top-9 text-xs text-accent flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New
            </span>
          )}

          {/* Dropdown */}
          {showDropdown && filteredClients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="font-medium">{client.client_name}</span>
                  {client.default_rate && (
                    <span className="text-muted-foreground ml-2">
                      ${client.default_rate}/hr
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Hourly Rate ($)
          </label>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            min="0"
            step="25"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* File Upload */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-accent bg-accent-light"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop the transcript file here"
            : "Drag & drop a .txt or .md file, or click to browse"}
        </p>
      </div>

      {/* Transcript Textarea */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium">Transcript</label>
          {transcript && (
            <span className="text-xs text-muted-foreground">
              ({transcript.length.toLocaleString()} chars)
            </span>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          placeholder="Paste your consulting session transcript here..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        loading={loading}
        size="lg"
        className="w-full"
      >
        <Zap className="w-4 h-4" />
        {loading ? "Analyzing Transcript..." : "Generate Invoice"}
      </Button>
    </div>
  );
}

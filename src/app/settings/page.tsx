"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setProfile(d.data);
          setCompanyName(d.data.company_name || "");
          setDefaultRate(String(d.data.default_rate || "175"));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || null,
          default_rate: defaultRate ? parseFloat(defaultRate) : 175,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="text"
            value={profile?.email || ""}
            disabled
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company LLC"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Appears on invoices
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Default Hourly Rate ($)
          </label>
          <input
            type="number"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            min="0"
            step="25"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Pre-fills the rate on new invoices
          </p>
        </div>

        <Button onClick={handleSave} loading={saving} className="w-full">
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </main>
    </div>
  );
}

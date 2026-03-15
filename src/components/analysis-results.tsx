"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  DollarSign,
  Shield,
  CheckCircle,
  Copy,
  Download,
  ArrowLeft,
  MessageSquare,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/types";

const PDFDownloadButton = dynamic(
  () => import("./pdf-download-button").then((m) => m.PDFDownloadButton),
  { ssr: false, loading: () => <Button size="sm" disabled><Download className="w-4 h-4" />Loading PDF...</Button> }
);

interface AnalysisResultsProps {
  result: AnalysisResult;
  sessionId?: string;
  onBack: () => void;
}

type Tab =
  | "timeline"
  | "billing"
  | "invoice"
  | "summary"
  | "internal";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "timeline", label: "Timeline", icon: <Clock className="w-4 h-4" /> },
  {
    id: "billing",
    label: "Billing",
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "summary",
    label: "Client Message",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: "internal",
    label: "Internal Log",
    icon: <Shield className="w-4 h-4" />,
  },
];

export function AnalysisResults({ result, sessionId, onBack }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("invoice");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadInvoiceText = () => {
    const inv = result.invoice;
    let text = `CONSULTING SERVICES INVOICE\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += `Invoice: ${inv.invoice_number}\n`;
    text += `Date: ${inv.date}\n`;
    text += `Client: ${inv.client_name}\n\n`;
    text += `${"─".repeat(50)}\n`;
    text += `SERVICE SUMMARY\n`;
    text += `${"─".repeat(50)}\n\n`;

    inv.line_items.forEach((item) => {
      text += `${item.service}\n`;
      text += `  ${item.description}\n`;
      text += `  ${item.hours} hrs × $${item.rate}/hr = $${item.amount.toFixed(2)}`;
      if (item.is_emergency) text += ` [EMERGENCY]`;
      text += `\n\n`;
    });

    text += `${"─".repeat(50)}\n`;
    text += `Total Hours: ${inv.total_hours}\n`;
    text += `Total Due: $${inv.total_amount.toFixed(2)}\n`;
    text += `${"─".repeat(50)}\n\n`;

    text += `DELIVERABLES\n`;
    result.deliverables.forEach((d) => (text += `• ${d}\n`));
    text += `\nBUSINESS IMPACT\n${inv.business_impact}\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {result.invoice.client_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {result.invoice.invoice_number} &middot;{" "}
              {result.invoice.total_hours} hrs &middot; $
              {result.invoice.total_amount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(result.client_summary)}
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy Summary"}
          </Button>
          <PDFDownloadButton result={result} sessionId={sessionId} />
          <Button variant="ghost" size="sm" onClick={downloadInvoiceText} title="Download as plain text">
            <FileText className="w-4 h-4" />
            .txt
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Hours"
          value={`${result.invoice.total_hours}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Total Due"
          value={`$${result.invoice.total_amount.toFixed(2)}`}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Deliverables"
          value={`${result.deliverables.length}`}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Risks Avoided"
          value={`${result.risks_avoided.length}`}
          icon={<Shield className="w-4 h-4" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "timeline" && <TimelineView result={result} />}
        {activeTab === "billing" && <BillingView result={result} />}
        {activeTab === "invoice" && <InvoiceView result={result} />}
        {activeTab === "summary" && (
          <SummaryView
            result={result}
            onCopy={() => copyToClipboard(result.client_summary)}
          />
        )}
        {activeTab === "internal" && <InternalLogView result={result} />}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TimelineView({ result }: { result: AnalysisResult }) {
  const categoryColors: Record<string, string> = {
    incident_intake: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    troubleshooting: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    diagnostics: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    research: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    system_configuration: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    software_upgrade: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    debugging: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    data_backup: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    verification: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    client_advisory: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  };

  return (
    <div className="space-y-3">
      {result.event_log.map((event, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 bg-muted/30 border border-border rounded-lg"
        >
          <div className="flex-shrink-0 w-16 text-xs text-muted-foreground font-mono pt-0.5">
            {event.timestamp || `Step ${i + 1}`}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  categoryColors[event.category] || "bg-gray-100 text-gray-800"
                }`}
              >
                {event.category.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-muted-foreground">
                {event.duration_minutes} min
              </span>
            </div>
            <p className="text-sm">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BillingView({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Billable Segments */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Billable Segments
        </h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">
                  Description
                </th>
                <th className="text-right px-4 py-3 font-medium">Hours</th>
                <th className="text-right px-4 py-3 font-medium">Rate</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.billable_segments.map((seg, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium">
                    {seg.service}
                    {seg.is_emergency && (
                      <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-warning" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {seg.description}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {seg.hours}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${seg.rate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    ${seg.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr>
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {result.invoice.total_hours}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right font-mono">
                  ${result.invoice.total_amount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Deliverables & Risks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-success" />
            Deliverables
          </h3>
          <ul className="space-y-2">
            {result.deliverables.map((d, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-success mt-0.5">&#8226;</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-accent" />
            Risks Avoided
          </h3>
          <ul className="space-y-2">
            {result.risks_avoided.map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-accent mt-0.5">&#8226;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InvoiceView({ result }: { result: AnalysisResult }) {
  const inv = result.invoice;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Consulting Services Invoice
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {inv.invoice_number}
        </p>
      </div>

      <div className="flex justify-between text-sm mb-8">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
            Bill To
          </p>
          <p className="font-medium">{inv.client_name}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
            Date
          </p>
          <p className="font-medium">{inv.date}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium">Service</th>
            <th className="text-right py-2 font-medium">Hours</th>
            <th className="text-right py-2 font-medium">Rate</th>
            <th className="text-right py-2 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {inv.line_items.map((item, i) => (
            <tr key={i}>
              <td className="py-3">
                <p className="font-medium">{item.service}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </td>
              <td className="py-3 text-right font-mono">{item.hours}</td>
              <td className="py-3 text-right font-mono">${item.rate}</td>
              <td className="py-3 text-right font-mono font-medium">
                ${item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-foreground pt-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Total Hours: {inv.total_hours}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Total Due
          </p>
          <p className="text-3xl font-semibold">
            ${inv.total_amount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Business Impact */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Business Impact
        </h3>
        <p className="text-sm">{inv.business_impact}</p>
      </div>

      {/* Deliverables */}
      <div className="mt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Deliverables
        </h3>
        <ul className="text-sm space-y-1">
          {result.deliverables.map((d, i) => (
            <li key={i}>&#8226; {d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryView({
  result,
  onCopy,
}: {
  result: AnalysisResult;
  onCopy: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h3 className="font-medium">Client Text Message</h3>
        </div>
        <div className="bg-accent/10 rounded-xl p-4 mb-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {result.client_summary}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          <Copy className="w-4 h-4" />
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}

function InternalLogView({ result }: { result: AnalysisResult }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Internal Time Log
      </h3>
      <div className="bg-muted/30 border border-border rounded-lg p-6">
        <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
          {result.internal_log}
        </pre>
      </div>
    </div>
  );
}

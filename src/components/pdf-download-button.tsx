"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Cloud, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePDF } from "./invoice-pdf";
import type { AnalysisResult } from "@/types";

interface PDFDownloadButtonProps {
  result: AnalysisResult;
  sessionId?: string;
}

export function PDFDownloadButton({ result, sessionId }: PDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<InvoicePDF result={result} />).toBlob();

      // Download locally
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Upload to cloud storage in background (if session exists)
      if (sessionId) {
        uploadToStorage(blob, sessionId);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const uploadToStorage = async (blob: Blob, sid: string) => {
    try {
      const formData = new FormData();
      formData.append("file", blob, `${result.invoice.invoice_number}.pdf`);
      formData.append("session_id", sid);

      const res = await fetch("/api/invoices/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploaded(true);
      }
    } catch {
      // Non-critical — PDF was already downloaded locally
    }
  };

  return (
    <Button size="sm" onClick={handleDownload} loading={generating}>
      {uploaded ? (
        <Check className="w-4 h-4" />
      ) : generating ? (
        <Cloud className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {generating ? "Generating..." : uploaded ? "Downloaded & Saved" : "Download PDF"}
    </Button>
  );
}

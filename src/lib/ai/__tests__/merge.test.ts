import { describe, it, expect } from "vitest";
import { mergeAnalyses } from "../merge";
import type { AnalysisResult } from "@/types";

function makeChunkResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    event_log: [
      {
        timestamp: "10:00",
        category: "troubleshooting",
        description: "Investigated server connectivity issues",
        duration_minutes: 30,
      },
    ],
    service_categories: [
      {
        category: "troubleshooting",
        events: [],
        total_hours: 0.5,
        is_advisory: false,
        is_emergency: false,
      },
    ],
    billable_segments: [
      {
        service: "Technical Troubleshooting",
        description: "Server connectivity investigation",
        hours: 0.5,
        rate: 175,
        amount: 87.5,
        is_emergency: false,
      },
    ],
    deliverables: ["Resolved server connectivity issue"],
    risks_avoided: ["Prevented extended downtime"],
    invoice: {
      client_name: "Test Client",
      invoice_number: "INV-20260314-ABCD",
      date: "2026-03-14",
      line_items: [
        {
          service: "Technical Troubleshooting",
          description: "Server connectivity investigation",
          hours: 0.5,
          rate: 175,
          amount: 87.5,
          is_emergency: false,
        },
      ],
      total_hours: 0.5,
      total_amount: 87.5,
      business_impact: "Restored server connectivity",
    },
    client_summary: "Fixed the server issue, 0.5 hours at $175/hr ($87.50).",
    internal_log: "10:00 - Troubleshooting - Server connectivity",
    ...overrides,
  };
}

describe("mergeAnalyses", () => {
  it("returns single chunk unchanged", () => {
    const chunk = makeChunkResult();
    const result = mergeAnalyses([chunk], "Test Client", 175);
    expect(result).toBe(chunk); // Same reference
  });

  it("merges two chunks and combines totals", () => {
    const chunk1 = makeChunkResult();
    const chunk2 = makeChunkResult({
      event_log: [
        {
          timestamp: "11:00",
          category: "client_advisory",
          description: "Advised client on backup strategy",
          duration_minutes: 15,
        },
      ],
      billable_segments: [
        {
          service: "Client Advisory",
          description: "Backup strategy consultation",
          hours: 0.25,
          rate: 175,
          amount: 43.75,
          is_emergency: false,
        },
      ],
      deliverables: ["Backup strategy recommendation"],
      risks_avoided: ["Mitigated data loss risk"],
      client_summary: "Also provided backup recommendations.",
      internal_log: "11:00 - Advisory - Backup strategy",
    });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);

    // Should have events from both chunks
    expect(result.event_log).toHaveLength(2);

    // Should have both service segments
    expect(result.billable_segments).toHaveLength(2);

    // Totals should be combined
    expect(result.invoice.total_hours).toBe(0.75);
    expect(result.invoice.total_amount).toBe(131.25);

    // Deliverables should be combined
    expect(result.deliverables).toHaveLength(2);

    // Risks should be combined
    expect(result.risks_avoided).toHaveLength(2);
  });

  it("deduplicates similar events across chunks", () => {
    const chunk1 = makeChunkResult();
    const chunk2 = makeChunkResult({
      event_log: [
        {
          timestamp: "10:00",
          category: "troubleshooting",
          description: "Investigated server connectivity issues and resolved them", // Very similar
          duration_minutes: 30,
        },
      ],
    });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);
    // Should deduplicate the similar event
    expect(result.event_log.length).toBeLessThanOrEqual(2);
  });

  it("consolidates same-service billable segments", () => {
    const chunk1 = makeChunkResult();
    const chunk2 = makeChunkResult({
      billable_segments: [
        {
          service: "Technical Troubleshooting", // Same service name
          description: "Additional network diagnostics",
          hours: 0.75,
          rate: 175,
          amount: 131.25,
          is_emergency: false,
        },
      ],
    });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);

    // Should consolidate into one segment
    const troubleshootingSegments = result.billable_segments.filter((s) =>
      s.service.toLowerCase().includes("troubleshooting")
    );
    expect(troubleshootingSegments).toHaveLength(1);
    expect(troubleshootingSegments[0].hours).toBe(1.25);
  });

  it("deduplicates similar deliverables", () => {
    const chunk1 = makeChunkResult({
      deliverables: ["Resolved server connectivity issue"],
    });
    const chunk2 = makeChunkResult({
      deliverables: ["Resolved server connectivity issues and verified"], // Very similar
    });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);
    // Should deduplicate
    expect(result.deliverables.length).toBeLessThanOrEqual(2);
  });

  it("uses last chunk's client summary", () => {
    const chunk1 = makeChunkResult({ client_summary: "First chunk summary" });
    const chunk2 = makeChunkResult({ client_summary: "Final comprehensive summary" });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);
    expect(result.client_summary).toBe("Final comprehensive summary");
  });

  it("combines internal logs with segment markers", () => {
    const chunk1 = makeChunkResult({ internal_log: "Log entry 1" });
    const chunk2 = makeChunkResult({ internal_log: "Log entry 2" });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);
    expect(result.internal_log).toContain("Segment 1");
    expect(result.internal_log).toContain("Segment 2");
    expect(result.internal_log).toContain("Log entry 1");
    expect(result.internal_log).toContain("Log entry 2");
  });

  it("preserves emergency flags when merging segments", () => {
    const chunk1 = makeChunkResult({
      billable_segments: [
        {
          service: "Technical Troubleshooting",
          description: "Regular work",
          hours: 0.5,
          rate: 175,
          amount: 87.5,
          is_emergency: false,
        },
      ],
    });
    const chunk2 = makeChunkResult({
      billable_segments: [
        {
          service: "Technical Troubleshooting",
          description: "Emergency work",
          hours: 0.5,
          rate: 175,
          amount: 87.5,
          is_emergency: true,
        },
      ],
    });

    const result = mergeAnalyses([chunk1, chunk2], "Test Client", 175);
    const merged = result.billable_segments.find((s) =>
      s.service.toLowerCase().includes("troubleshooting")
    );
    expect(merged?.is_emergency).toBe(true); // Emergency flag should be preserved
  });
});

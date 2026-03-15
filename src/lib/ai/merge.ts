import type { AnalysisResult, ConsultingEvent, BillableSegment, ServiceCategory } from "@/types";

/**
 * Merges multiple chunk analysis results into a single cohesive result.
 *
 * Handles:
 * - Deduplicating similar events across chunk boundaries
 * - Consolidating billable segments by service category
 * - Recalculating totals
 * - Combining deliverables, risks, summaries, and logs
 */
export function mergeAnalyses(
  chunks: AnalysisResult[],
  clientName: string,
  hourlyRate: number
): AnalysisResult {
  if (chunks.length === 1) return chunks[0];

  // 1. Merge event logs — deduplicate events with very similar descriptions
  const allEvents: ConsultingEvent[] = [];
  for (const chunk of chunks) {
    for (const event of chunk.event_log) {
      const isDuplicate = allEvents.some(
        (existing) =>
          existing.category === event.category &&
          similarity(existing.description, event.description) > 0.7
      );
      if (!isDuplicate) {
        allEvents.push(event);
      }
    }
  }

  // 2. Consolidate billable segments by service name
  const segmentMap = new Map<string, BillableSegment>();
  for (const chunk of chunks) {
    for (const seg of chunk.billable_segments) {
      const key = normalizeServiceName(seg.service);
      const existing = segmentMap.get(key);
      if (existing) {
        existing.hours = roundToQuarter(existing.hours + seg.hours);
        existing.amount = existing.hours * hourlyRate;
        existing.is_emergency = existing.is_emergency || seg.is_emergency;
        // Append description if meaningfully different
        if (similarity(existing.description, seg.description) < 0.6) {
          existing.description = `${existing.description}; ${seg.description}`;
        }
      } else {
        segmentMap.set(key, { ...seg, rate: hourlyRate });
      }
    }
  }
  const billableSegments = Array.from(segmentMap.values());

  // Recalculate amounts
  for (const seg of billableSegments) {
    seg.amount = seg.hours * seg.rate;
  }

  // 3. Rebuild service categories from merged events
  const categoryMap = new Map<string, ServiceCategory>();
  for (const event of allEvents) {
    const key = event.category;
    const existing = categoryMap.get(key);
    if (existing) {
      existing.events.push(event);
      existing.total_hours = roundToQuarter(
        existing.total_hours + event.duration_minutes / 60
      );
    } else {
      categoryMap.set(key, {
        category: event.category.replace(/_/g, " "),
        events: [event],
        total_hours: roundToQuarter(event.duration_minutes / 60),
        is_advisory: event.category === "client_advisory",
        is_emergency: false,
      });
    }
  }
  const serviceCategories = Array.from(categoryMap.values());

  // 4. Deduplicate deliverables and risks
  const deliverables = deduplicateStrings(
    chunks.flatMap((c) => c.deliverables)
  );
  const risksAvoided = deduplicateStrings(
    chunks.flatMap((c) => c.risks_avoided)
  );

  // 5. Totals
  const totalHours = billableSegments.reduce((sum, s) => sum + s.hours, 0);
  const totalAmount = billableSegments.reduce((sum, s) => sum + s.amount, 0);

  // 6. Use the first chunk's invoice metadata, but with merged data
  const baseInvoice = chunks[0].invoice;

  // 7. Combine internal logs
  const internalLog = chunks
    .map((c, i) => `--- Segment ${i + 1} ---\n${c.internal_log}`)
    .join("\n\n");

  // 8. Pick the longest/best client summary (from the last chunk, which has the most context)
  const clientSummary = chunks[chunks.length - 1].client_summary;

  // 9. Combine business impact statements
  const businessImpacts = chunks
    .map((c) => c.invoice.business_impact)
    .filter((b, i, arr) => arr.indexOf(b) === i);
  const businessImpact = businessImpacts.join(" ");

  return {
    event_log: allEvents,
    service_categories: serviceCategories,
    billable_segments: billableSegments,
    deliverables,
    risks_avoided: risksAvoided,
    invoice: {
      client_name: clientName,
      invoice_number: baseInvoice.invoice_number,
      date: baseInvoice.date,
      line_items: billableSegments,
      total_hours: totalHours,
      total_amount: totalAmount,
      business_impact: businessImpact,
    },
    client_summary: clientSummary,
    internal_log: internalLog,
  };
}

/** Round to nearest 0.25 */
function roundToQuarter(n: number): number {
  return Math.ceil(n * 4) / 4;
}

/** Normalize service names for grouping ("Emergency Troubleshooting" ≈ "emergency troubleshooting") */
function normalizeServiceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Simple word-overlap similarity (0-1) for deduplication */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/** Remove near-duplicate strings from an array */
function deduplicateStrings(arr: string[]): string[] {
  const result: string[] = [];
  for (const item of arr) {
    const isDuplicate = result.some(
      (existing) => similarity(existing, item) > 0.6
    );
    if (!isDuplicate) {
      result.push(item);
    }
  }
  return result;
}

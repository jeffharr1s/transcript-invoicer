import { logger } from "@/lib/logger";

/**
 * Lightweight analytics tracker.
 * Logs events as structured JSON — pipe to any analytics service
 * (Posthog, Mixpanel, Amplitude) by adding an HTTP call here.
 *
 * All events are fire-and-forget — never block the request.
 */

interface AnalyticsEvent {
  event: string;
  userId?: string;
  properties?: Record<string, unknown>;
}

const events: AnalyticsEvent[] = [];

export function track(
  event: string,
  userId?: string,
  properties?: Record<string, unknown>
) {
  const entry: AnalyticsEvent = { event, userId, properties };
  events.push(entry);

  logger.info("analytics", {
    event,
    userId,
    ...properties,
  });

  // In production, send to your analytics provider:
  // sendToPosthog(entry).catch(() => {});
}

/** Pre-defined events */
export const Events = {
  INVOICE_GENERATED: "invoice_generated",
  INVOICE_PDF_DOWNLOADED: "invoice_pdf_downloaded",
  INVOICE_PDF_UPLOADED: "invoice_pdf_uploaded",
  TRANSCRIPT_ANALYZED: "transcript_analyzed",
  CLIENT_CREATED: "client_created",
  USER_SIGNED_UP: "user_signed_up",
  USER_SIGNED_IN: "user_signed_in",
  USAGE_LIMIT_HIT: "usage_limit_hit",
  RATE_LIMIT_HIT: "rate_limit_hit",
  API_ERROR: "api_error",
} as const;

/** Get all tracked events (for debugging) */
export function getEvents(): readonly AnalyticsEvent[] {
  return events;
}

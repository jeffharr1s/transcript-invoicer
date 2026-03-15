import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript } from "@/lib/ai/analyze";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { analyzeRequestSchema } from "@/lib/validation";
import { analysisLimiter } from "@/lib/rate-limit";
import { checkUsage } from "@/lib/usage";
import { track, Events } from "@/lib/analytics";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  // Rate limit check
  const rateCheck = analysisLimiter.check(userId);
  if (!rateCheck.allowed) {
    track(Events.RATE_LIMIT_HIT, userId, { endpoint: "analyze-transcript" });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateCheck.resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Usage limit check
  const usageCheck = await checkUsage(userId);
  if (!usageCheck.allowed) {
    track(Events.USAGE_LIMIT_HIT, userId, {
      used: usageCheck.used,
      limit: usageCheck.limit,
    });
    return NextResponse.json(
      {
        error: usageCheck.message,
        usage: { used: usageCheck.used, limit: usageCheck.limit },
      },
      { status: 403 }
    );
  }

  // Validate input
  const body = await request.json();
  const { transcript, client_name, hourly_rate } = analyzeRequestSchema.parse(body);

  logger.info("analysis_started", {
    userId,
    clientName: client_name,
    transcriptLength: transcript.length,
    hourlyRate: hourly_rate,
  });

  const startTime = Date.now();

  // Run AI analysis
  const analysis = await analyzeTranscript(transcript, client_name, hourly_rate);

  const durationMs = Date.now() - startTime;
  logger.info("analysis_completed", {
    userId,
    clientName: client_name,
    totalHours: analysis.invoice.total_hours,
    totalAmount: analysis.invoice.total_amount,
    eventCount: analysis.event_log.length,
    durationMs,
  });

  // Save session
  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      client_name,
      transcript,
      analysis_json: analysis,
    })
    .select()
    .single();

  if (sessionError) {
    logger.error("session_save_failed", { userId, error: sessionError.message });
  }

  // Save invoice record
  if (session) {
    const { error: invoiceError } = await supabase.from("invoices").insert({
      session_id: session.id,
      total_hours: analysis.invoice.total_hours,
      hourly_rate,
      total_amount: analysis.invoice.total_amount,
    });

    if (invoiceError) {
      logger.error("invoice_save_failed", { userId, error: invoiceError.message });
    }
  }

  track(Events.INVOICE_GENERATED, userId, {
    clientName: client_name,
    totalHours: analysis.invoice.total_hours,
    totalAmount: analysis.invoice.total_amount,
    durationMs,
  });

  return NextResponse.json(
    {
      success: true,
      data: analysis,
      session_id: session?.id || null,
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    }
  );
});

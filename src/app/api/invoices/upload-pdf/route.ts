import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { apiLimiter } from "@/lib/rate-limit";
import { track, Events } from "@/lib/analytics";
import { logger } from "@/lib/logger";

/** Max PDF size: 10MB */
const MAX_PDF_SIZE = 10 * 1024 * 1024;

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("session_id") as string | null;

  if (!file || !sessionId) {
    return NextResponse.json(
      { error: "Missing file or session_id" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_PDF_SIZE) {
    return NextResponse.json(
      { error: "PDF file too large (max 10MB)" },
      { status: 400 }
    );
  }

  // Validate file type
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 }
    );
  }

  // Verify session belongs to user
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Upload PDF to Supabase Storage
  const fileName = `${userId}/${sessionId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(fileName, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    logger.error("pdf_upload_failed", {
      userId,
      sessionId,
      error: uploadError.message,
    });
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("invoices")
    .getPublicUrl(fileName);

  const pdfUrl = urlData.publicUrl;

  // Update invoice record with PDF URL
  const { error: updateError } = await supabase
    .from("invoices")
    .update({ invoice_pdf_url: pdfUrl })
    .eq("session_id", sessionId);

  if (updateError) {
    logger.error("invoice_url_update_failed", {
      userId,
      sessionId,
      error: updateError.message,
    });
  }

  track(Events.INVOICE_PDF_UPLOADED, userId, { sessionId });

  return NextResponse.json({ url: pdfUrl });
});

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Usage limits per user per calendar month.
 * Enforced server-side before AI calls.
 */
export const USAGE_LIMITS = {
  /** Max invoice generations per month (free tier) */
  maxInvoicesPerMonth: 50,
  /** Max transcript characters per single request */
  maxTranscriptChars: 300_000,
} as const;

interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number;
  message?: string;
}

/**
 * Check if a user has remaining invoice generations this month.
 */
export async function checkUsage(userId: string): Promise<UsageCheck> {
  const supabase = await createClient();

  // Count invoices created this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) {
    logger.error("Usage check failed", { userId, error: error.message });
    // Fail open — don't block users if the check fails
    return { allowed: true, used: 0, limit: USAGE_LIMITS.maxInvoicesPerMonth };
  }

  const used = count || 0;
  const allowed = used < USAGE_LIMITS.maxInvoicesPerMonth;

  if (!allowed) {
    logger.warn("User hit monthly usage limit", { userId, used });
  }

  return {
    allowed,
    used,
    limit: USAGE_LIMITS.maxInvoicesPerMonth,
    message: allowed
      ? undefined
      : `Monthly limit reached (${used}/${USAGE_LIMITS.maxInvoicesPerMonth} invoices). Resets on the 1st.`,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { apiLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid session ID"),
});

export const GET = withAuth(
  async (
    _request: NextRequest,
    userId: string,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const rateCheck = apiLimiter.check(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rawParams = context?.params ? await context.params : {};
    const { id } = paramsSchema.parse(rawParams);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  }
);

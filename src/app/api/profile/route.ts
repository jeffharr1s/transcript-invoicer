import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { apiLimiter } from "@/lib/rate-limit";
import { updateProfileSchema } from "@/lib/validation";

export const GET = withAuth(async (_request, userId) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const PATCH = withAuth(async (request: NextRequest, userId: string) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const updates = updateProfileSchema.parse(body);

  // Only include fields that were actually sent
  const allowed: Record<string, unknown> = {};
  if (updates.company_name !== undefined) allowed.company_name = updates.company_name;
  if (updates.default_rate !== undefined) allowed.default_rate = updates.default_rate;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .update(allowed)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

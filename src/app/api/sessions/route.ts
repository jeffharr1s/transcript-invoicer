import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { apiLimiter } from "@/lib/rate-limit";

export const GET = withAuth(async (_request, userId) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, client_name, created_at, analysis_json")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api-helpers";
import { apiLimiter } from "@/lib/rate-limit";
import { createClientSchema } from "@/lib/validation";
import { track, Events } from "@/lib/analytics";

export const GET = withAuth(async (_request, userId) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, client_name, default_rate")
    .eq("user_id", userId)
    .order("client_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const rateCheck = apiLimiter.check(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const { client_name, default_rate } = createClientSchema.parse(body);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      client_name,
      default_rate: default_rate || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  track(Events.CLIENT_CREATED, userId, { clientName: client_name });

  return NextResponse.json({ data });
});

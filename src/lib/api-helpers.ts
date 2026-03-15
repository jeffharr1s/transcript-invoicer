import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { track, Events } from "@/lib/analytics";

/**
 * Wraps an API route handler with:
 * - Authentication check
 * - Error handling (Zod, OpenAI, generic)
 * - Structured logging
 * - Request timing
 */
export function withAuth(
  handler: (
    request: NextRequest,
    userId: string,
    context?: { params?: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const start = Date.now();
    const path = request.nextUrl.pathname;
    const method = request.method;

    try {
      // Auth check
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Run the handler
      const response = await handler(request, user.id, context);

      // Log successful request
      logger.info("api_request", {
        method,
        path,
        userId: user.id,
        status: response.status,
        durationMs: Date.now() - start,
      });

      return response;
    } catch (error) {
      return handleApiError(error, path, method, Date.now() - start);
    }
  };
}

/**
 * Centralized error handler that returns appropriate HTTP responses
 * for different error types.
 */
export function handleApiError(
  error: unknown,
  path: string,
  method: string,
  durationMs: number
): NextResponse {
  // Zod validation errors → 400
  if (error instanceof ZodError) {
    const messages = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    logger.warn("validation_error", { path, method, errors: messages });
    return NextResponse.json(
      {
        error: "Validation failed",
        details: messages,
      },
      { status: 400 }
    );
  }

  // OpenAI API errors
  if (error instanceof Error && error.constructor.name === "APIError") {
    const apiError = error as Error & { status?: number; code?: string };
    logger.error("openai_error", {
      path,
      method,
      status: apiError.status,
      code: apiError.code,
      message: apiError.message,
      durationMs,
    });

    if (apiError.status === 429) {
      return NextResponse.json(
        { error: "AI service is temporarily overloaded. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (apiError.status === 401) {
      return NextResponse.json(
        { error: "AI service configuration error. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }

  // JSON parse errors (AI returned invalid JSON)
  if (error instanceof SyntaxError && error.message.includes("JSON")) {
    logger.error("json_parse_error", {
      path,
      method,
      message: error.message,
      durationMs,
    });
    return NextResponse.json(
      { error: "AI returned an invalid response. Please try again." },
      { status: 502 }
    );
  }

  // Generic errors
  const message = error instanceof Error ? error.message : "Internal server error";
  logger.error("unhandled_error", {
    path,
    method,
    message,
    stack: error instanceof Error ? error.stack : undefined,
    durationMs,
  });

  track(Events.API_ERROR, undefined, { path, method, message });

  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

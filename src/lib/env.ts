import { z } from "zod";

/**
 * Validates all required environment variables at startup.
 * Throws immediately if any are missing — fail fast, not at runtime.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or too short"),
  OPENAI_API_KEY: z
    .string()
    .startsWith("sk-", "OPENAI_API_KEY must start with sk-"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${errors}`);
  }

  _env = parsed.data;
  return _env;
}

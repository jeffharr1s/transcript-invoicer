import { z } from "zod";

/** Max transcript length: ~50,000 words ≈ 300KB of text */
const MAX_TRANSCRIPT_LENGTH = 300_000;

/** Max client name length */
const MAX_CLIENT_NAME_LENGTH = 200;

/** Analyze transcript request */
export const analyzeRequestSchema = z.object({
  transcript: z
    .string()
    .min(50, "Transcript must be at least 50 characters")
    .max(MAX_TRANSCRIPT_LENGTH, `Transcript exceeds maximum length of ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters`),
  client_name: z
    .string()
    .min(1, "Client name is required")
    .max(MAX_CLIENT_NAME_LENGTH, "Client name is too long")
    .trim(),
  hourly_rate: z
    .number()
    .min(1, "Hourly rate must be at least $1")
    .max(10_000, "Hourly rate cannot exceed $10,000"),
});

/** Create client request */
export const createClientSchema = z.object({
  client_name: z
    .string()
    .min(1, "Client name is required")
    .max(MAX_CLIENT_NAME_LENGTH, "Client name is too long")
    .trim(),
  default_rate: z
    .number()
    .min(0)
    .max(10_000)
    .nullable()
    .optional(),
});

/** Update profile request */
export const updateProfileSchema = z.object({
  company_name: z
    .string()
    .max(200, "Company name is too long")
    .nullable()
    .optional(),
  default_rate: z
    .number()
    .min(0)
    .max(10_000)
    .nullable()
    .optional(),
});

/** Upload PDF request validation */
export const uploadPdfSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type CreateClientRequest = z.infer<typeof createClientSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

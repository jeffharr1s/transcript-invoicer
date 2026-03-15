import OpenAI from "openai";
import { buildPrompt } from "./prompt";
import { chunkTranscript } from "./chunker";
import { mergeAnalyses } from "./merge";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AnalysisResult } from "@/types";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const env = getEnv();
    _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _openai;
}

/** Analyze a single chunk of transcript with retry on transient failures */
async function analyzeChunk(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
  clientName: string,
  hourlyRate: number,
  retries = 2
): Promise<AnalysisResult> {
  const { system, user } = buildPrompt(chunkText, clientName, hourlyRate);

  const chunkContext =
    totalChunks > 1
      ? `\n\nNote: This is segment ${chunkIndex + 1} of ${totalChunks} from a longer session. Analyze only the work described in this segment. Do not assume or invent events not present in the text.`
      : "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user + chunkContext },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`Empty AI response for chunk ${chunkIndex + 1}`);
      }

      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const result = JSON.parse(jsonStr) as AnalysisResult;

      logger.debug("chunk_analyzed", {
        chunkIndex,
        totalChunks,
        attempt,
        eventCount: result.event_log?.length || 0,
        tokensUsed: response.usage?.total_tokens,
      });

      return result;
    } catch (error) {
      const isRetryable =
        error instanceof Error &&
        (error.message.includes("timeout") ||
          error.message.includes("rate_limit") ||
          error.message.includes("overloaded") ||
          error.message.includes("500") ||
          error.message.includes("503"));

      if (isRetryable && attempt < retries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        logger.warn("chunk_retry", {
          chunkIndex,
          attempt,
          backoffMs,
          error: error instanceof Error ? error.message : "Unknown",
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`All retries exhausted for chunk ${chunkIndex + 1}`);
}

/** Main entry point — chunks transcript, analyzes in parallel, merges results */
export async function analyzeTranscript(
  transcript: string,
  clientName: string,
  hourlyRate: number
): Promise<AnalysisResult> {
  const chunks = chunkTranscript(transcript);

  logger.info("analysis_pipeline_start", {
    chunkCount: chunks.length,
    transcriptLength: transcript.length,
  });

  if (chunks.length === 1) {
    return analyzeChunk(chunks[0].text, 0, 1, clientName, hourlyRate);
  }

  // Long transcript — analyze all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      analyzeChunk(
        chunk.text,
        chunk.index,
        chunks.length,
        clientName,
        hourlyRate
      )
    )
  );

  const merged = mergeAnalyses(chunkResults, clientName, hourlyRate);

  logger.info("analysis_pipeline_complete", {
    chunkCount: chunks.length,
    totalEvents: merged.event_log.length,
    totalHours: merged.invoice.total_hours,
  });

  return merged;
}

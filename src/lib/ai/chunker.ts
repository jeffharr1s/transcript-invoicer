/**
 * Splits a transcript into chunks at natural break points:
 * 1. Speaker changes (e.g., "John:", "[Speaker 1]:", "CLIENT:", "ME:")
 * 2. Silence/pause markers (e.g., "[pause]", "[silence]", "(long pause)", "...")
 * 3. Topic shifts (transition phrases like "moving on", "the other thing", "anyway")
 *
 * Chunks are kept under a target size while respecting natural boundaries.
 */

const MAX_CHUNK_CHARS = 6000; // ~1500 tokens, keeps each AI call focused
const MIN_CHUNK_CHARS = 500; // Don't create tiny chunks

// Speaker label patterns — matches "Name:", "[Speaker 1]:", "JOHN:", etc.
const SPEAKER_PATTERN =
  /^(?:\[?[A-Z][a-zA-Z0-9 _.-]*\]?\s*:|(?:Speaker|Participant|Host|Guest|Client|Consultant|Me|You)\s*\d*\s*:)/m;

// Silence/pause markers
const PAUSE_PATTERN =
  /^\s*(?:\[(?:pause|silence|long pause|break|inaudible)\]|\((?:pause|silence|long pause|break)\)|\.{3,}|-{3,})\s*$/im;

// Topic transition phrases (at start of a sentence)
const TOPIC_SHIFT_PATTERN =
  /(?:^|\.\s+)(?:(?:okay|alright|so|now|anyway|moving on|the (?:other|next) thing|let(?:'s| us) (?:talk|move|switch|look)|on (?:another|a different) (?:note|topic)|speaking of|by the way|also|additionally|one more thing|before I forget))/im;

interface Chunk {
  index: number;
  text: string;
  startLine: number;
  endLine: number;
}

interface BreakPoint {
  lineIndex: number;
  type: "speaker" | "pause" | "topic_shift";
  priority: number; // lower = better break point
}

export function chunkTranscript(transcript: string): Chunk[] {
  // If the transcript is short enough, return as single chunk
  if (transcript.length <= MAX_CHUNK_CHARS) {
    return [
      {
        index: 0,
        text: transcript,
        startLine: 0,
        endLine: transcript.split("\n").length - 1,
      },
    ];
  }

  const lines = transcript.split("\n");

  // Find all natural break points
  const breakPoints: BreakPoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SPEAKER_PATTERN.test(line)) {
      breakPoints.push({ lineIndex: i, type: "speaker", priority: 1 });
    } else if (PAUSE_PATTERN.test(line)) {
      breakPoints.push({ lineIndex: i, type: "pause", priority: 0 });
    } else if (TOPIC_SHIFT_PATTERN.test(line)) {
      breakPoints.push({ lineIndex: i, type: "topic_shift", priority: 2 });
    }
  }

  // If no natural breaks found, fall back to splitting by line count
  if (breakPoints.length === 0) {
    return chunkBySize(lines);
  }

  // Build chunks using break points, respecting size limits
  const chunks: Chunk[] = [];
  let currentStart = 0;
  let currentCharCount = 0;

  for (let i = 0; i < lines.length; i++) {
    currentCharCount += lines[i].length + 1; // +1 for newline

    // Check if we're at a break point and over the target size
    const isBreakPoint = breakPoints.some((bp) => bp.lineIndex === i + 1);
    const isLastLine = i === lines.length - 1;

    if (
      (isBreakPoint && currentCharCount >= MIN_CHUNK_CHARS) ||
      currentCharCount >= MAX_CHUNK_CHARS ||
      isLastLine
    ) {
      // If we're over max and not at a break point, look backward for nearest break
      let endLine = i;
      if (currentCharCount >= MAX_CHUNK_CHARS && !isBreakPoint && !isLastLine) {
        const nearestBreak = breakPoints
          .filter(
            (bp) => bp.lineIndex > currentStart && bp.lineIndex <= i
          )
          .sort((a, b) => a.priority - b.priority || b.lineIndex - a.lineIndex)
          .at(0);

        if (nearestBreak) {
          endLine = nearestBreak.lineIndex - 1;
          i = endLine; // Reset loop position
        }
      }

      const chunkText = lines.slice(currentStart, endLine + 1).join("\n");

      if (chunkText.trim().length > 0) {
        chunks.push({
          index: chunks.length,
          text: chunkText,
          startLine: currentStart,
          endLine: endLine,
        });
      }

      currentStart = endLine + 1;
      currentCharCount = 0;
    }
  }

  return chunks;
}

/** Fallback: split by approximate character count at line boundaries */
function chunkBySize(lines: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let currentStart = 0;
  let currentCharCount = 0;

  for (let i = 0; i < lines.length; i++) {
    currentCharCount += lines[i].length + 1;

    if (currentCharCount >= MAX_CHUNK_CHARS || i === lines.length - 1) {
      const chunkText = lines.slice(currentStart, i + 1).join("\n");
      if (chunkText.trim().length > 0) {
        chunks.push({
          index: chunks.length,
          text: chunkText,
          startLine: currentStart,
          endLine: i,
        });
      }
      currentStart = i + 1;
      currentCharCount = 0;
    }
  }

  return chunks;
}

export type { Chunk };

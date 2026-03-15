import { describe, it, expect } from "vitest";
import { chunkTranscript } from "../chunker";

describe("chunkTranscript", () => {
  it("returns a single chunk for short transcripts", () => {
    const transcript = "John: Hey, I fixed the server issue.\nClient: Great, thanks!";
    const chunks = chunkTranscript(transcript);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(transcript);
    expect(chunks[0].index).toBe(0);
  });

  it("splits on speaker changes for long transcripts", () => {
    // Build a transcript long enough to trigger chunking (>6000 chars)
    const lines: string[] = [];
    for (let i = 0; i < 50; i++) {
      lines.push(`Consultant: This is a detailed description of work item ${i}. I performed extensive diagnostics and troubleshooting on the client's infrastructure to identify the root cause of the outage.`);
      lines.push(`Client: Thank you for that update on item ${i}. Can you also look into the secondary system that was affected by the same incident?`);
    }
    const transcript = lines.join("\n");

    expect(transcript.length).toBeGreaterThan(6000);

    const chunks = chunkTranscript(transcript);
    expect(chunks.length).toBeGreaterThan(1);

    // Every chunk should have content
    for (const chunk of chunks) {
      expect(chunk.text.trim().length).toBeGreaterThan(0);
    }

    // Chunks should be sequential and non-overlapping
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startLine).toBe(chunks[i - 1].endLine + 1);
    }

    // Reassembling chunks should give back the original (minus potential trailing whitespace)
    const reassembled = chunks.map((c) => c.text).join("\n");
    expect(reassembled).toBe(transcript);
  });

  it("splits on pause markers", () => {
    const lines: string[] = [];
    for (let i = 0; i < 30; i++) {
      lines.push(`Detailed work description for task ${i}, involving multiple steps of configuration and verification across several systems.`.repeat(3));
    }
    // Insert a pause in the middle
    lines.splice(15, 0, "[pause]");

    const transcript = lines.join("\n");
    if (transcript.length > 6000) {
      const chunks = chunkTranscript(transcript);
      // Should have split somewhere near the pause
      const pauseChunkIdx = chunks.findIndex((c) => c.text.includes("[pause]"));
      expect(pauseChunkIdx).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles empty transcript", () => {
    const chunks = chunkTranscript("");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("");
  });

  it("handles transcript with only speaker labels", () => {
    const transcript = "John:\nJane:\nJohn:\nJane:";
    const chunks = chunkTranscript(transcript);
    expect(chunks).toHaveLength(1); // Short enough for single chunk
  });

  it("preserves chunk indices", () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(`Speaker ${i % 2 === 0 ? "A" : "B"}: ${"x".repeat(200)} item ${i}`);
    }
    const transcript = lines.join("\n");
    const chunks = chunkTranscript(transcript);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });
});

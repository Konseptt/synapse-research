import { Queue, Worker } from "bullmq";

import { config } from "@/lib/config";
import { analyzePaper, processUploadedPdf } from "@/lib/services/paper-analysis";

const connection = {
  url: config.redisUrl,
  maxRetriesPerRequest: null,
};

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue("paper-processing", { connection });
  }
  return queue;
}

export function createPaperWorker(): Worker {
  return new Worker(
    "paper-processing",
    async (job) => {
      if (job.name === "process-pdf") {
        const { paperId, bufferBase64 } = job.data as {
          paperId: string;
          bufferBase64: string;
        };
        const buffer = Buffer.from(bufferBase64, "base64");
        await processUploadedPdf(paperId, buffer);
      } else if (job.name === "analyze-paper") {
        const { paperId } = job.data as { paperId: string };
        await analyzePaper(paperId);
      }
    },
    { connection },
  );
}

export async function enqueuePdfProcessing(paperId: string, buffer: Buffer): Promise<void> {
  await getQueue().add("process-pdf", {
    paperId,
    bufferBase64: buffer.toString("base64"),
  });
}

export async function enqueueAnalysis(paperId: string): Promise<void> {
  await getQueue().add("analyze-paper", { paperId });
}

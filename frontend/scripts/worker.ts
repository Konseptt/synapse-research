import { createPaperWorker } from "@/lib/workers/paper-queue";

console.log("Synapse paper worker starting...");

const worker = createPaperWorker();

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

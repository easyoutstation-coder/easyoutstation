import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis";
import { getCronQueue, QUEUE_CRON, type CronJobData } from "./queues";
import { runDailyReminders, runPostTripReviews, runAbandonedReminders, runEscalationAlerts } from "./cronJobs";

const EVERY_HOUR_MS = 60 * 60 * 1000;

export async function startCronWorker() {
  const redis = getRedis();
  if (!redis) {
    console.log("[Cron] Redis unavailable — BullMQ cron not started (setInterval fallback active)");
    return null;
  }

  const queue = getCronQueue();
  if (!queue) return null;

  // Register repeatable jobs — idempotent, safe to call on every boot
  await queue.add("run-daily-reminders", { task: "run-daily-reminders" }, {
    repeat: { every: EVERY_HOUR_MS },
    jobId: "run-daily-reminders",
  });
  await queue.add("run-post-trip-reviews", { task: "run-post-trip-reviews" }, {
    repeat: { every: EVERY_HOUR_MS },
    jobId: "run-post-trip-reviews",
  });
  await queue.add("run-abandoned-reminders", { task: "run-abandoned-reminders" }, {
    repeat: { every: EVERY_HOUR_MS },
    jobId: "run-abandoned-reminders",
  });
  await queue.add("run-escalation-alerts", { task: "run-escalation-alerts" }, {
    repeat: { every: EVERY_HOUR_MS },
    jobId: "run-escalation-alerts",
  });

  const worker = new Worker<CronJobData>(
    QUEUE_CRON,
    async (job: Job<CronJobData>) => {
      console.log(`[Cron] Running ${job.data.task}`);
      switch (job.data.task) {
        case "run-daily-reminders":    await runDailyReminders();    break;
        case "run-post-trip-reviews":  await runPostTripReviews();   break;
        case "run-abandoned-reminders": await runAbandonedReminders(); break;
        case "run-escalation-alerts":   await runEscalationAlerts();   break;
      }
    },
    { connection: redis, concurrency: 1 }
  );

  worker.on("completed", (job) => console.log(`[Cron] ${job.data.task} completed`));
  worker.on("failed", (job, err) => console.error(`[Cron] ${job?.data.task} failed:`, err.message));
  worker.on("error", (err) => console.error("[Cron] Worker error:", err.message));

  console.log("[Cron] BullMQ cron worker started (hourly schedule registered)");
  return worker;
}

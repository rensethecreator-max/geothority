import { getScheduledCronJobs } from "./cron-schedule.mjs";

const jobs = getScheduledCronJobs();
if (process.env.CRON_DISPATCH_DRY_RUN === "1") {
  console.log(JSON.stringify({ dryRun: true, jobs: jobs.map(({ name, method, path }) => ({ name, method, path })) }));
} else {
  const configuredUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const cronSecret = process.env.CRON_SECRET;
  if (!configuredUrl || !cronSecret) {
    throw new Error("APP_URL and CRON_SECRET are required for scheduled dispatch");
  }

  const appUrl = new URL(configuredUrl);
  if (!["http:", "https:"].includes(appUrl.protocol) || appUrl.username || appUrl.password) {
    throw new Error("APP_URL must be a credential-free HTTP or HTTPS URL");
  }
  const baseUrl = appUrl.toString().replace(/\/$/, "");
  let failed = false;

  for (const job of jobs) {
    const startedAt = Date.now();
    try {
      const response = await fetch(new URL(job.path, baseUrl), {
        method: job.method,
        headers: { authorization: `Bearer ${cronSecret}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(JSON.stringify({ job: job.name, status: response.status, durationMs: Date.now() - startedAt }));
    } catch (error) {
      failed = true;
      console.error(JSON.stringify({
        job: job.name,
        error: error instanceof Error ? error.message : "Request failed",
        durationMs: Date.now() - startedAt,
      }));
    }
  }

  if (failed) process.exitCode = 1;
}

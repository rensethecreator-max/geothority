const JOBS = {
  journeys: { method: "GET", path: "/api/cron/journeys" },
  autoScan: { method: "GET", path: "/api/cron/auto-scan" },
  gbpMonitor: { method: "GET", path: "/api/cron/gbp-monitor" },
  competitorMonitoring: { method: "GET", path: "/api/cron/competitor-monitoring" },
  expansionRefresh: { method: "POST", path: "/api/cron/expansion-refresh" },
};

function isWithinScheduleWindow(date, weekday, hour) {
  return date.getUTCDay() === weekday && date.getUTCHours() === hour && date.getUTCMinutes() < 10;
}

/** Return the work due on a 15-minute UTC Railway cron tick. */
export function getScheduledCronJobs(date = new Date()) {
  const jobs = [{ name: "journeys", ...JOBS.journeys }];

  if (isWithinScheduleWindow(date, 1, 3)) {
    jobs.push({ name: "expansion-refresh", ...JOBS.expansionRefresh });
  }
  if (isWithinScheduleWindow(date, 1, 6)) {
    jobs.push({ name: "gbp-monitor", ...JOBS.gbpMonitor });
  }
  if (isWithinScheduleWindow(date, 1, 9)) {
    jobs.push({ name: "auto-scan", ...JOBS.autoScan });
  }
  if (date.getUTCHours() === 7 && date.getUTCMinutes() < 10) {
    jobs.push({ name: "competitor-monitoring", ...JOBS.competitorMonitoring });
  }

  return jobs;
}

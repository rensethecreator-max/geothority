import assert from "node:assert/strict";
import test from "node:test";
import { getScheduledCronJobs } from "./cron-schedule.mjs";

const namesAt = (iso) => getScheduledCronJobs(new Date(iso)).map((job) => job.name);

test("runs journey processing on each quarter-hour tick", () => {
  assert.deepEqual(namesAt("2026-09-29T12:15:00.000Z"), ["journeys"]);
});

test("runs the weekly jobs in UTC schedule windows", () => {
  assert.deepEqual(namesAt("2026-09-28T03:05:00.000Z"), ["journeys", "expansion-refresh"]);
  assert.deepEqual(namesAt("2026-09-28T06:09:00.000Z"), ["journeys", "gbp-monitor"]);
  assert.deepEqual(namesAt("2026-09-28T09:00:00.000Z"), ["journeys", "auto-scan"]);
});

test("runs competitor monitoring daily and not outside its UTC window", () => {
  assert.deepEqual(namesAt("2026-09-30T07:09:00.000Z"), ["journeys", "competitor-monitoring"]);
  assert.deepEqual(namesAt("2026-09-30T07:10:00.000Z"), ["journeys"]);
});

test("does not run weekly jobs on the wrong day", () => {
  assert.deepEqual(namesAt("2026-09-29T03:00:00.000Z"), ["journeys"]);
});

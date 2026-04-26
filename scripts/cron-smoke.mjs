#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';

const normalizeUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/$/, '')
    : `https://${trimmed.replace(/^\/+/, '').replace(/\/$/, '')}`;
};

const appUrl =
  normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ||
  normalizeUrl(process.env.APP_URL) ||
  normalizeUrl(process.env.RAILWAY_PUBLIC_DOMAIN) ||
  normalizeUrl(process.env.RAILWAY_STATIC_URL) ||
  normalizeUrl(process.env.VERCEL_URL) ||
  'http://localhost:3010';

const cronSecret = process.env.CRON_SECRET;
const cronRoutes = {
  journeys: { method: 'GET', path: '/api/cron/journeys', schedule: 'every 15 minutes' },
  'auto-scan': { method: 'GET', path: '/api/cron/auto-scan', schedule: 'Mondays 09:00 UTC' },
  'gbp-monitor': { method: 'GET', path: '/api/cron/gbp-monitor', schedule: 'Mondays 06:00 UTC' },
  'competitor-monitoring': { method: 'GET', path: '/api/cron/competitor-monitoring', schedule: 'daily 07:00 UTC' },
  'expansion-refresh': { method: 'POST', path: '/api/cron/expansion-refresh', schedule: 'Mondays 03:00 UTC' },
  'ai-visibility': { method: 'POST', path: '/api/cron/ai-visibility', schedule: 'custom' },
  'citation-drift': { method: 'GET', path: '/api/cron/citation-drift', schedule: 'custom' },
};

const selection = process.argv.slice(2);
const targets = selection.length ? selection : Object.keys(cronRoutes);

const request = (url, method) =>
  new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.request(
      parsed,
      {
        method,
        timeout: 20000,
        headers: {
          ...(cronSecret ? { authorization: `Bearer ${cronSecret}` } : {}),
          'user-agent': 'geothority-cron-smoke/1.0',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      },
    );

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', (error) => resolve({ error: error.message }));
    req.end();
  });

for (const name of targets) {
  const route = cronRoutes[name];
  if (!route) {
    console.error(`Unknown cron route: ${name}`);
    process.exitCode = 1;
    continue;
  }

  const url = `${appUrl}${route.path}`;
  const result = await request(url, route.method);
  console.log(JSON.stringify({ name, ...route, url, ...result }, null, 2));
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const skipHttp = args.includes('--skip-http');
const envArg = args.find((arg) => arg.startsWith('--env='));
const baseArg = args.find((arg) => arg.startsWith('--base-url='));

const envPath = path.resolve(cwd, envArg ? envArg.slice('--env='.length) : '.env.local');
const envFromFile = loadEnvFile(envPath);
const mergedEnv = { ...envFromFile, ...process.env };
const baseUrl = normalizeBaseUrl(baseArg ? baseArg.slice('--base-url='.length) : mergedEnv.NEXT_PUBLIC_APP_URL);

const REQUIRED_GROUPS = [
  {
    name: 'Core runtime',
    severity: 'critical',
    envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    reason: 'Auth, DB, and server-side persistence all depend on Supabase being configured.',
  },
  {
    name: 'AI + local data',
    severity: 'critical',
    envVars: ['OPENAI_API_KEY', 'GOOGLE_MAPS_API_KEY'],
    reason: 'Core scan, AI recommendations, and location-aware flows are degraded or broken without these.',
  },
  {
    name: 'Listing network',
    severity: 'critical',
    envVars: ['FOURSQUARE_API_KEY'],
    alternative: ['FOURSQUARE_CLIENT_ID', 'FOURSQUARE_CLIENT_SECRET'],
    reason: 'Citation/distribution proof is much weaker without Foursquare credentials.',
  },
  {
    name: 'Payments',
    severity: 'recommended',
    envVars: [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_AUTHORITY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_GROWTH_ANNUAL_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_AUTHORITY_ANNUAL_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID',
    ],
    reason: 'Proof pass usually includes billing flow sanity.',
  },
  {
    name: 'Email + notifications',
    severity: 'recommended',
    envVars: ['RESEND_API_KEY', 'EMAIL_FROM_ADDRESS'],
    reason: 'Operator verification often checks alerts and lifecycle messages.',
  },
  {
    name: 'GBP server refresh',
    severity: 'recommended',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    reason: 'Without runtime Google creds, refresh/publish proof is limited after the first sign-in.',
  },
  {
    name: 'Scheduled jobs',
    severity: 'recommended',
    envVars: ['CRON_SECRET'],
    reason: 'Cron-protected endpoints need a shared secret for live verification.',
  },
];

const results = [];
for (const group of REQUIRED_GROUPS) {
  const directMissing = group.envVars.filter((key) => !hasValue(mergedEnv[key]));
  const alternativeSatisfied = group.alternative
    ? group.alternative.every((key) => hasValue(mergedEnv[key]))
    : false;
  const passed = directMissing.length === 0 || (!!group.alternative && directMissing.length === group.envVars.length && alternativeSatisfied);

  results.push({
    type: 'env-group',
    severity: group.severity,
    name: group.name,
    passed,
    missing: passed ? [] : directMissing,
    note: group.reason,
  });
}

const appUrlChecks = checkAppUrl(mergedEnv.NEXT_PUBLIC_APP_URL);
results.push(...appUrlChecks);

const authChecks = checkAuthConfiguration(mergedEnv);
results.push(...authChecks);

const optionalChecks = checkOptionalSignals(mergedEnv);
results.push(...optionalChecks);

const httpChecks = !skipHttp && baseUrl ? await runHttpChecks(baseUrl) : [];
results.push(...httpChecks);

const summary = summarize(results, envPath, baseUrl, skipHttp);
if (jsonMode) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  render(summary, results);
}

process.exit(summary.failedCritical > 0 ? 1 : 0);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeBaseUrl(value) {
  if (!hasValue(value)) return null;
  return value.replace(/\/$/, '');
}

function checkAppUrl(appUrl) {
  const checks = [];
  if (!hasValue(appUrl)) {
    checks.push({
      type: 'app-url',
      severity: 'critical',
      name: 'NEXT_PUBLIC_APP_URL present',
      passed: false,
      detail: 'Missing NEXT_PUBLIC_APP_URL.',
    });
    return checks;
  }

  try {
    const parsed = new URL(appUrl);
    checks.push({
      type: 'app-url',
      severity: 'info',
      name: 'NEXT_PUBLIC_APP_URL valid URL',
      passed: true,
      detail: parsed.toString(),
    });

    const localHosts = new Set(['localhost', '127.0.0.1']);
    if (!localHosts.has(parsed.hostname) && parsed.protocol !== 'https:') {
      checks.push({
        type: 'app-url',
        severity: 'critical',
        name: 'Production app URL uses HTTPS',
        passed: false,
        detail: `Expected https for non-local app URL, got ${parsed.protocol}`,
      });
    } else {
      checks.push({
        type: 'app-url',
        severity: 'info',
        name: 'App URL protocol matches environment',
        passed: true,
        detail: localHosts.has(parsed.hostname) ? 'Local HTTP accepted.' : 'HTTPS confirmed.',
      });
    }
  } catch (error) {
    checks.push({
      type: 'app-url',
      severity: 'critical',
      name: 'NEXT_PUBLIC_APP_URL valid URL',
      passed: false,
      detail: error.message,
    });
  }

  return checks;
}

function checkAuthConfiguration(env) {
  const checks = [];
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  if (hasValue(appUrl)) {
    const callback = `${appUrl.replace(/\/$/, '')}/api/auth/callback`;
    checks.push({
      type: 'auth',
      severity: 'info',
      name: 'Expected auth callback URL',
      passed: true,
      detail: callback,
    });
  }

  const googlePair = hasValue(env.GOOGLE_CLIENT_ID) && hasValue(env.GOOGLE_CLIENT_SECRET);
  checks.push({
    type: 'auth',
    severity: googlePair ? 'info' : 'recommended',
    name: 'Google runtime OAuth pair completeness',
    passed: googlePair,
    detail: googlePair
      ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET both set.'
      : 'Runtime Google creds missing or partial; local sign-in can still work via Supabase provider, but refresh/publish proof will be limited.',
  });

  return checks;
}

function checkOptionalSignals(env) {
  const checks = [];
  const cronSecret = env.CRON_SECRET || '';
  checks.push({
    type: 'ops',
    severity: cronSecret.length >= 24 ? 'info' : 'recommended',
    name: 'CRON_SECRET strength',
    passed: cronSecret.length >= 24,
    detail: cronSecret.length >= 24
      ? 'CRON_SECRET length looks reasonable.'
      : 'Use a longer CRON_SECRET (24+ chars recommended) before live cron verification.',
  });

  const fromAddress = env.EMAIL_FROM_ADDRESS || '';
  checks.push({
    type: 'ops',
    severity: fromAddress.includes('@') ? 'info' : 'recommended',
    name: 'EMAIL_FROM_ADDRESS formatting',
    passed: fromAddress.includes('@'),
    detail: fromAddress.includes('@') ? 'Email sender address present.' : 'EMAIL_FROM_ADDRESS missing or malformed.',
  });

  return checks;
}

async function runHttpChecks(urlBase) {
  const checks = [];
  for (const endpoint of ['/api/health', '/api/gbp/status']) {
    const url = `${urlBase}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'geothority-proof-readiness/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      const text = await response.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 300);
      }
      const passed = response.ok;
      checks.push({
        type: 'http',
        severity: endpoint === '/api/health' ? 'critical' : 'info',
        name: `HTTP ${endpoint}`,
        passed,
        detail: `${response.status} ${response.statusText}`,
        sample: sanitizeBody(body),
      });
    } catch (error) {
      checks.push({
        type: 'http',
        severity: endpoint === '/api/health' ? 'critical' : 'recommended',
        name: `HTTP ${endpoint}`,
        passed: false,
        detail: error.message,
      });
    }
  }
  return checks;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  return JSON.parse(JSON.stringify(body, (key, value) => {
    if (/(token|secret|key|authorization)/i.test(key)) return '[redacted]';
    return value;
  }));
}

function summarize(items, envFile, base, httpSkipped) {
  const failedCritical = items.filter((item) => item.severity === 'critical' && !item.passed).length;
  const failedRecommended = items.filter((item) => item.severity === 'recommended' && !item.passed).length;
  const passed = items.filter((item) => item.passed).length;
  return {
    envFile,
    baseUrl: base,
    httpSkipped,
    total: items.length,
    passed,
    failedCritical,
    failedRecommended,
    status: failedCritical > 0 ? 'needs-attention' : failedRecommended > 0 ? 'mostly-ready' : 'ready-for-proof-pass',
  };
}

function render(summary, items) {
  console.log('Geothority proof-readiness');
  console.log(`Status: ${summary.status}`);
  console.log(`Checks: ${summary.passed}/${summary.total} passing`);
  console.log(`Critical failures: ${summary.failedCritical}`);
  console.log(`Recommended follow-ups: ${summary.failedRecommended}`);
  console.log(`Env file: ${summary.envFile}${fs.existsSync(summary.envFile) ? '' : ' (not found)'}`);
  if (summary.baseUrl) console.log(`Base URL: ${summary.baseUrl}`);
  if (summary.httpSkipped) console.log('HTTP checks: skipped');
  console.log('');

  const groups = ['critical', 'recommended', 'info'];
  for (const severity of groups) {
    const subset = items.filter((item) => item.severity === severity);
    if (!subset.length) continue;
    console.log(`${severity.toUpperCase()}`);
    for (const item of subset) {
      const mark = item.passed ? '✓' : '✗';
      console.log(`${mark} ${item.name}`);
      if (item.detail) console.log(`  ${item.detail}`);
      if (item.missing?.length) console.log(`  Missing: ${item.missing.join(', ')}`);
      if (item.note) console.log(`  ${item.note}`);
      if (typeof item.sample !== 'undefined') console.log(`  Sample: ${JSON.stringify(item.sample)}`);
    }
    console.log('');
  }

  console.log('Suggested operator sequence:');
  console.log('1. Run this script against .env.local before starting the app.');
  console.log('2. Run npm run build:proof to catch compile/runtime drift.');
  console.log('3. Start the app and rerun with --base-url=http://localhost:3010 for live endpoint checks.');
  console.log('4. In production, rerun against the public URL right before the manual proof pass.');
}

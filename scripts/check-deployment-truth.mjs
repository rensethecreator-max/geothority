#!/usr/bin/env node
import dns from 'node:dns/promises';
import https from 'node:https';

const normalizeUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const envHosts = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN,
  process.env.RAILWAY_STATIC_URL,
  process.env.VERCEL_URL,
]
  .map(normalizeUrl)
  .filter(Boolean)
  .map((value) => new URL(value).host);

const hosts = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Array.from(new Set(['geothority.io', 'www.geothority.io', ...envHosts]));

function request(host, path, method = 'GET') {
  return new Promise((resolve) => {
    const req = https.request(
      {
        host,
        path,
        method,
        timeout: 15000,
        rejectUnauthorized: false,
        headers: { 'user-agent': 'geothority-deployment-truth-check/1.0' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let parsed = body;
          if (method !== 'HEAD') {
            try {
              parsed = JSON.parse(body);
            } catch {}
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            ...(method === 'HEAD' ? {} : { body: parsed }),
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (error) => {
      resolve({ error: error.message });
    });

    req.end();
  });
}

async function resolveHost(host) {
  const result = { host };

  try {
    result.aRecords = await dns.resolve4(host);
  } catch (error) {
    result.aRecords = { error: error.code || error.message };
  }

  try {
    result.cnameRecords = await dns.resolveCname(host);
  } catch (error) {
    result.cnameRecords = error.code === 'ENODATA' ? [] : { error: error.code || error.message };
  }

  result.root = await request(host, '/', 'HEAD');
  result.health = await request(host, '/api/health');

  return result;
}

const results = await Promise.all(hosts.map(resolveHost));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const projectRoot = path.resolve(__dirname, '../..');
const compiledModules = new Map();

// Execute the real route/helper code with only its external boundaries replaced.
// Each load gets fresh exports and dependencies, avoiding shared module mocks.
function loadTsModule(relativePath, dependencies = {}) {
  const filename = path.join(projectRoot, relativePath);
  let compiled = compiledModules.get(filename);
  if (!compiled) {
    compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    compiledModules.set(filename, compiled);
  }
  const requireFromModule = createRequire(filename);
  const module = { exports: {} };
  const injectedRequire = name => Object.hasOwn(dependencies, name)
    ? dependencies[name]
    : requireFromModule(name);
  new Function('require', 'module', 'exports', compiled)(injectedRequire, module, module.exports);
  return module.exports;
}

// Capture the actual table, operation, payload, and ownership filters used by
// the route. The fixture controls successes, database errors, and zero-row writes.
function createSupabaseMock(handleQuery, { session = null, userId = 'tenant-a' } = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
      getSession: async () => ({ data: { session }, error: null }),
    },
    from(table) {
      const query = { table, operation: 'select', filters: [] };
      const execute = async () => {
        calls.push(structuredClone(query));
        return handleQuery(query);
      };
      let builder;
      builder = new Proxy({}, {
        get(_, method) {
          if (method === 'then') return (resolve, reject) => execute().then(resolve, reject);
          if (method === 'single' || method === 'maybeSingle') return execute;
          if (['insert', 'upsert', 'update', 'delete'].includes(method)) {
            return (values, options) => {
              query.operation = method;
              query.values = values;
              query.options = options;
              return builder;
            };
          }
          if (['eq', 'in', 'gte', 'or'].includes(method)) {
            return (...args) => { query.filters.push([method, ...args]); return builder; };
          }
          if (method === 'select') {
            return columns => { query.columns = columns; return builder; };
          }
          if (method === 'limit' || method === 'order') return () => builder;
          throw new Error(`Unexpected database query method: ${String(method)}`);
        },
      });
      return builder;
    },
  };
}

function jsonRequest(pathname, body) {
  return new NextRequest(`https://staging.example.com${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

module.exports = { loadTsModule, createSupabaseMock, jsonRequest };
